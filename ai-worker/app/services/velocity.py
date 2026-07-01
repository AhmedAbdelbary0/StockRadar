"""Deterministic sales velocity and expiry risk calculation engine."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from app.models.schemas import BatchData, SaleRecord, BatchPrediction
from app.utils.logger import get_logger

logger = get_logger(__name__)


def compute_daily_velocity(product_id: int, sales: list[SaleRecord]) -> float:
    """
    Calculate daily sales velocity for a product.
    Formula: Total Units Sold in Last 14 Days / 14
    """
    cutoff = date.today() - timedelta(days=14)
    total_sold = sum(
        s.quantity_sold
        for s in sales
        if s.product_id == product_id and s.sold_at.date() >= cutoff
    )
    velocity = total_sold / 14.0
    return round(velocity, 4)


def compute_days_until_expiry(expiry_date: date) -> int:
    """Calculate the number of days from today until the expiry date."""
    delta = expiry_date - date.today()
    return max(delta.days, 0)


def compute_days_until_stockout(quantity_remaining: int, daily_velocity: float) -> Optional[float]:
    """
    Days Until Out of Stock = Current Remaining / Daily Velocity.
    Returns None if velocity is zero (no recent sales).
    """
    if daily_velocity <= 0:
        return None
    return round(quantity_remaining / daily_velocity, 2)


def classify_risk(
    days_until_stockout: Optional[float],
    days_until_expiry: int,
) -> tuple[str, str]:
    """
    Determine risk level based on the velocity-expiry comparison.

    Rules:
    - If no sales velocity → 'High' (product is not moving)
    - If days_until_stockout > days_until_expiry → 'High' (will expire before sold)
    - If days_until_stockout > days_until_expiry * 0.7 → 'Medium'
    - Otherwise → 'Low'
    """
    if days_until_expiry <= 0:
        return "High", "Product has already expired or expires today"

    if days_until_stockout is None:
        return "High", "No recent sales activity — product is not moving and may expire unsold"

    if days_until_stockout > days_until_expiry:
        return "High", (
            f"At current velocity, stock lasts {days_until_stockout:.1f} days "
            f"but expires in {days_until_expiry} days — will expire before selling out"
        )

    if days_until_stockout > days_until_expiry * 0.7:
        return "Medium", (
            f"Stock depletion ({days_until_stockout:.1f} days) is close to expiry "
            f"({days_until_expiry} days) — monitor closely"
        )

    return "Low", (
        f"Stock will likely sell out ({days_until_stockout:.1f} days) "
        f"well before expiry ({days_until_expiry} days)"
    )


def analyze_batches(batches: list[BatchData], sales: list[SaleRecord]) -> list[BatchPrediction]:
    """
    Run the full prediction pipeline on all inventory batches.
    Returns annotated predictions with risk levels.
    """
    predictions: list[BatchPrediction] = []

    for batch in batches:
        velocity = compute_daily_velocity(batch.product_id, sales)
        days_exp = compute_days_until_expiry(batch.expiry_date)
        days_stock = compute_days_until_stockout(batch.quantity_remaining, velocity)
        risk_level, risk_reason = classify_risk(days_stock, days_exp)

        prediction = BatchPrediction(
            batch_id=batch.batch_id,
            product_id=batch.product_id,
            sku=batch.sku,
            product_name=batch.product_name,
            category=batch.category,
            batch_number=batch.batch_number,
            quantity_remaining=batch.quantity_remaining,
            cost_price=batch.cost_price,
            expiry_date=batch.expiry_date,
            days_until_expiry=days_exp,
            daily_velocity=velocity,
            days_until_stockout=days_stock,
            risk_level=risk_level,
            risk_reason=risk_reason,
        )
        predictions.append(prediction)

        logger.info(
            "Batch %s (%s): velocity=%.2f, stockout=%s days, expiry=%d days → %s",
            batch.batch_number,
            batch.sku,
            velocity,
            f"{days_stock:.1f}" if days_stock is not None else "N/A",
            days_exp,
            risk_level,
        )

    return predictions
