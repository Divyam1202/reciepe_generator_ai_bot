from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .recipe_engine import generate_recipe
from .history import save_conversation, delete_conversation, get_all_conversations, clear_all_history, get_conversation
from .schemas import SaveConversationRequest, DeleteConversationRequest

router = APIRouter()


class RecipeRequest(BaseModel):
    ingredients: str


@router.post("/generate")
def generate(data: RecipeRequest):
    """Generate a detailed recipe from ingredients with all required sections."""
    try:
        # Enhanced prompt ensuring all sections are included
        prompt = f"""You are an expert professional chef. Create a COMPLETE and DETAILED recipe using these ingredients:
{data.ingredients}

IMPORTANT: You MUST include ALL these sections in your response:

1. RECIPE TITLE - Give an appealing name for this dish

2. PREP TIME - [X minutes]
   COOK TIME - [X minutes]
   SERVINGS - [Number]

3. INGREDIENTS LIST - Include all components with EXACT quantities in both metric (grams, ml) AND imperial (oz, cups) units. List each ingredient on a new line with bullet point or dash

4. STEP-BY-STEP COOKING INSTRUCTIONS - Number each step (1, 2, 3, etc). Provide 5-7 DETAILED steps explaining:
   - What to do
   - How long it takes
   - Cooking temperature if needed
   - Visual cues to know when it's done

5. SERVING TIPS - Include:
   - How to plate/serve the dish
   - Optional garnishes
   - Suggested side dishes
   - Storage instructions
   - Possible variations

Use descriptive, appetizing language. Make the reader want to cook this! 

Now write the complete detailed recipe with ALL sections:"""

        recipe = generate_recipe(prompt)
        
        return {"recipe": recipe}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recipe: {str(e)}")


@router.post("/save-conversation")
def save_conv(data: SaveConversationRequest):
    """Save or update a conversation."""
    try:
        conversation = save_conversation(data.id, data.title, data.messages)
        return conversation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save conversation: {str(e)}")


@router.post("/delete-conversation")
def delete_conv(data: DeleteConversationRequest):
    """Delete a conversation."""
    try:
        success = delete_conversation(data.id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


@router.get("/history")
def get_history():
    """Get all conversations."""
    try:
        return get_all_conversations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load history: {str(e)}")


@router.get("/history/{conversation_id}")
def get_hist(conversation_id: str):
    """Get a specific conversation."""
    try:
        conversation = get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load conversation: {str(e)}")


@router.post("/clear-history")
def clear_hist():
    """Clear all conversation history."""
    try:
        clear_all_history()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear history: {str(e)}")