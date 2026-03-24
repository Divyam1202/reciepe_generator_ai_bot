# 🍳 Chef AI - Recipe Generator

A full-stack, AI-powered recipe generation workspace. Chef AI takes user-provided ingredients, nutritional targets, or meal types and utilizes machine learning to generate structured, actionable cooking instructions.

## 🏗️ Architecture

This application is split into two isolated services to ensure a clean separation of concerns between the user interface and the machine learning inference engine.

* **Frontend:** React 18, Vite, standard CSS (custom responsive glass-morphism design).
* **Backend:** Python 3.x, FastAPI.
* **AI Engine:** HuggingFace / Local Llama Models.
* **Assets:** Unsplash API for dynamic food imagery.

## 📚 Documentation
Detailed documentation is split into dedicated files:
* [Local Setup & Installation](https://github.com/Divyam1202/recipe-generator-ai/blob/main/setup.md)

## 🛣️ Roadmap
- Phase 1: Data & Model Engineering (Python)
-- [] Data Extraction: Develop Python scripts to scrape and clean raw text from PDF/eBook sources.
-- [] Dataset Preparation: Convert cleaned text into structured .jsonl files for LLM fine-tuning.
-- [] Model Training: Fine-tune Llama 3/Mistral on custom culinary datasets using Unsloth/HuggingFace.
-- [] Inference Optimization: Implement GGUF quantization for faster local response times.

- Phase 2: Full-Stack Integration
-- [] API Logic: Connect the fine-tuned model to the FastAPI POST /generate endpoint.
-- [] CORS & Security: Configure middleware to allow secure communication between services.
-- [] State Management: Implement LocalStorage in React to persist user recipe history.
-- [] Error Handling: Add robust try/except blocks for API timeouts and model inference failures.

- Phase 3: Containerization & DevOps
-- [] Dockerization: Write Dockerfiles for both Frontend and Backend to ensure environment parity.
-- [] Orchestration: Use docker-compose to launch the entire stack with a single command.
-- [] Environment Control: Standardize .env management across local and production builds.

- Phase 4: Deployment & Scaling
-- [] Backend (Render): Deploy the FastAPI server with a persistent disk for model weights.
-- [] Frontend (Vercel): Deploy the React/Vite UI to Vercel for global edge-network delivery.
-- [] Automated CI/CD: Set up GitHub Actions to trigger deployments on every successful Pull Request merge.

## 📝 License
This project is available under the MIT License.
