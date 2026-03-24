import { useEffect, useRef, useState } from "react";
import "./App.css";

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

const formatTimestamp = (value) =>
  new Intl.DateTimeFormat([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const SendIcon = () => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    height="20"
    width="20"
    aria-hidden="true"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const PlusIcon = () => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    height="18"
    width="18"
    aria-hidden="true"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const MenuIcon = () => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    height="18"
    width="18"
    aria-hidden="true"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    height="18"
    width="18"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const TrashIcon = () => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2"
    viewBox="0 0 24 24"
    height="16"
    width="16"
    aria-hidden="true"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [ingredients, setIngredients] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const chatViewportRef = useRef(null);

  useEffect(() => {
    if (!chatViewportRef.current) return;
    chatViewportRef.current.scrollTop = chatViewportRef.current.scrollHeight;
  }, [messages, loading, error]);

  useEffect(() => {
    const savedState = window.localStorage.getItem(STORAGE_KEY);
    if (!savedState) return;

    try {
      const parsed = JSON.parse(savedState);
      const savedConversations = parsed.conversations ?? [];
      const savedConversationId = parsed.currentConversationId ?? null;

      setConversations(savedConversations);

      if (savedConversationId) {
        const activeConversation = savedConversations.find(
          (conversation) => conversation.id === savedConversationId
        );

        if (activeConversation) {
          setCurrentConversationId(savedConversationId);
          setMessages(activeConversation.messages ?? []);
        }
      }
    } catch (storageError) {
      console.error(storageError);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        conversations,
        currentConversationId,
      })
    );
  }, [conversations, currentConversationId]);

  useEffect(() => {
    if (!loading) {
      setLoaderIndex(0);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setLoaderIndex((prev) => (prev + 1) % loaderTexts.length);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [loading]);

  const syncConversation = (conversationId, nextMessages, fallbackTitle) => {
    setConversations((prev) => {
      const existing = prev.find((conversation) => conversation.id === conversationId);

      if (!existing) {
        return [
          {
            id: conversationId,
            title: fallbackTitle,
            messages: nextMessages,
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ];
      }

      return prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title: conversation.title || fallbackTitle,
              messages: nextMessages,
              updatedAt: new Date().toISOString(),
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

    if (window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  };

  const deleteConversation = (conversationId) => {
    const remaining = conversations.filter((conversation) => conversation.id !== conversationId);
    setConversations(remaining);

    if (currentConversationId === conversationId) {
      if (remaining.length > 0) {
        setCurrentConversationId(remaining[0].id);
        setMessages(remaining[0].messages ?? []);
      } else {
        startNewConversation();
      }
    }
  };

  const clearHistory = () => {
    setConversations([]);
    startNewConversation();
  };

  const generateRecipe = async () => {
    if (!ingredients.trim() || loading) return;

    const conversationId = currentConversationId ?? Date.now();
    const userPrompt = ingredients.trim();
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: userPrompt,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setCurrentConversationId(conversationId);
    setIngredients("");
    setLoading(true);
    setError("");
    syncConversation(conversationId, nextMessages, createTitle(userPrompt));

    try {
      const response = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients: userPrompt }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate recipe");
      }

      const data = await response.json();
      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: data.recipe,
      };

      const updatedMessages = [...nextMessages, aiMessage];
      setMessages(updatedMessages);
      syncConversation(conversationId, updatedMessages, createTitle(userPrompt));
    } catch (requestError) {
      const fallbackMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: "Mock Response: Here is your high-protein vegan lasagna recipe...",
      };

      const fallbackMessages = [...nextMessages, fallbackMessage];
      setMessages(fallbackMessages);
      setError("Backend not connected. Showing a mock response.");
      syncConversation(conversationId, fallbackMessages, createTitle(userPrompt));
      console.error(requestError);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      generateRecipe();
    }
  };

  return (
    <div className="app-shell">
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-brand">
          <p className="sidebar-kicker">Professional Recipe Bot</p>
          <h2>Chef AI</h2>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <CloseIcon />
          </button>
        </div>

        <button className="new-chat-btn" onClick={startNewConversation}>
          <PlusIcon />
          <span>New Recipe</span>
        </button>

        <div className="sidebar-heading-row">
          <div className="sidebar-heading">Chat History</div>
          {conversations.length > 0 && (
            <button className="clear-history-btn" onClick={clearHistory}>
              Clear all
            </button>
          )}
        </div>
        <div className="history-list">
          {conversations.length === 0 ? (
            <div className="history-empty">No recent recipe chats yet.</div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`history-item ${
                  currentConversationId === conversation.id ? "active" : ""
                }`}
              >
                <button className="history-main" onClick={() => loadConversation(conversation.id)}>
                  <span className="history-title">{conversation.title}</span>
                  <span className="history-meta">
                    {conversation.messages.length} messages
                    {" · "}
                    {formatTimestamp(conversation.updatedAt ?? Date.now())}
                  </span>
                </button>
                <button
                  className="history-delete"
                  onClick={() => deleteConversation(conversation.id)}
                  aria-label="Delete conversation"
                >
                  <TrashIcon />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-card">
          <h3>Cook smarter</h3>
          <p>Use pantry items, nutrition goals, or time limits to get cleaner recipe suggestions.</p>
        </div>
      </aside>

      <main className="chat-container">
        <header className="page-header">
          <div className="header-main">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle chat history"
            >
              <MenuIcon />
            </button>
            <p className="eyebrow">Modern Kitchen Workspace</p>
            <h1 className="page-title">Bright, clean recipe guidance for every meal.</h1>
          </div>
          <div className="header-badges">
            <span className="header-badge">{conversations.length} chats saved</span>
            <span className="header-badge">Live AI Chef</span>
            <span className="header-badge subtle">Ingredient-first</span>
          </div>
        </header>

        <div className="chat-viewport" id="chatBox" ref={chatViewportRef}>
          {messages.length === 0 && (
            <div className="welcome-screen" id="welcomeScreen">
              <div className="hero-panel">
                <p className="eyebrow">Chef AI</p>
                <h2>What are we cooking today?</h2>
                <p className="hero-text">
                  Start with ingredients, a cuisine style, calorie target, or cooking time and let
                  the assistant shape a polished recipe for you.
                </p>

                <div className="hero-grid">
                  <div className="feature-card">
                    <h3>Ingredient-led ideas</h3>
                    <p>Turn what you already have into balanced meal suggestions.</p>
                  </div>
                  <div className="feature-card">
                    <h3>Neat chat layout</h3>
                    <p>Assistant responses stay left, while your prompts stay pinned right.</p>
                  </div>
                  <div className="feature-card">
                    <h3>Full page structure</h3>
                    <p>Header, content area, composer, and footer all work as one complete site.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`message-row ${message.type}`}>
              <div className="message-shell">
                <div className={`avatar ${message.type === "ai" ? "ai-avatar" : "user-avatar"}`}>
                  {message.type === "ai" ? "AI" : "U"}
                </div>
                <div className="message-content">
                  <div className="message-label">
                    {message.type === "ai" ? "Chef AI Assistant" : "You"}
                  </div>
                  <div className="message-bubble">{message.content}</div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="loader-container ai" id="loader">
              <div className="message-shell">
                <div className="avatar ai-avatar">AI</div>
                <div className="loader-content">
                  <div className="pulse-dot" />
                  <span id="loaderText">{loaderTexts[loaderIndex]}</span>
                </div>
              </div>
            </div>
          )}

          {error && <div className="status-message">{error}</div>}
        </div>

        <div className="input-container">
          <div className="input-wrapper">
            <input
              type="text"
              id="userInput"
              placeholder="Ask for a recipe, e.g., 'Vegan lasagna under 500 calories'"
              autoComplete="off"
              value={ingredients}
              onChange={(event) => setIngredients(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              id="sendBtn"
              onClick={generateRecipe}
              disabled={loading || !ingredients.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
          <div className="disclaimer">
            Chef AI can make mistakes. Always check ingredient allergies.
          </div>
        </div>

        <footer className="site-footer">
          <div>
            <h3>Chef AI Studio</h3>
            <p>Professional recipe assistance with a cleaner interface for planning everyday meals.</p>
          </div>
          <div className="footer-links">
            <span>Recipe prompts</span>
            <span>Cooking flows</span>
            <span>Ingredient planning</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
