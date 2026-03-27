import logging
import os
import threading
from pathlib import Path
from typing import Optional, Tuple

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

try:
    from peft import AutoPeftModelForCausalLM
except ImportError:  # pragma: no cover - compatibility fallback
    AutoPeftModelForCausalLM = None

logger = logging.getLogger(__name__)

_model: Optional[AutoModelForCausalLM] = None
_tokenizer: Optional[AutoTokenizer] = None
_model_error: Optional[Exception] = None
_load_lock = threading.Lock()
LOCAL_MODEL_DIR = Path(__file__).resolve().parents[2] / "models" / "finalmodel"
DEFAULT_FALLBACK_MODEL = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"


def _is_adapter_directory(model_path: Path) -> bool:
    return model_path.is_dir() and (model_path / "adapter_config.json").exists()


def _read_adapter_base_model(model_path: Path) -> Optional[str]:
    adapter_config = model_path / "adapter_config.json"
    if not adapter_config.exists():
        return None

    try:
        import json

        data = json.loads(adapter_config.read_text(encoding="utf-8"))
        base_model = data.get("base_model_name_or_path")
        if isinstance(base_model, str) and base_model.strip():
            return base_model.strip()
    except Exception as exc:  # pragma: no cover - best effort logging only
        logger.warning("Failed to inspect adapter config at %s: %s", adapter_config, exc)

    return None


def _resolve_model_source(device: str) -> str:
    explicit_source = os.getenv("RECIPE_MODEL_SOURCE") or os.getenv("MODEL_PATH")
    if explicit_source:
        return explicit_source

    if LOCAL_MODEL_DIR.exists():
        if device == "cuda":
            return str(LOCAL_MODEL_DIR)

        adapter_base_model = _read_adapter_base_model(LOCAL_MODEL_DIR)
        logger.warning(
            "Skipping local adapter at %s on CPU. Base model '%s' is too large for the default "
            "CPU startup path; falling back to '%s'. Set RECIPE_MODEL_SOURCE or MODEL_PATH "
            "to force a specific model.",
            LOCAL_MODEL_DIR,
            adapter_base_model or "unknown",
            os.getenv("RECIPE_MODEL_NAME", DEFAULT_FALLBACK_MODEL),
        )

    return os.getenv("RECIPE_MODEL_NAME", DEFAULT_FALLBACK_MODEL)


def _get_device() -> str:
    """Determine the best device to use for the model."""
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def _get_torch_dtype(device: str):
    """Choose a performant dtype for the available hardware."""
    if device == "cuda":
        if torch.cuda.is_bf16_supported():
            return torch.bfloat16
        return torch.float16
    return torch.float32


def _build_model_load_kwargs(device: str) -> dict:
    """Construct keyword arguments for model loading."""
    load_kwargs = {
        "dtype": _get_torch_dtype(device),
        "low_cpu_mem_usage": True,
    }

    if device == "cuda":
        load_kwargs["device_map"] = "auto"

    return load_kwargs


def load_model() -> Tuple[AutoModelForCausalLM, AutoTokenizer]:
    """Load model and tokenizer, with proper error handling and caching."""
    global _model, _tokenizer, _model_error

    # Return cached model if already loaded
    if _model is not None and _tokenizer is not None:
        return _model, _tokenizer

    # Raise error if previous load attempt failed
    if _model_error is not None:
        raise _model_error

    with _load_lock:
        if _model is not None and _tokenizer is not None:
            return _model, _tokenizer

        if _model_error is not None:
            raise _model_error

        device = _get_device()
        model_source = _resolve_model_source(device)
        load_kwargs = _build_model_load_kwargs(device)

        try:
            logger.info(
                "Loading model from: %s (device: %s, dtype: %s)",
                model_source,
                device,
                load_kwargs["dtype"],
            )

            try:
                _tokenizer = AutoTokenizer.from_pretrained(model_source)
                logger.info("Tokenizer loaded successfully")
            except Exception as e:
                logger.error("Failed to load tokenizer: %s", e)
                _model_error = RuntimeError(f"Tokenizer loading failed: {str(e)}")
                raise _model_error

            is_local_adapter = _is_adapter_directory(Path(model_source))

            try:
                if is_local_adapter:
                    if AutoPeftModelForCausalLM is None:
                        raise RuntimeError(
                            "The configured local adapter model requires PEFT library. "
                            "Install with: pip install peft"
                        )
                    logger.info("Loading PEFT adapter model...")
                    _model = AutoPeftModelForCausalLM.from_pretrained(
                        model_source,
                        **load_kwargs,
                    )
                else:
                    logger.info("Loading base causal LM model...")
                    _model = AutoModelForCausalLM.from_pretrained(
                        model_source,
                        **load_kwargs,
                    )
                _model.eval()
                logger.info("Model loaded successfully on device: %s", device)
            except Exception as e:
                logger.error("Failed to load model: %s", e)
                _model_error = RuntimeError(f"Model loading failed: {str(e)}")
                raise _model_error

            if _tokenizer.pad_token is None:
                if _tokenizer.eos_token is not None:
                    _tokenizer.pad_token = _tokenizer.eos_token
                else:
                    _tokenizer.add_special_tokens({"pad_token": "[PAD]"})
                    logger.info("Added pad token to tokenizer")

            logger.info("Model and tokenizer loaded successfully")
            return _model, _tokenizer

        except Exception as e:
            logger.error("Model loading failed: %s", e)
            _model_error = e
            raise


def get_model() -> Tuple[AutoModelForCausalLM, AutoTokenizer]:
    """Get the cached model and tokenizer, loading if necessary."""
    if _model is None or _tokenizer is None:
        return load_model()
    return _model, _tokenizer


def is_model_loaded() -> bool:
    """Check if model is currently loaded without attempting to load."""
    return _model is not None and _tokenizer is not None


def preload_model_in_background() -> None:
    """Start model preload without blocking application startup."""
    def _preload() -> None:
        try:
            load_model()
            logger.info("Background model preload completed")
        except Exception as exc:
            logger.warning("Background model preload failed: %s", exc)

    threading.Thread(target=_preload, name="recipe-model-preload", daemon=True).start()
