import re
import unicodedata

RECIPE_MARKERS = (
    "Now write the complete detailed recipe with ALL sections:",
    "Now write the complete detailed recipe with ALL sections",
    "Now write the recipe:",
)
RESPONSE_PREFIXES = (
    "Assistant:",
    "AI:",
    "Chef AI:",
)
SUSPICIOUS_SYMBOL_RUN = re.compile(r"[^\w\s.,:;!?()/%\-'\"]{8,}")
INLINE_SECTION_BREAK = re.compile(
    r"(?<!\n)(?=(Recipe Title|Prep Time|Cook Time|Servings|Ingredients|Instructions|Serving Tips|Variations)\s*:)",
    re.IGNORECASE,
)
INLINE_STEP_BREAK = re.compile(
    r"(?<!\n)(?=(Step\s*\d+[\.:]|Steps?\s*\d+\s*(?:-|to)\s*\d+))",
    re.IGNORECASE,
)
STEP_RANGE_PATTERN = re.compile(r"(?im)^\s*steps?\s+\d+\s*(?:-|to)\s*\d+\b")
NUMBERED_STEP_PATTERN = re.compile(r"(?im)^\s*(?:step\s*)?(\d+)[\.:]\s+\S")


def strip_prompt_echo(prompt: str, generated_text: str) -> str:
    """Return the recipe text without any echoed prompt scaffolding."""
    recipe = (generated_text or "").strip()
    prompt = (prompt or "").strip()

    if not recipe:
        return ""

    if prompt and recipe.startswith(prompt):
        recipe = recipe[len(prompt):].lstrip()

    for marker in RECIPE_MARKERS:
        if marker in recipe:
            recipe = recipe.rsplit(marker, maxsplit=1)[-1].strip()

    for prefix in RESPONSE_PREFIXES:
        if recipe.startswith(prefix):
            recipe = recipe[len(prefix):].strip()

    return recipe


def sanitize_generated_text(generated_text: str) -> str:
    """Remove obviously corrupted characters and trailing gibberish from model output."""
    text = (generated_text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return ""

    text = INLINE_SECTION_BREAK.sub("\n", text)
    text = INLINE_STEP_BREAK.sub("\n", text)

    cleaned_chars = []
    for char in text:
        category = unicodedata.category(char)
        if char in ("\n", "\t"):
            cleaned_chars.append(char)
            continue
        if category.startswith("C") and char != " ":
            continue
        if char == "\ufffd":
            continue
        cleaned_chars.append(char)

    text = "".join(cleaned_chars)
    text = SUSPICIOUS_SYMBOL_RUN.split(text, maxsplit=1)[0].strip()

    cleaned_lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            if cleaned_lines and cleaned_lines[-1] != "":
                cleaned_lines.append("")
            continue

        symbol_count = sum(
            1 for char in stripped if not (char.isalnum() or char.isspace() or char in ".,:;!?()/%-+*&'\"#")
        )
        if len(stripped) >= 6 and symbol_count / max(len(stripped), 1) > 0.35:
            break
        cleaned_lines.append(stripped)

    return "\n".join(cleaned_lines).strip()


def has_incomplete_recipe_markers(recipe: str) -> bool:
    """Detect placeholders or grouped-step output that should be rejected."""
    recipe = (recipe or "").strip()
    if not recipe:
        return True
    recipe_lower = recipe.lower()

    if STEP_RANGE_PATTERN.search(recipe):
        return True

    if re.search(r"(?im)^\s*optional\s*$", recipe):
        return True

    step_numbers = [int(match) for match in NUMBERED_STEP_PATTERN.findall(recipe)]
    if any(marker in recipe_lower for marker in ("instructions", "method", "directions")) and not step_numbers:
        return True
    if step_numbers and len(step_numbers) < 3:
        return True

    return False


def validate_recipe_structure(recipe: str) -> bool:
    """Validate that a generated recipe includes the main required sections."""
    recipe = (recipe or "").strip()
    if len(recipe) < 150:
        return False
    if has_incomplete_recipe_markers(recipe):
        return False

    recipe_lower = recipe.lower()
    non_empty_lines = [line.strip() for line in recipe.splitlines() if line.strip()]
    title = non_empty_lines[0] if non_empty_lines else ""

    has_title = bool(title) and not title.startswith(("-", "*", "#")) and len(title) > 3
    has_prep = bool("prep time" in recipe_lower or re.search(r"\bprep\b", recipe_lower))
    has_cook = bool("cook time" in recipe_lower or re.search(r"\bcook\b", recipe_lower))
    has_servings = bool("servings" in recipe_lower or "serves" in recipe_lower or "yield" in recipe_lower)
    has_ingredients_heading = "ingredients" in recipe_lower
    has_bulleted_ingredients = bool(re.search(r"(?m)^\s*[-*]\s+\S", recipe))
    has_numbered_ingredients = bool(re.search(r"(?m)^\s*\d+\.\s+.+\b(cup|tbsp|tsp|g|kg|ml|l|oz|lb)\b", recipe_lower))
    has_ingredients = has_ingredients_heading and (has_bulleted_ingredients or has_numbered_ingredients)
    step_matches = NUMBERED_STEP_PATTERN.findall(recipe)
    has_steps = len(step_matches) >= 3
    has_serving_tips = (
        "serving tips" in recipe_lower
        or "storage" in recipe_lower
        or "garnish" in recipe_lower
        or "serve" in recipe_lower
        or "variation" in recipe_lower
    )

    metadata_score = sum((has_prep, has_cook, has_servings, has_serving_tips))

    return has_title and has_ingredients and has_steps and metadata_score >= 2
