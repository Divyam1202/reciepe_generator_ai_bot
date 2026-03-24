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
* [Local Setup & Installation](docs/SETUP.md)
* [API Reference](docs/API.md)

## 🛣️ Roadmap
- [ ] Containerize backend and frontend using Docker.
- [ ] Implement robust error handling for API timeouts.
- [ ] Deploy FastAPI backend to a production environment.
- [ ] Deploy React frontend to Vercel/Netlify.

## 📝 License
This project is available under the MIT License.
