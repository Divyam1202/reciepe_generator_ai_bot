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


def _resolve_model_source() -> str:
    explicit_source = os.getenv("RECIPE_MODEL_SOURCE")
    if explicit_source:
        return explicit_source

    if LOCAL_MODEL_DIR.exists():
        return str(LOCAL_MODEL_DIR)

    return os.getenv("RECIPE_MODEL_NAME", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")


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

        model_source = _resolve_model_source()
        device = _get_device()
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

            is_local_adapter = (
                Path(model_source).is_dir()
                and (Path(model_source) / "adapter_config.json").exists()
            )

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
