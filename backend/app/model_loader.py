import logging
import os
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


def load_model() -> Tuple[AutoModelForCausalLM, AutoTokenizer]:
    """Load model and tokenizer, with proper error handling and caching."""
    global _model, _tokenizer, _model_error

    # Return cached model if already loaded
    if _model is not None and _tokenizer is not None:
        return _model, _tokenizer

    # Raise error if previous load attempt failed
    if _model_error is not None:
        raise _model_error

    model_source = _resolve_model_source()
    device = _get_device()
    
    try:
        logger.info("Loading model from: %s (device: %s)", model_source, device)

        # Load tokenizer
        try:
            _tokenizer = AutoTokenizer.from_pretrained(model_source)
            logger.info("Tokenizer loaded successfully")
        except Exception as e:
            logger.error("Failed to load tokenizer: %s", e)
            _model_error = RuntimeError(f"Tokenizer loading failed: {str(e)}")
            raise _model_error

        # Load model
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
                    torch_dtype=torch.float32,
                    device_map=device,
                    low_cpu_mem_usage=True,
                )
            else:
                logger.info("Loading base causal LM model...")
                _model = AutoModelForCausalLM.from_pretrained(
                    model_source,
                    torch_dtype=torch.float32,
                    device_map=device,
                    low_cpu_mem_usage=True,
                )
            logger.info("Model loaded successfully on device: %s", device)
        except Exception as e:
            logger.error("Failed to load model: %s", e)
            _model_error = RuntimeError(f"Model loading failed: {str(e)}")
            raise _model_error

        # Configure tokenizer padding
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
