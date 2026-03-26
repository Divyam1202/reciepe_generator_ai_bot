# 🚀 Local Development Setup

To run this project locally, you must run both the Python FastAPI backend and the React Vite frontend concurrently in separate terminals.

## 1. Environment Variables

Create `.env` files in both the frontend and backend directories.

### Backend (`backend/.env`)

```env
PORT=8000
MODEL_PATH=./models/finalmodel
UNSPLASH_ACCESS_KEY=your_unsplash_api_key
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 2. Backend Initialization (FastAPI)

```bash
cd backend
python -m venv venv

# Activate Virtual Environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**API Endpoint:** `http://127.0.0.1:8000`

## 3. Frontend Initialization (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

**UI Endpoint:** `http://localhost:5173`

## 4. API Contract

The frontend expects the backend to adhere to this API contract:

### POST `/generate`

**Request:**
```json
{
  "ingredients": "string"
}
```

**Response:**
```json
{
  "recipe": "Markdown String",
  "responseTime": "float"
}
```

## 5. Tech Stack

- **Frontend:** React 18, Vite, Custom CSS
- **Backend:** Python 3.x, FastAPI, Pydantic
- **External APIs:** Unsplash Image API
- **Version Control:** Git & GitHub

## 6. License

MIT License. Created by Divyam Chandak.


## ⚠️ Important: .gitignore Configuration

Before pushing to GitHub, ensure your `.gitignore` file at the root includes:

```
# Python
venv/
.venv/
__pycache__/
*.pyc
*.egg-info/

# Node
node_modules/
dist/
.env.local

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
```

This prevents leaking your **Unsplash API Key** and keeps your repository clean without bloating it with dependencies.
