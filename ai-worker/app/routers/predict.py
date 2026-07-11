"""Predict expiry risk router — deterministic velocity-based analysis."""

from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import PredictRequest, PredictResponse
from app.services.velocity import analyze_batches
from app.utils.logger import get_logger
from app.utils.security import verify_internal_secret

logger = get_logger(__name__)

router = APIRouter(dependencies=[Depends(verify_internal_secret)])


@router.post("/predict-expiry", response_model=PredictResponse)
async def predict_expiry(payload: PredictRequest) -> PredictResponse:
    """
    Accept raw batches and sales logs, compute sales velocity,
    and return risk-annotated batch predictions.
    """
    try:
        logger.info(
            "Received prediction request: %d batches, %d sales records",
            len(payload.batches),
            len(payload.sales),
        )

        predictions = analyze_batches(payload.batches, payload.sales)

        # Build summary statistics
        risk_counts = {"High": 0, "Medium": 0, "Low": 0}
        for pred in predictions:
            risk_counts[pred.risk_level] = risk_counts.get(pred.risk_level, 0) + 1

        total_at_risk_value = sum(
            p.quantity_remaining * p.cost_price
            for p in predictions
            if p.risk_level == "High"
        )

        summary = {
            "total_batches": len(predictions),
            "risk_breakdown": risk_counts,
            "total_at_risk_value": round(total_at_risk_value, 2),
        }

        logger.info(
            "Prediction complete: %d High, %d Medium, %d Low — $%.2f at risk",
            risk_counts["High"],
            risk_counts["Medium"],
            risk_counts["Low"],
            total_at_risk_value,
        )

        return PredictResponse(predictions=predictions, summary=summary)

    except Exception as exc:
        logger.error("Prediction pipeline failed: %s", str(exc), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}") from exc
