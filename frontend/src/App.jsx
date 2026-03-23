import { useEffect, useRef, useState } from "react";
import "./App.css";

const promptSuggestions = [
  "chicken, garlic, onions, tomato",
  "pasta, cream, mushrooms, butter",
  "rice, eggs, soy sauce, vegetables",
];

const formatTime = (value) =>
  new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);

const createTitle = (text) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Untitled recipe chat";
  return cleaned.length > 38 ? `${cleaned.slice(0, 38)}...` : cleaned;
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [ingredients, setIngredients] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  const syncConversation = (conversationId, nextMessages, fallbackTitle) => {
    setConversations((prev) => {
      const existing = prev.find((conversation) => conversation.id === conversationId);

      if (!existing) {
        return [
          {
            id: conversationId,
            title: fallbackTitle,
            timestamp: new Date(),
            messages: nextMessages,
          },
          ...prev,
        ];
      }

      return prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title: conversation.title || fallbackTitle,
              timestamp: new Date(),
              messages: nextMessages,
            }
          : conversation
      );
    });
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setIngredients("");
    setError("");
  };

  const loadConversation = (conversationId) => {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) return;

    setCurrentConversationId(conversationId);
    setMessages(conversation.messages);
    setError("");
  };

  const deleteConversation = (conversationId, event) => {
    event.stopPropagation();
    setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));

    if (currentConversationId === conversationId) {
      startNewConversation();
    }
  };

  const clearAllConversations = () => {
    if (!window.confirm("Clear all conversations?")) return;
    setConversations([]);
    startNewConversation();
  };

  const generateRecipe = async () => {
    if (!ingredients.trim() || loading) return;

    const conversationId = currentConversationId ?? Date.now();
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: ingredients.trim(),
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setCurrentConversationId(conversationId);
    setIngredients("");
    setLoading(true);
    setError("");
    syncConversation(conversationId, nextMessages, createTitle(userMessage.content));

    try {
      const response = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate recipe");
      }

      const data = await response.json();
      const ingredientLead = userMessage.content.split(",")[0].trim();
      let recipeImage = "";

      try {
        const imageResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
            `${ingredientLead} food`
          )}&count=1&client_id=kmL92F3P3aQDkr7Xd01fRhKH_aXaOc0kKYvtJTRHaXk`
        );
        const imageData = await imageResponse.json();
        if (imageData.results?.length) {
          recipeImage = imageData.results[0].urls.regular;
        }
      } catch {
        console.log("Could not fetch image");
      }

      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: data.recipe,
        image: recipeImage,
        timestamp: new Date(),
      };

      const updatedMessages = [...nextMessages, aiMessage];
      setMessages(updatedMessages);
      syncConversation(conversationId, updatedMessages, createTitle(userMessage.content));
    } catch (requestError) {
      setError("Recipe generation failed. Check that the backend is running and try again.");
      console.error(requestError);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      generateRecipe();
    }
  };

  const handleCopy = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (copyError) {
      console.error(copyError);
    }
  };

  return (
    <div className={`app-shell ${sidebarOpen ? "" : "sidebar-hidden"}`.trim()}>
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />

      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-panel">
          <div className="sidebar-header">
            <button
              className="icon-button mobile-only"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              x
            </button>
            <div className="brand-lockup">
              <div className="brand-mark">R</div>
              <div>
                <p className="brand-eyebrow">Kitchen Copilot</p>
                <h1 className="brand-name">RecipeAI</h1>
              </div>
            </div>
          </div>

          <button className="primary-action" onClick={startNewConversation}>
            <span>New chat</span>
            <span className="action-shortcut">Fresh session</span>
          </button>

          <div className="sidebar-section">
            <div className="section-heading">
              <span>Recent chats</span>
              <span>{conversations.length}</span>
            </div>

            <div className="conversation-list">
              {conversations.length === 0 ? (
                <div className="empty-sidebar-card">
                  <p>No saved recipe chats yet.</p>
                  <span>Your next request will appear here.</span>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`conversation-card ${
                      currentConversationId === conversation.id ? "active" : ""
                    }`}
                  >
                    <button
                      className="conversation-open"
                      onClick={() => loadConversation(conversation.id)}
                    >
                      <div className="conversation-copy">
                        <span className="conversation-title">{conversation.title}</span>
                        <span className="conversation-meta">
                          {conversation.messages.length} messages
                        </span>
                      </div>
                    </button>
                    <button
                      className="delete-button"
                      onClick={(event) => deleteConversation(conversation.id, event)}
                      aria-label="Delete conversation"
                    >
                      x
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="footer-card">
              <p>Built for fast weeknight cooking.</p>
              <span>Turn leftover ingredients into a plated plan.</span>
            </div>
            {conversations.length > 0 && (
              <button className="secondary-action" onClick={clearAllConversations}>
                Clear history
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="main-stage">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle sidebar"
            >
              <span className="hamburger" />
            </button>
            <div>
              <p className="topbar-label">Modern recipe workspace</p>
              <h2 className="topbar-title">
                {currentConversationId ? "Active recipe chat" : "Start a new session"}
              </h2>
            </div>
          </div>

          <div className="topbar-badges">
            <span className="status-badge">Live generation</span>
            <span className="status-badge subtle">Chef mode</span>
          </div>
        </header>

        <section className="chat-stage">
          {messages.length === 0 ? (
            <div className="hero-panel">
              <div className="hero-copy">
                <p className="hero-kicker">AI recipe assistant</p>
                <h3>Describe what is in your kitchen and get a polished recipe flow back.</h3>
                <p className="hero-text">
                  ChatGPT-style interaction, but tuned for ingredients, cooking ideas, and
                  presentation-ready recipes.
                </p>
              </div>

              <div className="hero-grid">
                <article className="info-card accent">
                  <span className="card-label">What it does</span>
                  <h4>From pantry to plated idea</h4>
                  <p>Generate a recipe, cooking steps, and supporting inspiration from a short prompt.</p>
                </article>
                <article className="info-card">
                  <span className="card-label">Best prompts</span>
                  <h4>Use ingredients plus mood</h4>
                  <p>Try details like creamy, spicy, protein-rich, quick dinner, or one-pan.</p>
                </article>
                <article className="info-card">
                  <span className="card-label">Suggested starters</span>
                  <div className="suggestion-list">
                    {promptSuggestions.map((prompt) => (
                      <button
                        key={prompt}
                        className="suggestion-chip"
                        onClick={() => setIngredients(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          ) : (
            <div className="messages-feed">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`message-row ${message.type === "user" ? "user-row" : "ai-row"}`}
                >
                  <div className={`avatar ${message.type === "user" ? "user-avatar" : "ai-avatar"}`}>
                    {message.type === "user" ? "You" : "AI"}
                  </div>

                  <div className="message-card">
                    <div className="message-header">
                      <div>
                        <p className="message-author">
                          {message.type === "user" ? "You" : "RecipeAI"}
                        </p>
                        <span className="message-time">{formatTime(message.timestamp)}</span>
                      </div>
                    </div>

                    {message.type === "ai" && message.image && (
                      <div className="message-image">
                        <img src={message.image} alt="Recipe inspiration" />
                      </div>
                    )}

                    <div className="message-body">{message.content}</div>

                    {message.type === "ai" && (
                      <div className="message-toolbar">
                        <button className="toolbar-button" onClick={() => handleCopy(message.content)}>
                          Copy recipe
                        </button>
                        <button className="toolbar-button" onClick={startNewConversation}>
                          New chat
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {loading && (
                <article className="message-row ai-row">
                  <div className="avatar ai-avatar">AI</div>
                  <div className="message-card loading-card">
                    <div className="typing-indicator">
                      <span />
                      <span />
                      <span />
                    </div>
                    <p>Building a recipe from your ingredients...</p>
                  </div>
                </article>
              )}

              {error && (
                <article className="message-row ai-row">
                  <div className="avatar ai-avatar">AI</div>
                  <div className="message-card error-card">{error}</div>
                </article>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </section>

        <footer className="composer-shell">
          <div className="composer">
            <textarea
              className="composer-input"
              placeholder="List ingredients, constraints, or the kind of meal you want..."
              value={ingredients}
              onChange={(event) => setIngredients(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows="1"
            />

            <div className="composer-actions">
              <p className="composer-hint">Press Ctrl+Enter to send</p>
              <button
                className="send-button"
                onClick={generateRecipe}
                disabled={loading || !ingredients.trim()}
                aria-label="Generate recipe"
              >
                {loading ? <span className="spinner" /> : "Send"}
              </button>
            </div>
          </div>
          <p className="disclaimer">RecipeAI can be helpful, but recipes should still be reviewed before cooking.</p>
        </footer>
      </main>
    </div>
  );
}
