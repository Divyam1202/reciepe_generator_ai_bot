from pydantic import BaseModel, Field
from typing import List


class RecipeRequest(BaseModel):
    ingredients: str = Field(..., min_length=1, max_length=2000, description="Ingredients for the recipe")


class RecipeResponse(BaseModel):
    recipe: str


class MessageModel(BaseModel):
    id: int
    type: str  # "user" or "ai"
    content: str


class ConversationModel(BaseModel):
    id: str
    title: str
    messages: List[MessageModel]
    updatedAt: str


class SaveConversationRequest(BaseModel):
    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=500)
    messages: List[dict]


class DeleteConversationRequest(BaseModel):
    id: str = Field(..., min_length=1)