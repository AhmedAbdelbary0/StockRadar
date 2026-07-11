"""
security.py — Internal request validation for the AI Worker.

Provides a FastAPI dependency that verifies requests originate from the
trusted Express orchestrator by checking a shared X-Internal-Secret header.
This prevents public traffic from directly invoking Groq API endpoints.
"""

import os

from fastapi import Header, HTTPException, status
from app.utils.logger import get_logger

logger = get_logger(__name__)

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "")


async def verify_internal_secret(
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
) -> None:
    """
    FastAPI dependency that validates the X-Internal-Secret header.

    Inject as a dependency on any router or individual route that should
    only be reachable from the Express backend orchestrator, not from
    public internet traffic.

    Raises:
        HTTPException 403: If the header is missing or does not match
                           the configured INTERNAL_SECRET.
    """
    if not INTERNAL_SECRET:
        # If no secret is configured, log a warning but allow the request
        # through — this preserves backward compatibility in local dev
        # without Docker where the secret may not be set.
        logger.warning(
            "INTERNAL_SECRET is not configured. "
            "Internal request validation is DISABLED. "
            "Set INTERNAL_SECRET in production to protect AI worker endpoints."
        )
        return

    if x_internal_secret != INTERNAL_SECRET:
        logger.warning(
            "Rejected request with invalid or missing X-Internal-Secret header."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid internal service credentials.",
        )
