"""Pagination helpers shared across list endpoints."""

import math
from dataclasses import dataclass


@dataclass
class Page:
    """Computed pagination metadata for a paginated list response."""
    total: int
    page: int
    per_page: int
    total_pages: int
    has_next: bool
    has_prev: bool


def paginate(total: int, page: int, per_page: int) -> Page:
    """Compute pagination metadata (total_pages / has_next / has_prev).

    Replicates the ``math.ceil(total / per_page) if total > 0 else 0``
    computation duplicated across the recipes / meal_plans / groceries list
    endpoints.
    """
    total_pages = math.ceil(total / per_page) if total > 0 else 0
    return Page(
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )
