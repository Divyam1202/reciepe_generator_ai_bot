import { useEffect, useRef, useState } from "react";
import "./index.css";
import { apiCall } from "./api";

const STORAGE_KEY = "chef-ai-history";

const loaderTexts = [
  "Analyzing macro requirements...",
  "Searching culinary database...",
  "Balancing flavor profiles...",
  "Structuring recipe steps...",
  "Plating the final output...",
];

const createTitle = (text) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Untitled recipe";
  return cleaned.length > 22 ? `${cleaned.slice(0, 22)}...` : cleaned;
};

const getTimePhase = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
};

// --- Icons ---
const SendIcon = () => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="20" width="20">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const PlusIcon = () => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="18" width="18">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const MenuIcon = () => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="24" width="24">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const TrashIcon = () => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="16" width="16">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const SUGGESTIONS = [
  "chicken, garlic, onions, tomato",
  "pasta, cream, mushrooms, butter",
  "rice, eggs, soy sauce, vegetables",
  "salmon, lemon, dill, olive oil"
];

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [ingredients, setIngredients] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [timePhase, setTimePhase] = useState(getTimePhase());
  const chatViewportRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const persistMessagesToConversation = (convId, conversationMessages) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === convId
          ? {
              ...conv,
              messages: conversationMessages,
              timestamp: new Date(),
              title: conversationMessages[0]?.content?.slice(0, 34) || "New conversation"
            }
          : conv
      )
    );
  };

  const generateRecipe = async () => {
    if (!ingredients.trim() || loading) return;

    const now = Date.now();
    const userMessage = {
      id: now,
      type: "user",
      content: ingredients.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIngredients("");
    setLoading(true);
    setError("");

    let activeConversationId = currentConversationId;
    if (!activeConversationId) {
      activeConversationId = now + 5;
      setCurrentConversationId(activeConversationId);
      setConversations((prev) => [
        {
          id: activeConversationId,
          title: userMessage.content.slice(0, 34),
          timestamp: new Date(),
          messages: [userMessage]
        },
        ...prev
      ]);
    } else {
      persistMessagesToConversation(activeConversationId, updatedMessages);
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ingredients: userMessage.content })
      });

      if (!res.ok) throw new Error("Failed to generate recipe");

      const data = await res.json();

      let recipeImage = "";
      try {
        const ingredientsList = userMessage.content.split(",")[0].trim();
        const imageRes = await fetch(
          `https://api.unsplash.com/search/photos?query=${ingredientsList}%20food&count=1&client_id=kmL92F3P3aQDkr7Xd01fRhKH_aXaOc0kKYvtJTRHaXk`
        );
        const imageData = await imageRes.json();
        if (imageData.results?.length > 0) {
          recipeImage = imageData.results[0].urls.regular;
        }
      } catch {
        console.log("Could not fetch image");
      }
    };
    loadHistoryFromBackend();
  }, []);

      const aiMessage = {
        id: now + 1,
        type: "ai",
        content: data.recipe,
        image: recipeImage,
        timestamp: new Date().toISOString()
      };

      const withResponse = [...updatedMessages, aiMessage];
      setMessages(withResponse);
      persistMessagesToConversation(activeConversationId, withResponse);
    } catch (err) {
      setError("Failed to generate recipe. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
    const interval = window.setInterval(() => {
      setLoaderIndex((prev) => (prev + 1) % loaderTexts.length);
    }, 1500);
    return () => window.clearInterval(interval);
  }, [loading]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generateRecipe();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setIngredients("");
    setError("");
  };

  const loadConversation = (convId) => {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      setCurrentConversationId(convId);
      setMessages(conv.messages);
      setError("");
    }
    // Sync deletion to backend asynchronously
    apiCall("/delete-conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: String(conversationId) }),
    }).catch(err => console.error("Failed to delete from backend:", err));
  };

  const deleteConversation = (convId, e) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (currentConversationId === convId) {
      startNewConversation();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      generateRecipe();
    }
  };

  const conversationTitle = currentConversationId
    ? conversations.find((conv) => conv.id === currentConversationId)?.title
    : "New recipe chat";

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">RecipeAI</h2>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? "←" : "→"}
          </button>
        </div>

        <button className="new-chat-btn" onClick={startNewConversation}>
          + New chat
        </button>

        <div className="conversations-section">
          <div className="conversations-label">Recent chats</div>
          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="empty-state">No chats yet</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`conversation-item ${
                    currentConversationId === conv.id ? "active" : ""
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="conversation-meta">
                    <div className="conversation-title">{conv.title}</div>
                    <div className="conversation-time">{formatTime(conv.timestamp)}</div>
                  </div>
                  <span
                    className="delete-conv-btn"
                    onClick={(e) => deleteConversation(conv.id, e)}
                    aria-label="Delete conversation"
                  >
                    ✕
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {conversations.length > 0 && (
          <div className="sidebar-footer">
            <button className="clear-btn" onClick={clearAllConversations}>
              Clear history
            </button>
          </div>
        )}
      </aside>

      <main className="main-container">
        <header className="chat-header">
          <div className="chat-title-wrap">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <div>
              <h1>{conversationTitle || "New recipe chat"}</h1>
              <p>Online chef assistant</p>
            </div>
          </div>
          <div className="chat-status">Ready to cook</div>
        </header>

        <section className="chat-area">
          {messages.length === 0 && !loading ? (
            <div className="empty-chat-state">
              <div className="welcome-badge">🍳 Chef online</div>
              <h2>Drop ingredients, get a complete recipe in chat.</h2>
              <p>
                Designed like a messaging app so your recipe flow feels natural, fast, and easy to revisit.
              </p>

              <div className="suggestion-prompts">
                {SUGGESTIONS.map((prompt) => (
                  <button key={prompt} className="prompt-btn" onClick={() => setIngredients(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="messages-container">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className={`message-row ${msg.type === "user" ? "user-row" : "ai-row"}`}
              >
                <div className={`message-bubble ${msg.type === "user" ? "user-bubble" : "ai-bubble"}`}>
                  {msg.type === "ai" && msg.image ? (
                    <div className="message-image">
                      <img src={msg.image} alt="Recipe suggestion" />
                    </div>
                  ) : null}

                  <div className="message-text">{msg.content}</div>

                  <div className="message-footer">
                    <span>{formatTime(msg.timestamp)}</span>
                    {msg.type === "ai" && (
                      <button
                        className="action-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                        }}
                        title="Copy recipe"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {loading && (
              <article className="message-row ai-row">
                <div className="message-bubble ai-bubble loading-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="loading-text">Chef is preparing your recipe...</span>
                </div>
              </article>
            )}

            {error && (
              <article className="message-row ai-row">
                <div className="message-bubble ai-bubble error-bubble">{error}</div>
              </article>
            )}

          <div className="input-area">
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Ask for a recipe, e.g., 'Vegan lasagna under 500 calories'"
                autoComplete="off"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button onClick={generateRecipe} disabled={loading || !ingredients.trim()} aria-label="Send recipe request">
                <SendIcon />
              </button>
            </div>
            <p className="disclaimer">Chef AI can make mistakes. Always check ingredient allergies.</p>
          </div>
        </section>

        <footer className="input-area">
          <div className="input-wrapper">
            <textarea
              className="message-input"
              placeholder="Type ingredients like: chicken, onion, tomato"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows="1"
            />
            <button
              className="send-btn"
              onClick={generateRecipe}
              disabled={loading || !ingredients.trim()}
              aria-label="Generate recipe"
            >
              {loading ? "..." : "➤"}
            </button>
          </div>
          <p className="input-hint">Press Enter to send • Shift + Enter for new line.</p>
        </footer>
      </main>
    </div>
  );
}
