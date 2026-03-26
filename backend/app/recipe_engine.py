from .model_loader import get_model
import torch
import logging

logger = logging.getLogger(__name__)

# Required sections for a valid recipe
REQUIRED_SECTIONS = [
    "title",
    "prep",
    "cook",
    "servings",
    "ingredients",
    "instructions",
    "serving"
]


def validate_recipe_structure(recipe: str) -> bool:
    """
    Validate that the recipe contains all required sections.
    
    Args:
        recipe: The generated recipe text
        
    Returns:
        True if recipe has all sections, False otherwise
    """
    recipe_lower = recipe.lower()
    
    # Check for required information
    has_title = len(recipe) > 10 and recipe[0] not in ['-', '*', '#', '\n']  # First non-empty line is likely title
    has_prep_cook = "prep" in recipe_lower and "cook" in recipe_lower
    has_servings = "serving" in recipe_lower and ("servings" in recipe_lower or "serves" in recipe_lower)
    has_ingredients = ("ingredient" in recipe_lower) and (":" in recipe or "-" in recipe)
    has_instructions = ("instruction" in recipe_lower or "step" in recipe_lower) and ("1." in recipe or "- " in recipe)
    has_tips = "serving" in recipe_lower or "tip" in recipe_lower or "serve" in recipe_lower
    
    return (has_title and has_prep_cook and has_servings and 
            has_ingredients and has_instructions and has_tips)


def generate_recipe(prompt: str, max_retries: int = 2):
    """
    Generate a recipe from the provided prompt.
    
    Args:
        prompt: The prompt describing the recipe request
        max_retries: Number of retry attempts on failure
        
    Returns:
        Generated recipe string with all required sections
        
    Raises:
        Exception: If model fails to generate valid recipe after retries
    """
    
    for attempt in range(max_retries):
        try:
            model, tokenizer = get_model()

            if model is None or tokenizer is None:
                raise RuntimeError("Model or tokenizer failed to load")

            inputs = tokenizer(prompt, return_tensors="pt")

            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=2500,
                    temperature=0.4,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id,
                    repetition_penalty=1.2,
                    length_penalty=0.8,
                    num_beams=1,
                    no_repeat_ngram_size=2,
                    early_stopping=True
                )

            recipe = tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Clean minimal - only remove the prompt if it appears at the start
            # Split by "Now write the recipe" to get just the recipe part
            if "Now write the recipe:" in recipe:
                parts = recipe.split("Now write the recipe:")
                if len(parts) > 1:
                    recipe = parts[-1].strip()
            
            # Validate recipe has actual content
            if not recipe or len(recipe.strip()) < 150:
                logger.warning(f"Attempt {attempt + 1}: Generated recipe too short ({len(recipe)} chars)")
                if attempt == max_retries - 1:
                    raise ValueError("Model generated insufficient content")
                continue
            
            # Validate recipe structure
            if not validate_recipe_structure(recipe):
                logger.warning(f"Attempt {attempt + 1}: Recipe missing required sections")
                if attempt == max_retries - 1:
                    raise ValueError("Recipe missing required sections (Title, Times, Servings, Ingredients, Steps, Tips)")
                continue
            
            logger.info(f"Recipe generated successfully on attempt {attempt + 1}")
            return recipe.strip()
            
        except torch.cuda.OutOfMemoryError:
            logger.error(f"Attempt {attempt + 1}: GPU out of memory")
            if attempt == max_retries - 1:
                raise RuntimeError("GPU out of memory - recipe generation failed")
        except RuntimeError as e:
            logger.error(f"Attempt {attempt + 1}: Runtime error: {str(e)}")
            if attempt == max_retries - 1:
                raise
        except Exception as e:
            logger.error(f"Attempt {attempt + 1}: Unexpected error: {str(e)}")
            if attempt == max_retries - 1:
                raise RuntimeError(f"Failed to generate recipe: {str(e)}")
    
    raise RuntimeError("Recipe generation failed after all retry attempts")