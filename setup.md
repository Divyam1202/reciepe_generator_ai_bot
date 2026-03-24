# 🚀 Local Development Setup

To run this project locally, you must run both the Python FastAPI backend and the React Vite frontend concurrently.

## 1. Environment Variables

Create `.env` files in both the frontend and backend directories before starting the servers.

## Backend (`backend/.env`)
```env
PORT=8000
MODEL_PATH=./models/finalmodel
UNSPLASH_ACCESS_KEY=your_unsplash_api_key
Frontend (frontend/.env)
VITE_API_BASE_URL=http://127.0.0.1:8000

## 2. Server Initialization

Run backend and frontend in separate terminals.

### Backend (FastAPI)
cd backend
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
In root folder run: uvicorn app.main:app --reload

Backend: http://127.0.0.1:8000

### Frontend (React + Vite)
cd frontend
npm install
npm run dev

Frontend: http://localhost:5173

## 3. API Contract
POST /generate
Headers
Content-Type: application/json
Request
{
  "ingredients": "chicken breast, broccoli, soy sauce, garlic"
}
Response (200)
{
  "recipe": "### Garlic Soy Chicken & Broccoli\n\n**Prep time:** 10 mins | **Cook time:** 15 mins\n\n**Ingredients:**\n- 1 chicken breast, diced\n- 2 cups broccoli florets\n- 2 tbsp soy sauce\n- 2 cloves garlic, minced\n\n**Instructions:**\n1. Heat oil in a pan over medium heat.\n2. Add chicken and cook until browned.\n3. Toss in garlic and broccoli, add soy sauce.\n4. Cover and steam for 5 minutes. Serve immediately."
}
Errors
422 → Invalid/missing ingredients
500 → Model failure

## 4. FastAPI Implementation

Put this in backend/app/main.py:

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class RecipeRequest(BaseModel):
    ingredients: str

@app.post("/generate")
async def generate_recipe(request: RecipeRequest):
    if not request.ingredients.strip():
        raise HTTPException(status_code=422, detail="Invalid ingredients")

    try:
        recipe = f"""### Generated Recipe

**Ingredients Provided:** {request.ingredients}

**Instructions:**
1. Combine ingredients
2. Cook properly
3. Serve hot
"""
        return {"recipe": recipe}

    except Exception:
        raise HTTPException(status_code=500, detail="Model inference failure")
