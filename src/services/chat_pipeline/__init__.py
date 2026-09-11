"""Chat pipeline package.

The package intentionally avoids importing the full pipeline at package import
time so lightweight submodules (for example prompts/types) do not eagerly pull
in graph, provider, and retrieval integrations.
"""

__all__ = ["run_chat_pipeline"]


def __getattr__(name: str):
    if name == "run_chat_pipeline":
        from src.services.chat_pipeline.pipeline import run_chat_pipeline

        return run_chat_pipeline
    raise AttributeError(name)
