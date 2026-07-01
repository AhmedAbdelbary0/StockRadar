"""Mitigation router — RAG-augmented LLM generation for high-risk batches."""

from fastapi import APIRouter, HTTPException

from app.models.schemas import MitigateRequest, MitigateResponse
from app.services.rag import query_policies
from app.services.llm import generate_mitigation
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Categories that must use vendor return instead of public discount
VENDOR_RETURN_CATEGORIES = {
    "prescription medications",
    "rx pharmaceuticals",
    "prescription",
    "rx",
    "controlled substances",
}


def _build_system_prompt(policy_chunks: list[str], strategy_type: str) -> str:
    """Assemble the system prompt with RAG-retrieved policy context."""
    context_block = "\n\n---\n\n".join(policy_chunks)
    return (
        "You are an expert retail inventory manager specializing in expiry risk mitigation. "
        "You help pharmacies and grocery stores minimize waste from expiring products.\n\n"
        "## Relevant Store Policy Guidelines\n\n"
        f"{context_block}\n\n"
        "## Instructions\n"
        f"Based on the store policies above, generate a {'formal vendor return request email' if strategy_type == 'vendor_return' else 'promotional discount bundle plan'} "
        "in clean, professional Markdown format. Be specific with numbers, dates, and policy references. "
        "Do not include any disclaimers about being an AI."
    )


def _build_user_prompt(req: MitigateRequest, strategy_type: str) -> str:
    """Build the user-facing prompt with batch details."""
    if strategy_type == "vendor_return":
        return (
            f"Draft a formal vendor return credit request email for the following batch:\n\n"
            f"- **Product**: {req.product_name} (SKU: {req.sku})\n"
            f"- **Category**: {req.category}\n"
            f"- **Batch Number**: {req.batch_number}\n"
            f"- **Remaining Quantity**: {req.quantity_remaining} units\n"
            f"- **Unit Cost**: ${req.cost_price:.2f}\n"
            f"- **Total Value at Risk**: ${req.quantity_remaining * req.cost_price:.2f}\n"
            f"- **Expiry Date**: {req.expiry_date}\n"
            f"- **Days Until Expiry**: {req.days_until_expiry}\n"
            f"- **Current Daily Sales Velocity**: {req.daily_velocity:.2f} units/day\n\n"
            "The email should reference the 60-day commercial return window policy, "
            "include the RMA request process, and be addressed to the distributor's returns department. "
            "Use a professional business email format."
        )
    else:
        return (
            f"Create an optimized promotional bundle or discount plan for the following near-expiry batch:\n\n"
            f"- **Product**: {req.product_name} (SKU: {req.sku})\n"
            f"- **Category**: {req.category}\n"
            f"- **Batch Number**: {req.batch_number}\n"
            f"- **Remaining Quantity**: {req.quantity_remaining} units\n"
            f"- **Unit Cost**: ${req.cost_price:.2f}\n"
            f"- **Expiry Date**: {req.expiry_date}\n"
            f"- **Days Until Expiry**: {req.days_until_expiry}\n"
            f"- **Current Daily Sales Velocity**: {req.daily_velocity:.2f} units/day\n\n"
            "The plan should include specific discount percentages, bundle composition suggestions, "
            "shelf placement recommendations, and signage text. Reference applicable store policies."
        )


@router.post("/mitigate-risk", response_model=MitigateResponse)
async def mitigate_risk(req: MitigateRequest) -> MitigateResponse:
    """
    For high-risk batches: query ChromaDB for relevant policies, then prompt
    the Groq-hosted LLM to generate a mitigation strategy document.
    """
    try:
        logger.info(
            "Mitigation request for batch %s (%s) — category: %s, days to expiry: %d",
            req.batch_number,
            req.sku,
            req.category,
            req.days_until_expiry,
        )

        # Determine strategy type based on category
        category_lower = req.category.lower().strip()
        is_rx = any(kw in category_lower for kw in VENDOR_RETURN_CATEGORIES)
        strategy_type = "vendor_return" if is_rx else "promotional_bundle"

        logger.info("Selected strategy: %s (is_rx=%s)", strategy_type, is_rx)

        # Query ChromaDB for relevant policy chunks
        query = (
            f"{req.category} expiry mitigation "
            f"{'vendor return prescription' if is_rx else 'discount promotion markdown'} "
            f"policy"
        )
        policy_chunks = query_policies(query, n_results=3)

        if not policy_chunks:
            logger.warning("No policy chunks retrieved — generating without policy context")
            policy_chunks = ["No specific store policies found. Use general best practices."]

        # Build prompts
        system_prompt = _build_system_prompt(policy_chunks, strategy_type)
        user_prompt = _build_user_prompt(req, strategy_type)

        # Call LLM
        markdown_content = generate_mitigation(
            system_context=system_prompt,
            user_prompt=user_prompt,
            temperature=0.7,
            max_tokens=2048,
        )

        logger.info("Mitigation generated: %d chars, strategy=%s", len(markdown_content), strategy_type)

        return MitigateResponse(
            batch_id=req.batch_id,
            sku=req.sku,
            product_name=req.product_name,
            strategy_type=strategy_type,
            markdown_content=markdown_content,
            policy_references=policy_chunks,
        )

    except RuntimeError as exc:
        logger.error("LLM generation failed: %s", str(exc))
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Mitigation pipeline failed: %s", str(exc), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Mitigation failed: {str(exc)}") from exc
