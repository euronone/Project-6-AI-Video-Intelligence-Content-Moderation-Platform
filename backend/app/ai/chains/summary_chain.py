"""
C-03 Summary Chain

LangChain LCEL chain that generates a concise executive summary of a video
from its transcript and content analysis output.

Uses gpt-4o-mini (cheaper — summary does not require full vision capabilities).

Public API:
    result = await run_summary_chain(
        transcript="...",
        content_summary="...",
        duration_seconds=90.0,
        topics=["cooking", "pasta"],
    )
    result.executive_summary   # str
    result.key_moments         # list[str]
    result.content_rating      # "G" | "PG" | "PG-13" | "R" | "NC-17"
"""
from __future__ import annotations

import json
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.ai.prompts.summary_prompts import REPORT_SYSTEM
from app.config import settings

logger = structlog.get_logger(__name__)

_MODEL = "gpt-4o-mini"

# ── Output schema ─────────────────────────────────────────────────────────────

class SummaryOutput(BaseModel):
    executive_summary: str = Field(
        ..., description="2-4 sentence executive summary of the video content."
    )
    key_moments: list[str] = Field(
        default_factory=list,
        description="Up to 5 notable moments or highlights from the video.",
    )
    content_rating: str = Field(
        default="G",
        description="Estimated content rating: G, PG, PG-13, R, or NC-17.",
    )


# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM = """\
You are an AI video summarization assistant. Given a video transcript and content
analysis, produce a concise executive summary suitable for a content moderation platform.

Return a JSON object:
{
  "executive_summary": "<2-4 sentence summary>",
  "key_moments": ["<moment 1>", "<moment 2>"],
  "content_rating": "G" | "PG" | "PG-13" | "R" | "NC-17"
}
No markdown, no extra text.
"""

_USER_TEMPLATE = """\
Summarise this video.

Content summary: {content_summary}
Topics: {topics}
Duration: {duration}
Transcript excerpt: {transcript}

Return only the JSON object.
"""


# ── Chain factory ─────────────────────────────────────────────────────────────

def _build_llm(openai_client=None) -> ChatOpenAI:
    """Build (or wrap) a ChatOpenAI instance."""
    if openai_client is not None:
        # Allow tests to inject a custom client
        return ChatOpenAI(
            model=_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
            temperature=0.2,
        ).bind(client=openai_client)
    return ChatOpenAI(
        model=_MODEL,
        openai_api_key=settings.OPENAI_API_KEY,
        temperature=0.2,
    )


# ── Public API ────────────────────────────────────────────────────────────────

async def run_summary_chain(
    transcript: str = "",
    content_summary: str = "",
    duration_seconds: float | None = None,
    topics: list[str] | None = None,
    *,
    _llm: ChatOpenAI | None = None,  # injection point for tests
) -> SummaryOutput:
    """
    Generate an executive summary from video content data.

    Args:
        transcript:       Raw or cleaned transcript text.
        content_summary:  Short description from ContentAnalyzer.
        duration_seconds: Video duration in seconds (optional).
        topics:           Topic list from ContentAnalyzer (optional).
        _llm:             Override LLM for testing.

    Returns:
        SummaryOutput with executive_summary, key_moments, content_rating.
    """
    llm = _llm or _build_llm()

    duration_str = f"{duration_seconds:.0f}s" if duration_seconds else "unknown"
    topics_str = ", ".join(topics) if topics else "not specified"
    transcript_excerpt = transcript[:2000] if transcript else "(no transcript)"

    user_content = _USER_TEMPLATE.format(
        content_summary=content_summary or "(no summary available)",
        topics=topics_str,
        duration=duration_str,
        transcript=transcript_excerpt,
    )

    messages = [
        SystemMessage(content=_SYSTEM),
        HumanMessage(content=user_content),
    ]

    logger.info("summary_chain_start", transcript_len=len(transcript), topics=topics_str)

    try:
        response = await llm.ainvoke(messages)
        raw: str = response.content or "{}"
        data = json.loads(raw)
        result = SummaryOutput(
            executive_summary=data.get("executive_summary", "Summary unavailable."),
            key_moments=data.get("key_moments", []),
            content_rating=data.get("content_rating", "G"),
        )
        logger.info("summary_chain_done", rating=result.content_rating)
        return result
    except Exception as exc:
        logger.error("summary_chain_error", error=str(exc))
        return SummaryOutput(
            executive_summary=f"Summary generation failed: {exc}",
            key_moments=[],
            content_rating="G",
        )
