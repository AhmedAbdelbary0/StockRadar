"""Pydantic schemas for AI worker request/response models."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Prediction Pipeline Models
# ---------------------------------------------------------------------------

class BatchData(BaseModel):
    """Single inventory batch from the backend."""
    batch_id: int
    product_id: int
    batch_number: str
    quantity_remaining: int
    cost_price: float
    expiry_date: date
    risk_level: str = "Low"
    sku: str
    product_name: str
    category: str


class SaleRecord(BaseModel):
    """Single sale log entry from the backend."""
    product_id: int
    quantity_sold: int
    sale_price: float
    sold_at: datetime


class PredictRequest(BaseModel):
    """Incoming payload for /predict-expiry."""
    batches: list[BatchData]
    sales: list[SaleRecord]


class BatchPrediction(BaseModel):
    """Risk prediction result for a single batch."""
    batch_id: int
    product_id: int
    sku: str
    product_name: str
    category: str
    batch_number: str
    quantity_remaining: int
    cost_price: float
    expiry_date: date
    days_until_expiry: int
    daily_velocity: float = Field(description="Average units sold per day over last 14 days")
    days_until_stockout: Optional[float] = Field(
        default=None,
        description="Estimated days until this batch is depleted at current velocity"
    )
    risk_level: str
    risk_reason: str


class PredictResponse(BaseModel):
    """Response from /predict-expiry."""
    predictions: list[BatchPrediction]
    summary: dict


# ---------------------------------------------------------------------------
# Mitigation Pipeline Models
# ---------------------------------------------------------------------------

class MitigateRequest(BaseModel):
    """Incoming payload for /mitigate-risk."""
    batch_id: int
    sku: str
    product_name: str
    category: str
    batch_number: str
    quantity_remaining: int
    cost_price: float
    expiry_date: date
    days_until_expiry: int
    daily_velocity: float
    risk_level: str


class MitigateResponse(BaseModel):
    """AI-generated mitigation strategy."""
    batch_id: int
    sku: str
    product_name: str
    strategy_type: str = Field(description="'promotional_bundle' or 'vendor_return'")
    markdown_content: str = Field(description="Formatted mitigation document in Markdown")
    policy_references: list[str] = Field(
        default_factory=list,
        description="Relevant policy excerpts used as context"
    )
