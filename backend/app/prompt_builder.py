from typing import Dict, List

from .schemas import MessageModel

RECIPE_PROMPT_ECHO_PREFIX = "You are an expert professional chef."
MAX_CONTEXT_MESSAGES = 8

BASE_SYSTEM_PROMPT = (
    "You are Chef AI, a culinary assistant. Answer naturally and use the prior "
    "conversation when the user asks a follow-up question. If the user asks for a "
    "recipe, provide a clear, practical recipe response."
)

RECIPE_SYSTEM_PROMPT = (
    f"{BASE_SYSTEM_PROMPT}\n\n"
    "When generating a recipe, include these sections:\n"
    "1. Recipe Title\n"
    "2. Prep Time, Cook Time, Servings\n"
    "3. Ingredients with metric and imperial quantities\n"
    "4. Numbered step-by-step instructions\n"
    "5. Serving tips, storage, and variations"
)

FOLLOW_UP_HINTS = (
    "summarize",
    "summary",
    "shorter",
    "brief",
    "explain",
    "rewrite",
    "convert",
    "bullet",
    "simplify",
    "rephrase",
    "what does this mean",
    "nutrition",
    "macros",
    "calories",
    "short version",
)

RECIPE_HINTS = (
    "recipe",
    "ingredients",
    "cook",
    "cooking",
    "dish",
    "meal",
    "prepare",
    "make",
    "bake",
    "fry",
    "grill",
    "servings",
)

RECIPE_RESPONSE_TEMPLATE = (
    "Write exactly one practical recipe using the user's ingredients.\n"
    "If an ingredient is broad, such as 'protein source', 'salad', or 'condiments', make a sensible assumption and say so briefly.\n"
    "If the ingredients fit a sandwich, toast, wrap, snack, or street-food style recipe better than a full meal, choose that naturally.\n"
    "Do not output placeholder text, corrupted symbols, or repeated filler.\n\n"
    "Use this exact structure:\n"
    "Recipe Title: <title>\n"
    "Prep Time: <time>\n"
    "Cook Time: <time>\n"
    "Servings: <number>\n"
    "Ingredients:\n"
    "- item with quantity\n"
    "Instructions:\n"
    "1. step\n"
    "Serving Tips:\n"
    "- tip\n"
    "Variations:\n"
    "- variation"
)


def _should_skip_message(message: MessageModel) -> bool:
    content = (message.content or "").strip()
    if not content:
        return True
    if content.startswith("Error:"):
        return True
    if message.type == "ai" and content.startswith(RECIPE_PROMPT_ECHO_PREFIX):
        return True
    return False


def normalize_conversation(messages: List[MessageModel]) -> List[Dict[str, str]]:
    normalized: List[Dict[str, str]] = []

    for message in messages:
        if _should_skip_message(message):
            continue

        role = "assistant" if message.type == "ai" else "user"
        normalized.append({"role": role, "content": message.content.strip()})

    return normalized[-MAX_CONTEXT_MESSAGES:]


def should_enforce_recipe_format(user_input: str, normalized_messages: List[Dict[str, str]]) -> bool:
    text = (user_input or "").strip().lower()
    has_prior_assistant_reply = any(message["role"] == "assistant" for message in normalized_messages[:-1])
    looks_like_ingredient_list = "," in text or " and " in text
    ingredient_like_request = (
        looks_like_ingredient_list
        or "calorie" in text
        or "protein" in text
        or "under " in text
        or len(text.split()) >= 8
    )

    if not has_prior_assistant_reply:
        return True

    if looks_like_ingredient_list:
        return True

    if any(hint in text for hint in FOLLOW_UP_HINTS):
        return False

    if any(hint in text for hint in RECIPE_HINTS):
        return True

    return ingredient_like_request


def build_generation_context(user_input: str, messages: List[MessageModel]) -> Dict[str, object]:
    normalized_messages = normalize_conversation(messages)
    cleaned_input = (user_input or "").strip()

    if not normalized_messages or normalized_messages[-1]["role"] != "user" or normalized_messages[-1]["content"] != cleaned_input:
        normalized_messages.append({"role": "user", "content": cleaned_input})

    require_recipe = should_enforce_recipe_format(cleaned_input, normalized_messages)
    system_prompt = RECIPE_SYSTEM_PROMPT if require_recipe else BASE_SYSTEM_PROMPT
    chat_messages = [{"role": "system", "content": system_prompt}, *normalized_messages[-MAX_CONTEXT_MESSAGES:]]

    if require_recipe and chat_messages:
        chat_messages[-1] = {
            "role": "user",
            "content": (
                f"User request: {cleaned_input}\n\n"
                f"{RECIPE_RESPONSE_TEMPLATE}"
            ),
        }

    return {
        "chat_messages": chat_messages,
        "require_recipe": require_recipe,
    }
