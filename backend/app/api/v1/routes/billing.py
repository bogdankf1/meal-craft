"""
Billing and subscription API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
import stripe
import logging

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, SubscriptionTier
from app.models.subscription import Tier
from app.models.billing import UserSubscription, PaymentHistory
from app.schemas.billing import (
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    CreatePortalSessionRequest,
    CreatePortalSessionResponse,
    CancelSubscriptionRequest,
    UpdateSubscriptionRequest,
    SubscriptionResponse,
    PaymentHistoryListResponse,
    PaymentHistoryResponse,
    SubscriptionStatusResponse,
    TierDetail,
    TierInfo,
)
from app.services.stripe_service import StripeService
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/tiers", response_model=list[TierDetail])
async def list_tiers(
    db: AsyncSession = Depends(get_db),
):
    """
    List all available tiers for pricing page.
    Public endpoint - no auth required.
    """
    result = await db.execute(
        select(Tier).order_by(Tier.price_monthly.nulls_first())
    )
    tiers = result.scalars().all()
    return [TierDetail.model_validate(tier) for tier in tiers]


@router.post("/create-checkout", response_model=CreateCheckoutSessionResponse)
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Stripe checkout session for subscribing to a tier.
    """
    # Create Stripe customer if doesn't exist
    if not current_user.stripe_customer_id:
        customer = await StripeService.create_customer(
            email=current_user.email,
            name=current_user.name,
            metadata={"user_id": str(current_user.id)}
        )
        current_user.stripe_customer_id = customer.id
        await db.commit()

    # Create checkout session
    session = await StripeService.create_checkout_session(
        customer_id=current_user.stripe_customer_id,
        price_id=request.price_id,
        success_url=request.success_url,
        cancel_url=request.cancel_url,
        metadata={"user_id": str(current_user.id)}
    )

    return CreateCheckoutSessionResponse(
        session_id=session.id,
        url=session.url
    )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Stripe webhook events.
    This endpoint is called by Stripe to notify us of events.
    """
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    event_type = event["type"]
    data = event["data"]["object"]

    try:
        if event_type == "checkout.session.completed":
            await StripeService.handle_checkout_completed(data, db)

        elif event_type == "customer.subscription.updated":
            await StripeService.handle_subscription_updated(data, db)

        elif event_type == "customer.subscription.deleted":
            # Handle subscription cancellation
            await StripeService.handle_subscription_updated(data, db)

        elif event_type == "invoice.paid":
            await StripeService.handle_invoice_paid(data, db)

        elif event_type == "invoice.payment_failed":
            await StripeService.handle_invoice_payment_failed(data, db)

        logger.info(f"Processed webhook event: {event_type}")

    except Exception as e:
        logger.exception(f"Webhook processing failed for {event_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

    return {"status": "success"}


@router.get("/subscription", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user's subscription status and tier information.
    """
    # Get user subscription
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    # Determine current tier info
    tier_prices = {
        SubscriptionTier.FREE: 0,
        SubscriptionTier.PLUS: 9.99,
        SubscriptionTier.PRO: 19.99,
    }
    current_tier_price = tier_prices.get(current_user.subscription_tier, 0)

    # Build available tiers list
    available_tiers = []
    can_upgrade = False
    can_downgrade = False

    tier_configs = [
        {
            "name": "PLUS",
            "display_name": "Plus",
            "price": 9.99,
            "stripe_price_id": settings.STRIPE_PRICE_PLUS,
        },
        {
            "name": "PRO",
            "display_name": "Pro",
            "price": 19.99,
            "stripe_price_id": settings.STRIPE_PRICE_PRO,
        },
    ]

    for tier in tier_configs:
        tier_info = TierInfo(
            id=tier["name"],
            name=tier["name"],
            display_name=tier["display_name"],
            price_monthly=tier["price"],
            stripe_price_id=tier["stripe_price_id"],
            action="current" if tier["price"] == current_tier_price else (
                "upgrade" if tier["price"] > current_tier_price else "downgrade"
            )
        )

        if tier["price"] > current_tier_price:
            can_upgrade = True
        elif tier["price"] < current_tier_price:
            can_downgrade = True

        available_tiers.append(tier_info)

    tier_display_names = {
        SubscriptionTier.FREE: "Free",
        SubscriptionTier.PLUS: "Plus",
        SubscriptionTier.PRO: "Pro",
    }

    return SubscriptionStatusResponse(
        has_subscription=subscription is not None,
        subscription=SubscriptionResponse.model_validate(subscription) if subscription else None,
        tier_name=current_user.subscription_tier.value if current_user.subscription_tier else None,
        tier_display_name=tier_display_names.get(current_user.subscription_tier),
        can_upgrade=can_upgrade,
        can_downgrade=can_downgrade,
        available_tiers=available_tiers,
    )


@router.post("/cancel-subscription")
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel the current user's subscription.
    """
    if not current_user.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription found")

    # Cancel subscription in Stripe
    await StripeService.cancel_subscription(
        subscription_id=current_user.stripe_subscription_id,
        at_period_end=request.at_period_end
    )

    # Update local record
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        subscription.cancel_at_period_end = request.at_period_end
        await db.commit()

    return {"status": "success", "message": "Subscription cancelled"}


@router.post("/update-subscription")
async def update_subscription(
    request: UpdateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update/change subscription plan (upgrade or downgrade).
    """
    if not current_user.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription found")

    # Update subscription in Stripe
    updated_subscription = await StripeService.update_subscription(
        subscription_id=current_user.stripe_subscription_id,
        new_price_id=request.new_price_id
    )

    return {
        "status": "success",
        "message": "Subscription updated",
        "subscription_id": updated_subscription.id
    }


@router.post("/create-portal-session", response_model=CreatePortalSessionResponse)
async def create_portal_session(
    request: CreatePortalSessionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Create a Stripe Customer Portal session for managing subscription.
    """
    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No Stripe customer found")

    session = await StripeService.create_customer_portal_session(
        customer_id=current_user.stripe_customer_id,
        return_url=request.return_url
    )

    return CreatePortalSessionResponse(url=session.url)


@router.get("/payment-history", response_model=PaymentHistoryListResponse)
async def get_payment_history(
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get payment history for the current user.
    """
    # Get total count
    result = await db.execute(
        select(PaymentHistory).where(PaymentHistory.user_id == current_user.id)
    )
    all_payments = result.scalars().all()
    total = len(all_payments)

    # Get paginated payments
    result = await db.execute(
        select(PaymentHistory)
        .where(PaymentHistory.user_id == current_user.id)
        .order_by(desc(PaymentHistory.created_at))
        .limit(limit)
        .offset(offset)
    )
    payments = result.scalars().all()

    return PaymentHistoryListResponse(
        payments=[PaymentHistoryResponse.model_validate(p) for p in payments],
        total=total
    )
