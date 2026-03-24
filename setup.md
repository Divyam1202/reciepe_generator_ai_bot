# 🚀 Local Development Setup

To run this project locally, you must run both the Python FastAPI backend and the React Vite frontend concurrently.

## 1. Environment Variables

Create `.env` files in both the frontend and backend directories.

**Backend (`backend/.env`)**
```env
PORT=8000
MODEL_PATH=./models/finalmodel
UNSPLASH_ACCESS_KEY=your_unsplash_api_key
