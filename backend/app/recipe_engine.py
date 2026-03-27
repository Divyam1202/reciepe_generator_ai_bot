import logging
from typing import Dict, List, Optional

import torch

from .model_loader import get_model
from .recipe_utils import strip_prompt_echo, validate_recipe_structure

logger = logging.getLogger(__name__)
MIN_GENERAL_RESPONSE_LENGTH = 5
CPU_RECIPE_MAX_NEW_TOKENS = 320
GPU_RECIPE_MAX_NEW_TOKENS = 900
CPU_CHAT_MAX_NEW_TOKENS = 160
GPU_CHAT_MAX_NEW_TOKENS = 240


def _render_fallback_chat_prompt(chat_messages: List[Dict[str, str]]) -> str:
    """Render chat messages in plain text format."""
    lines = []
    for message in chat_messages:
        role = message["role"].capitalize()
        lines.append(f"{role}: {message['content']}")
    lines.append("Assistant:")
    return "\n\n".join(lines)


def _tokenize_request(
    tokenizer, prompt: Optional[str], chat_messages: Optional[List[Dict[str, str]]]
) -> tuple:
    """
    Convert text and chat messages to tokenized format.
    
    Returns:
        tuple: (tokenized inputs, rendered prompt text)
    """
    rendered_prompt = prompt or ""

    if chat_messages:
        try:
            rendered_prompt = tokenizer.apply_chat_template(
                chat_messages,
                tokenize=False,
                add_generation_prompt=True,
            )
            return tokenizer(rendered_prompt, return_tensors="pt"), rendered_prompt
        except Exception as exc:
            logger.warning("Chat template failed, using fallback: %s", exc)
            rendered_prompt = _render_fallback_chat_prompt(chat_messages)

    inputs = tokenizer(rendered_prompt, return_tensors="pt")
    return inputs, rendered_prompt


def _is_valid_response(response_text: str, require_recipe: bool) -> bool:
    """Check if the generated response meets minimum quality standards."""
    if not response_text or not isinstance(response_text, str):
        return False

    stripped = response_text.strip()
    if not stripped:
        return False

    if require_recipe:
        # For recipes, require more content and structural validation
        return len(stripped) >= 150 and validate_recipe_structure(stripped)
    else:
        # For conversation, just require minimum length
        return len(stripped) >= MIN_GENERAL_RESPONSE_LENGTH


def _get_device_type(model) -> str:
    device = getattr(model, "device", None)
    if device is None:
        return "cpu"
    return getattr(device, "type", str(device))


def _get_generation_kwargs(tokenizer, require_recipe: bool, device_type: str) -> dict:
    """Choose generation settings tuned for response type and latency."""
    if require_recipe:
        max_new_tokens = (
            CPU_RECIPE_MAX_NEW_TOKENS if device_type == "cpu" else GPU_RECIPE_MAX_NEW_TOKENS
        )
    else:
        max_new_tokens = (
            CPU_CHAT_MAX_NEW_TOKENS if device_type == "cpu" else GPU_CHAT_MAX_NEW_TOKENS
        )

    return {
        "max_new_tokens": max_new_tokens,
        "temperature": 0.45 if require_recipe else 0.7,
        "top_p": 0.9,
        "do_sample": True,
        "pad_token_id": tokenizer.eos_token_id,
        "repetition_penalty": 1.15,
        "num_beams": 1,
        "no_repeat_ngram_size": 2,
        "use_cache": True,
    }


def generate_response(
    prompt: Optional[str] = None,
    chat_messages: Optional[List[Dict[str, str]]] = None,
    require_recipe: bool = True,
    max_retries: int = 2,
) -> str:
    """
    Generate either a recipe or conversational response.
    
    Args:
        prompt: Direct text prompt (ignored if chat_messages provided)
        chat_messages: List of role/content dicts for conversation context
        require_recipe: Whether to enforce recipe format
        max_retries: Number of retry attempts
        
    Returns:
        Generated response text
        
    Raises:
        RuntimeError: If generation fails after all retries
    """
    if not prompt and not chat_messages:
        raise ValueError("Either prompt or chat_messages must be provided")

    last_error = None
    response_text = ""

    try:
        model, tokenizer = get_model()
    except Exception as e:
        logger.error("Failed to load model before generation: %s", e)
        raise RuntimeError(f"Failed to load model for generation: {e}")

    if model is None or tokenizer is None:
        raise RuntimeError("Model or tokenizer failed to load")

    device_type = _get_device_type(model)
    effective_max_retries = 1 if device_type == "cpu" and require_recipe else max_retries

    # Configure padding token once after model load
    if tokenizer.pad_token_id is None:
        if tokenizer.eos_token_id is not None:
            tokenizer.pad_token_id = tokenizer.eos_token_id
        else:
            logger.warning("No pad token configured, using eos token")

    for attempt in range(effective_max_retries):
        try:
            # Tokenize input
            try:
                inputs, rendered_prompt = _tokenize_request(tokenizer, prompt, chat_messages)
            except Exception as e:
                logger.error("Tokenization failed on attempt %d: %s", attempt + 1, e)
                last_error = e
                continue

            # Move inputs to model device
            inputs = {key: value.to(model.device) for key, value in inputs.items()}

            try:
                with torch.inference_mode():
                    outputs = model.generate(
                        **inputs,
                        **_get_generation_kwargs(tokenizer, require_recipe, device_type),
                    )
            except torch.cuda.OutOfMemoryError:
                logger.error("GPU out of memory on attempt %d", attempt + 1)
                last_error = RuntimeError("GPU out of memory")
                if attempt < effective_max_retries - 1:
                    torch.cuda.empty_cache()
                    continue
                raise last_error
            except Exception as e:
                logger.error("Generation failed on attempt %d: %s", attempt + 1, e)
                last_error = e
                continue

            # Decode response
            try:
                prompt_token_count = inputs["input_ids"].shape[1]
                generated_tokens = outputs[0][prompt_token_count:]
                response_text = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()
                response_text = strip_prompt_echo(rendered_prompt, response_text)
            except Exception as e:
                logger.error("Decoding failed on attempt %d: %s", attempt + 1, e)
                last_error = e
                continue

            # Validate response
            if not _is_valid_response(response_text, require_recipe):
                if require_recipe and device_type == "cpu" and len(response_text) >= 120:
                    logger.warning(
                        "Accepting loosely structured CPU recipe response on attempt %d",
                        attempt + 1,
                    )
                    return response_text
                logger.warning(
                    "Response validation failed on attempt %d (require_recipe=%s, length=%d)",
                    attempt + 1,
                    require_recipe,
                    len(response_text),
                )
                last_error = ValueError(
                    f"Invalid response: {('Recipe missing required sections' if require_recipe else 'Insufficient content')}"
                )
                if attempt < effective_max_retries - 1:
                    continue
                raise last_error

            logger.info("Response generated successfully on attempt %d", attempt + 1)
            return response_text

        except Exception as e:
            logger.error("Attempt %d failed: %s", attempt + 1, e)
            last_error = e
            if attempt < effective_max_retries - 1:
                continue
            break

    # All retries exhausted
    error_msg = str(last_error) if last_error else "Unknown error"
    logger.error("Generation failed after %d attempts: %s", effective_max_retries, error_msg)
    raise RuntimeError(
        f"Failed to generate response after {effective_max_retries} attempts: {error_msg}"
    )


def generate_recipe(prompt: str, max_retries: int = 2) -> str:
    """Backward-compatible recipe generation wrapper."""
    return generate_response(prompt=prompt, require_recipe=True, max_retries=max_retries)
