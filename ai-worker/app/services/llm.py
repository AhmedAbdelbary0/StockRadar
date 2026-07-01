"""LLM service — calls Groq cloud API via OpenAI-compatible SDK with retry logic."""

from __future__ import annotations

import os
import time

from openai import OpenAI, RateLimitError, APIError, APITimeoutError

from app.utils.logger import get_logger

logger = get_logger(__name__)

# Module-level client (initialized lazily)
_llm_client: OpenAI | None = None

MAX_RETRIES = 3
INITIAL_BACKOFF_SECONDS = 1.0
BACKOFF_MULTIPLIER = 2.0


def _get_client() -> OpenAI:
    """Lazily initialize the OpenAI-compatible client for Groq."""
    global _llm_client
    if _llm_client is None:
        base_url = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
        api_key = os.getenv("LLM_API_KEY", "")
        if not api_key:
            logger.warning("LLM_API_KEY not set — LLM calls will fail")
        _llm_client = OpenAI(base_url=base_url, api_key=api_key)
        logger.info("Initialized LLM client targeting %s", base_url)
    return _llm_client


def generate_mitigation(
    system_context: str,
    user_prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    """
    Call the Groq-hosted DeepSeek model with retry and exponential backoff.

    Args:
        system_context: System message containing RAG-retrieved policy context.
        user_prompt: User message describing the high-risk batch and desired output.
        temperature: Sampling temperature.
        max_tokens: Maximum tokens in the response.

    Returns:
        The generated text content.

    Raises:
        RuntimeError: If all retries are exhausted.
    """
    client = _get_client()
    model = os.getenv("LLM_MODEL_NAME", "deepseek-r1-distill-llama-70b")

    messages = [
        {"role": "system", "content": system_context},
        {"role": "user", "content": user_prompt},
    ]

    backoff = INITIAL_BACKOFF_SECONDS

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info("LLM request attempt %d/%d (model=%s)", attempt, MAX_RETRIES, model)

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from LLM")

            # Strip <think>...</think> tags from reasoning models
            import re
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

            logger.info("LLM response received (%d chars)", len(content))
            return content

        except RateLimitError as exc:
            if attempt == MAX_RETRIES:
                logger.error("Rate limit exceeded after %d attempts: %s", MAX_RETRIES, str(exc))
                raise RuntimeError(
                    f"Groq API rate limit exceeded after {MAX_RETRIES} retries. "
                    "Please wait and try again."
                ) from exc

            logger.warning(
                "Rate limited (429) on attempt %d/%d — retrying in %.1fs",
                attempt, MAX_RETRIES, backoff,
            )
            time.sleep(backoff)
            backoff *= BACKOFF_MULTIPLIER

        except APITimeoutError as exc:
            if attempt == MAX_RETRIES:
                logger.error("API timeout after %d attempts: %s", MAX_RETRIES, str(exc))
                raise RuntimeError("Groq API timeout after all retries") from exc

            logger.warning("API timeout on attempt %d — retrying in %.1fs", attempt, backoff)
            time.sleep(backoff)
            backoff *= BACKOFF_MULTIPLIER

        except APIError as exc:
            logger.error("Groq API error: %s", str(exc))
            raise RuntimeError(f"Groq API error: {exc}") from exc

        except Exception as exc:
            logger.error("Unexpected LLM error: %s", str(exc))
            raise RuntimeError(f"LLM generation failed: {exc}") from exc

    raise RuntimeError("LLM generation failed — all retries exhausted")
