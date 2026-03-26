import logging
from fastapi import APIRouter, HTTPException

from .history import clear_all_history, delete_conversation, get_all_conversations, get_conversation, save_conversation
from .prompt_builder import build_generation_context
from .recipe_engine import generate_response
from .schemas import DeleteConversationRequest, RecipeRequest, SaveConversationRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate")
def generate(data: RecipeRequest):
    """Generate a recipe or follow-up response using conversation context."""
    try:
        # Validate input
        if not data.ingredients or not data.ingredients.strip():
            raise HTTPException(status_code=400, detail="Ingredients cannot be empty")

        # Build context from conversation history and user input
        try:
            context = build_generation_context(data.ingredients, data.messages)
        except Exception as e:
            logger.error("Failed to build generation context: %s", e)
            raise HTTPException(status_code=400, detail=f"Invalid message format: {str(e)}")

        # Validate context
        if not context or not isinstance(context, dict):
            raise HTTPException(status_code=500, detail="Failed to build valid context")

        # Generate response
        try:
            response_text = generate_response(
                chat_messages=context.get("chat_messages"),
                require_recipe=context.get("require_recipe", True),
            )
        except Exception as e:
            logger.error("Failed to generate response: %s", e)
            raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

        if not response_text or not isinstance(response_text, str):
            raise HTTPException(status_code=500, detail="Invalid response format from model")

        return {"recipe": response_text}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in generate endpoint: %s", e)
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")


@router.post("/save-conversation")
def save_conv(data: SaveConversationRequest):
    """Save or update a conversation."""
    try:
        if not data.id or not data.title or not data.messages:
            raise HTTPException(status_code=400, detail="Missing required fields")

        conversation = save_conversation(data.id, data.title, data.messages)
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to save conversation: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to save conversation: {str(e)}")


@router.post("/delete-conversation")
def delete_conv(data: DeleteConversationRequest):
    """Delete a conversation."""
    try:
        if not data.id:
            raise HTTPException(status_code=400, detail="Conversation ID required")

        success = delete_conversation(data.id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"success": success}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete conversation: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


@router.get("/history")
def get_history():
    """Get all conversations."""
    try:
        conversations = get_all_conversations()
        if conversations is None:
            conversations = []
        return conversations
    except Exception as e:
        logger.error("Failed to load history: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to load history: {str(e)}")


@router.get("/history/{conversation_id}")
def get_hist(conversation_id: str):
    """Get a specific conversation."""
    try:
        if not conversation_id:
            raise HTTPException(status_code=400, detail="Conversation ID required")

        conversation = get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to load conversation %s: %s", conversation_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to load conversation: {str(e)}")


@router.post("/clear-history")
def clear_hist():
    """Clear all conversation history."""
    try:
        clear_all_history()
        return {"success": True}
    except Exception as e:
        logger.error("Failed to clear history: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to clear history: {str(e)}")
