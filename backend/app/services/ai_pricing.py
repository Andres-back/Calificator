"""Pricing catalog for AI provider/model combinations.

Prices are in USD per 1,000 tokens (input and output).
These are default prices; they can be overridden via the admin panel
or environment variables.

Sources (as of 2026-07):
- OpenAI: https://openai.com/pricing
- Groq: https://groq.com/pricing
- Claude/Anthropic: https://anthropic.com/pricing
- OpenCode: depends on self-hosted inference cost
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

# ── Pricing entry ───────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ModelPrice:
    """Price per 1,000 tokens for a specific model on a specific provider.

    Attributes:
        provider: Provider identifier (e.g. 'groq', 'openai', 'open_code')
        model: Model name or wildcard pattern (e.g. 'llama-3.1-70b', '*')
        price_per_1k_input: Cost in USD per 1,000 input tokens
        price_per_1k_output: Cost in USD per 1,000 output tokens
        note: Optional human-readable note about this pricing entry
    """
    provider: str
    model: str
    price_per_1k_input: Decimal
    price_per_1k_output: Decimal
    note: str = ""


# ── Default pricing catalog ─────────────────────────────────────────────────────
# Ordered from most specific to most generic (last wildcard wins fallback).

DEFAULT_PRICING: list[ModelPrice] = [
    # ── Groq ──
    ModelPrice("groq", "llama-3.3-70b-versatile",     Decimal("0.00059"), Decimal("0.00079"), "Groq Llama 3.3 70B"),
    ModelPrice("groq", "llama-3.1-70b-versatile",     Decimal("0.00059"), Decimal("0.00079"), "Groq Llama 3.1 70B"),
    ModelPrice("groq", "llama-3.1-8b-instant",         Decimal("0.00005"), Decimal("0.00008"), "Groq Llama 3.1 8B"),
    ModelPrice("groq", "llama-guard-3-8b",             Decimal("0.00005"), Decimal("0.00008"), "Groq Llama Guard 3 8B"),
    ModelPrice("groq", "mixtral-8x7b-32768",           Decimal("0.00024"), Decimal("0.00024"), "Groq Mixtral 8x7B"),
    ModelPrice("groq", "gemma2-9b-it",                 Decimal("0.00008"), Decimal("0.00008"), "Groq Gemma 2 9B"),
    # Generic Groq fallback
    ModelPrice("groq", "*",                             Decimal("0.00024"), Decimal("0.00024"), "Groq (fallback default)"),

    # ── OpenAI ──
    ModelPrice("openai", "gpt-4o",                     Decimal("0.00250"), Decimal("0.01000"), "OpenAI GPT-4o"),
    ModelPrice("openai", "gpt-4o-mini",                Decimal("0.00015"), Decimal("0.00060"), "OpenAI GPT-4o Mini"),
    ModelPrice("openai", "gpt-4-turbo",                Decimal("0.01000"), Decimal("0.03000"), "OpenAI GPT-4 Turbo"),
    ModelPrice("openai", "gpt-3.5-turbo",              Decimal("0.00050"), Decimal("0.00150"), "OpenAI GPT-3.5 Turbo"),
    ModelPrice("openai", "text-embedding-3-small",     Decimal("0.00002"), Decimal("0.00002"), "OpenAI Embedding 3 Small"),
    ModelPrice("openai", "text-embedding-3-large",     Decimal("0.00013"), Decimal("0.00013"), "OpenAI Embedding 3 Large"),
    ModelPrice("openai", "dall-e-3",                   Decimal("0.04000"), Decimal("0.04000"), "OpenAI DALL-E 3 (per image)"),
    ModelPrice("openai", "dall-e-2",                   Decimal("0.02000"), Decimal("0.02000"), "OpenAI DALL-E 2 (per image)"),
    # Generic OpenAI fallback
    ModelPrice("openai", "*",                           Decimal("0.00250"), Decimal("0.01000"), "OpenAI (fallback default)"),

    # ── Anthropic / Claude ──
    ModelPrice("claude", "claude-sonnet-4",            Decimal("0.00300"), Decimal("0.01500"), "Claude Sonnet 4"),
    ModelPrice("claude", "claude-3.5-sonnet",          Decimal("0.00300"), Decimal("0.01500"), "Claude 3.5 Sonnet"),
    ModelPrice("claude", "claude-3-haiku",             Decimal("0.00025"), Decimal("0.00125"), "Claude 3 Haiku"),
    ModelPrice("claude", "claude-3-opus",              Decimal("0.01500"), Decimal("0.07500"), "Claude 3 Opus"),
    ModelPrice("claude", "*",                           Decimal("0.00300"), Decimal("0.01500"), "Claude (fallback default)"),

    # ── OpenCode (self-hosted, assumes local inference cost approximation) ──
    # These are rough estimates; administrators should update them.
    ModelPrice("open_code", "deepseek-v4-flash",       Decimal("0.00050"), Decimal("0.00100"), "OpenCode DeepSeek V4 Flash"),
    ModelPrice("open_code", "deepseek-v3",             Decimal("0.00100"), Decimal("0.00200"), "OpenCode DeepSeek V3"),
    ModelPrice("open_code", "qwen-2.5-72b",            Decimal("0.00100"), Decimal("0.00200"), "OpenCode Qwen 2.5 72B"),
    ModelPrice("open_code", "qwen-2.5-32b",            Decimal("0.00050"), Decimal("0.00100"), "OpenCode Qwen 2.5 32B"),
    ModelPrice("open_code", "qwen-2.5-14b",            Decimal("0.00025"), Decimal("0.00050"), "OpenCode Qwen 2.5 14B"),
    ModelPrice("open_code", "qwen-2.5-7b",             Decimal("0.00010"), Decimal("0.00020"), "OpenCode Qwen 2.5 7B"),
    # Generic OpenCode fallback
    ModelPrice("open_code", "*",                        Decimal("0.00050"), Decimal("0.00100"), "OpenCode (fallback default)"),

    # ── Ollama (local, effectively free) ──
    ModelPrice("ollama", "*",                           Decimal("0.00001"), Decimal("0.00001"), "Ollama (local, minimal cost)"),

    # ── Cloudflare Images ──
    ModelPrice("cloudflare_image", "*",                 Decimal("0.00100"), Decimal("0.00100"), "Cloudflare Images"),
    ModelPrice("openai_image", "*",                     Decimal("0.04000"), Decimal("0.04000"), "OpenAI Images"),

    # ── Template fallback (no cost) ──
    ModelPrice("template", "*",                         Decimal("0"), Decimal("0"), "Template fallback (no cost)"),

    # ── Global fallback (unknown provider/model) ──
    ModelPrice("*", "*",                                Decimal("0.00100"), Decimal("0.00200"), "Unknown provider (generic fallback)"),
]


def _parse_decimal(value: Any) -> Decimal:
    """Safely convert a value to Decimal."""
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal("0")


async def get_pricing_catalog(
    db: Any | None = None,
) -> list[ModelPrice]:
    """Return the effective pricing catalog.

    Currently returns the default built-in catalog. In a future iteration
    this could be extended to load overrides from a database table or env vars.

    Returns:
        List of ModelPrice entries, most-specific-first.
    """
    # TODO(db-pricing): load overrides from ai_pricing_catalog table when available
    return list(DEFAULT_PRICING)


async def estimate_cost(
    provider: str | None,
    model: str | None,
    input_tokens: int | None,
    output_tokens: int | None,
    db: Any | None = None,
) -> Decimal | None:
    """Estimate the cost of an AI call based on token counts and pricing.

    Args:
        provider: Provider identifier (e.g. 'groq', 'openai')
        model: Model name (e.g. 'llama-3.1-70b-versatile')
        input_tokens: Number of input (prompt) tokens
        output_tokens: Number of output (completion) tokens
        db: Optional database session for loading overrides

    Returns:
        Estimated cost in USD as Decimal, or None if neither input nor
        output tokens are available.
    """
    if not input_tokens and not output_tokens:
        return None

    provider = (provider or "").lower().strip()
    model = (model or "").lower().strip()

    catalog = await get_pricing_catalog(db)

    in_tok = _parse_decimal(input_tokens)
    out_tok = _parse_decimal(output_tokens)

    # Find best match: first exact provider+model, then provider wildcard, then global wildcard
    best: ModelPrice | None = None

    for entry in catalog:
        entry_provider = entry.provider.lower()
        entry_model = entry.model.lower()

        # Exact match
        if entry_provider == provider and entry_model == model:
            best = entry
            break

    if best is None:
        # Provider wildcard match
        for entry in catalog:
            entry_provider = entry.provider.lower()
            entry_model = entry.model.lower()
            if entry_provider == provider and entry_model == "*":
                best = entry
                break

    if best is None:
        # Global fallback
        for entry in catalog:
            entry_provider = entry.provider.lower()
            entry_model = entry.model.lower()
            if entry_provider == "*" and entry_model == "*":
                best = entry
                break

    if best is None:
        return None

    cost = (in_tok / Decimal("1000")) * best.price_per_1k_input + \
           (out_tok / Decimal("1000")) * best.price_per_1k_output

    # Round to 8 decimal places (≈ $0.00000001 precision)
    return cost.quantize(Decimal("0.00000001"))
