"""
LangGraph StateGraph — Video Analysis Pipeline

Node execution order:
  orchestrator
      │
      ├── content_analyzer  ─┐
      ├── scene_classifier   ├─► safety_checker ──► report_generator
      └── metadata_extractor ┘

Content analyzer, scene classifier, and metadata extractor run in parallel
(LangGraph fan-out). Safety checker waits for all three, then report
generator runs last.
"""

from __future__ import annotations

from typing import Any

import structlog
from langgraph.graph import END, StateGraph

from app.ai.agents.content_analyzer import ContentAnalyzerAgent
from app.ai.agents.metadata_extractor import MetadataExtractorAgent
from app.ai.agents.orchestrator import OrchestratorAgent
from app.ai.agents.report_generator import ReportGeneratorAgent
from app.ai.agents.safety_checker import SafetyCheckerAgent
from app.ai.agents.scene_classifier import SceneClassifierAgent
from app.ai.schemas import ModerationReport
from app.ai.state import VideoAnalysisState

logger = structlog.get_logger(__name__)

# ── Instantiate agents (singletons — shared across requests) ─────────────────

_orchestrator = OrchestratorAgent()
_content_analyzer = ContentAnalyzerAgent()
_scene_classifier = SceneClassifierAgent()
_metadata_extractor = MetadataExtractorAgent()
_safety_checker = SafetyCheckerAgent()
_report_generator = ReportGeneratorAgent()


# ── Node wrappers (LangGraph expects plain async functions) ───────────────────


async def orchestrator_node(state: VideoAnalysisState) -> dict[str, Any]:
    return await _orchestrator.run(dict(state))


async def content_analyzer_node(state: VideoAnalysisState) -> dict[str, Any]:
    return await _content_analyzer.run(dict(state))


async def scene_classifier_node(state: VideoAnalysisState) -> dict[str, Any]:
    return await _scene_classifier.run(dict(state))


async def metadata_extractor_node(state: VideoAnalysisState) -> dict[str, Any]:
    return await _metadata_extractor.run(dict(state))


async def safety_checker_node(state: VideoAnalysisState) -> dict[str, Any]:
    return await _safety_checker.run(dict(state))


async def report_generator_node(state: VideoAnalysisState) -> dict[str, Any]:
    return await _report_generator.run(dict(state))


# ── Build the graph ───────────────────────────────────────────────────────────


def _build_graph() -> Any:
    graph = StateGraph(VideoAnalysisState)

    # Add nodes
    graph.add_node("orchestrator", orchestrator_node)
    graph.add_node("content_analyzer", content_analyzer_node)
    graph.add_node("scene_classifier", scene_classifier_node)
    graph.add_node("metadata_extractor", metadata_extractor_node)
    graph.add_node("safety_checker", safety_checker_node)
    graph.add_node("report_generator", report_generator_node)

    # Entry point
    graph.set_entry_point("orchestrator")

    # Fan-out: orchestrator → parallel specialists
    graph.add_edge("orchestrator", "content_analyzer")
    graph.add_edge("orchestrator", "scene_classifier")
    graph.add_edge("orchestrator", "metadata_extractor")

    # Fan-in: all three → safety_checker
    graph.add_edge("content_analyzer", "safety_checker")
    graph.add_edge("scene_classifier", "safety_checker")
    graph.add_edge("metadata_extractor", "safety_checker")

    # Final step
    graph.add_edge("safety_checker", "report_generator")
    graph.add_edge("report_generator", END)

    return graph.compile()


_compiled_graph = _build_graph()


# ── Public API ────────────────────────────────────────────────────────────────


async def run_video_analysis(
    video_id: str,
    video_url: str,
    policy_rules: list[dict[str, Any]] | None = None,
    *,
    frames: list[str] | None = None,
    transcript: str | None = None,
) -> ModerationReport:
    """
    Run the full video analysis pipeline and return a ModerationReport.

    Args:
        video_id:     UUID string of the video being analysed.
        video_url:    Presigned S3 URL (or local path) to the video file.
        policy_rules: Active policy rules to enforce. Defaults to [].
        frames:       Pre-extracted base64 frames (optional; skips FFmpeg step).
        transcript:   Pre-generated transcript text (optional; skips Whisper step).

    Returns:
        ModerationReport — the final structured moderation decision.
    """
    initial_state: VideoAnalysisState = {
        "video_id": video_id,
        "video_url": video_url,
        "policy_rules": policy_rules or [],
        "errors": [],
        "completed_agents": [],
    }

    if frames is not None:
        initial_state["frames"] = frames
        initial_state["frame_timestamps"] = [float(i * 5) for i in range(len(frames))]

    if transcript is not None:
        initial_state["transcript"] = transcript

    logger.info("pipeline_start", video_id=video_id)

    try:
        final_state: VideoAnalysisState = await _compiled_graph.ainvoke(initial_state)
    except Exception as exc:
        logger.error("pipeline_error", video_id=video_id, error=str(exc))
        raise

    report_dict = final_state.get("moderation_report") or {}
    if not report_dict:
        # Graph completed but no report was generated — shouldn't happen
        from app.ai.schemas import ModerationDecision, ViolationSeverity

        return ModerationReport(
            video_id=video_id,
            decision=ModerationDecision.NEEDS_REVIEW,
            overall_severity=ViolationSeverity.LOW,
            confidence=0.0,
            content_summary="Pipeline completed without generating a report.",
            processing_errors=list(final_state.get("errors") or []),
            agents_completed=list(final_state.get("completed_agents") or []),
        )

    logger.info(
        "pipeline_done",
        video_id=video_id,
        decision=report_dict.get("decision"),
        agents=final_state.get("completed_agents"),
    )

    return ModerationReport.model_validate(report_dict)
