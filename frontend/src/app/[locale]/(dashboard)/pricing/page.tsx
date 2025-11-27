"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, X, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PaymentMethodModal,
  type PaymentMethod,
} from "@/components/pricing/payment-method-modal";
import {
  useGetTiersQuery,
  useCreateCheckoutSessionMutation,
  useGetSubscriptionStatusQuery,
} from "@/lib/api/billing-api";

interface TierFeature {
  name: string;
  included: boolean;
}

export default function PricingPage() {
  const t = useTranslations("pricing");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { data: tiers, isLoading: tiersLoading } = useGetTiersQuery();
  const { data: subscriptionStatus } = useGetSubscriptionStatusQuery();
  const [createCheckoutSession, { isLoading }] = useCreateCheckoutSessionMutation();

  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<{
    id: string;
    name: string;
    display_name: string;
    price_monthly: number;
    stripe_price_id: string;
  } | null>(null);

  const currentTierName = subscriptionStatus?.tier_name;

  // Stripe price ID mapping from environment
  const stripePriceIdMap: Record<string, string> = {
    PLUS: process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS || "",
    PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "",
  };

  // Feature definitions for each tier
  const tierFeaturesMap: Record<string, TierFeature[]> = {
    FREE: [
      { name: t("features.free.mealPlanning"), included: true },
      { name: t("features.free.basicRecipes"), included: true },
      { name: t("features.free.shoppingList"), included: true },
      { name: t("features.free.pantryTracking"), included: false },
      { name: t("features.free.nutritionTracking"), included: false },
      { name: t("features.free.aiSuggestions"), included: false },
      { name: t("features.free.prioritySupport"), included: false },
    ],
    PLUS: [
      { name: t("features.plus.mealPlanning"), included: true },
      { name: t("features.plus.unlimitedRecipes"), included: true },
      { name: t("features.plus.shoppingList"), included: true },
      { name: t("features.plus.pantryTracking"), included: true },
      { name: t("features.plus.nutritionTracking"), included: true },
      { name: t("features.plus.aiSuggestions"), included: false },
      { name: t("features.plus.prioritySupport"), included: false },
    ],
    PRO: [
      { name: t("features.pro.mealPlanning"), included: true },
      { name: t("features.pro.unlimitedRecipes"), included: true },
      { name: t("features.pro.shoppingList"), included: true },
      { name: t("features.pro.pantryTracking"), included: true },
      { name: t("features.pro.nutritionTracking"), included: true },
      { name: t("features.pro.aiSuggestions"), included: true },
      { name: t("features.pro.prioritySupport"), included: true },
    ],
  };

  // Default tiers if API doesn't return them
  const defaultTiers = [
    {
      id: "free",
      name: "FREE",
      display_name: "Free",
      price_monthly: 0,
      stripe_price_id: "",
    },
    {
      id: "plus",
      name: "PLUS",
      display_name: "Plus",
      price_monthly: 9.99,
      stripe_price_id: stripePriceIdMap.PLUS,
    },
    {
      id: "pro",
      name: "PRO",
      display_name: "Pro",
      price_monthly: 19.99,
      stripe_price_id: stripePriceIdMap.PRO,
    },
  ];

  const displayTiers = tiers && tiers.length > 0 ? tiers.map(tier => ({
    ...tier,
    stripe_price_id: stripePriceIdMap[tier.name] || "",
  })) : defaultTiers;

  const handleSubscribe = (tier: {
    id: string;
    name: string;
    display_name: string;
    price_monthly: number | null;
    stripe_price_id: string;
  }) => {
    if (!tier) return;

    const priceMonthly = tier.price_monthly ?? 0;

    // Free tier - just close
    if (priceMonthly === 0) {
      router.push("/dashboard");
      return;
    }

    // Show payment method modal
    setSelectedTier({
      ...tier,
      price_monthly: priceMonthly,
    });
    setShowPaymentModal(true);
  };

  const handlePaymentMethodConfirm = async (paymentMethod: PaymentMethod) => {
    if (!selectedTier || !selectedTier.stripe_price_id) return;

    try {
      setLoadingTier(selectedTier.name);

      if (paymentMethod === "stripe") {
        const result = await createCheckoutSession({
          price_id: selectedTier.stripe_price_id,
          success_url: `${window.location.origin}/dashboard?subscription=success`,
          cancel_url: `${window.location.origin}/pricing?subscription=cancelled`,
        }).unwrap();

        // Redirect to Stripe checkout
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      setShowPaymentModal(false);
      setLoadingTier(null);
    }
  };

  const handlePaymentModalClose = () => {
    if (!isLoading) {
      setShowPaymentModal(false);
      setSelectedTier(null);
      setLoadingTier(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          {t("page.title")}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t("page.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 max-w-6xl mx-auto">
        {tiersLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="flex flex-col">
              <CardHeader className="pb-4">
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-12 w-40" />
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-11 w-full" />
              </CardFooter>
            </Card>
          ))
        ) : (
          displayTiers.map((tier) => {
            const isCurrentTier = tier.name === currentTierName;
            const isRecommended = tier.name === "PLUS";
            const features = tierFeaturesMap[tier.name] || [];

            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col ${
                  isRecommended
                    ? "border-primary shadow-lg scale-105 z-10"
                    : "border-border"
                }`}
              >
                {isRecommended && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg rounded-tr-lg flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {t("page.recommended")}
                  </div>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">{tier.display_name}</CardTitle>
                  <CardDescription className="mt-2">
                    {t(`descriptions.${tier.name.toLowerCase()}`)}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold tracking-tight text-foreground">
                      ${tier.price_monthly}
                    </span>
                    <span className="text-muted-foreground">
                      {t("page.perMonth")}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        <span
                          className={
                            feature.included
                              ? "text-foreground"
                              : "text-muted-foreground line-through"
                          }
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isRecommended ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleSubscribe(tier)}
                    disabled={isCurrentTier || (isLoading && loadingTier === tier.name)}
                  >
                    {isCurrentTier
                      ? t("buttons.currentPlan")
                      : isLoading && loadingTier === tier.name
                      ? tCommon("loading")
                      : tier.price_monthly === 0
                      ? t("buttons.getStarted")
                      : t("buttons.subscribe")}
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      <div className="text-center mt-12 text-muted-foreground">
        <p>{t("page.footer")}</p>
      </div>

      {/* Payment Method Modal */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={handlePaymentModalClose}
        onConfirm={handlePaymentMethodConfirm}
        tierName={selectedTier?.display_name || ""}
        tierPrice={selectedTier?.price_monthly || 0}
        isLoading={isLoading}
      />
    </div>
  );
}
