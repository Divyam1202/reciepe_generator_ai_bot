import { useEffect, useRef, useState } from "react";
import "./index.css";

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
        const activeConversation = savedConversations.find((c) => c.id === savedConversationId);
        if (activeConversation) {
          setCurrentConversationId(savedConversationId);
          setMessages(activeConversation.messages ?? []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ conversations, currentConversationId })
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
      const existing = prev.find((c) => c.id === conversationId);
      if (!existing) {
        return [{ id: conversationId, title: fallbackTitle, messages: nextMessages, updatedAt: new Date().toISOString() }, ...prev];
      }
      return prev.map((c) =>
        c.id === conversationId ? { ...c, title: c.title || fallbackTitle, messages: nextMessages, updatedAt: new Date().toISOString() } : c
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
    if (window.innerWidth <= 900) setSidebarOpen(false);
  };

  const deleteConversation = (conversationId) => {
    const remaining = conversations.filter((c) => c.id !== conversationId);
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
    const userMessage = { id: Date.now(), type: "user", content: userPrompt };

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: userPrompt }),
      });

      if (!response.ok) throw new Error("Failed to generate recipe");

      const data = await response.json();
      const aiMessage = { id: Date.now() + 1, type: "ai", content: data.recipe };
      const updatedMessages = [...nextMessages, aiMessage];
      setMessages(updatedMessages);
      syncConversation(conversationId, updatedMessages, createTitle(userPrompt));
    } catch (requestError) {
      console.error("Backend connection failed:", requestError);
      const fallbackMessage = { id: Date.now() + 1, type: "ai", content: "Mock Response: Here is your high-protein vegan lasagna recipe..." };
      const fallbackMessages = [...nextMessages, fallbackMessage];
      setMessages(fallbackMessages);
      setError("Backend not connected. Showing a mock response.");
      syncConversation(conversationId, fallbackMessages, createTitle(userPrompt));
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
      <div className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <button className="icon-btn" onClick={() => setSidebarOpen(false)}>
            <MenuIcon />
          </button>
        </div>
        
        <button className="new-chat-btn" onClick={startNewConversation}>
          <PlusIcon />
          <span>New Recipe</span>
        </button>

        <div className="history-section">
          <div className="sidebar-heading-row">
            <span className="sidebar-heading">Recent</span>
            {conversations.length > 0 && (
              <button className="clear-history-btn" onClick={clearHistory}>Clear</button>
            )}
          </div>
          
          <div className="history-list">
            {conversations.length === 0 ? (
              <div className="history-empty">No recent chats.</div>
            ) : (
              conversations.map((conversation) => (
                <div key={conversation.id} className={`history-item ${currentConversationId === conversation.id ? "active" : ""}`}>
                  <button className="history-main" onClick={() => loadConversation(conversation.id)}>
                    <span className="history-title">{conversation.title}</span>
                  </button>
                  <button className="history-delete" onClick={() => deleteConversation(conversation.id)}>
                    <TrashIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="site-header">
          <div className="header-left">
            {!sidebarOpen && (
              <button className="icon-btn" onClick={() => setSidebarOpen(true)}>
                <MenuIcon />
              </button>
            )}
            <h1 className="header-brand">Chef AI</h1>
          </div>
          <div className="header-badges">
            <span className="header-badge">Live Assistant</span>
          </div>
        </header>

        <main className="chat-container">
          <div className="chat-viewport" ref={chatViewportRef}>
            {messages.length === 0 && (
              <div className="welcome-screen">
                <h2>What are we cooking today?</h2>
                <p className="hero-text">Provide your ingredients, target calories, or meal type.</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`message-row ${message.type}`}>
                <div className="message-shell">
                  <div className={`avatar ${message.type === "ai" ? "ai-avatar" : "user-avatar"}`}>
                    {message.type === "ai" ? "AI" : "U"}
                  </div>
                  <div className="message-content">
                    <div className="message-bubble">{message.content}</div>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="message-row ai">
                <div className="message-shell">
                  <div className="avatar ai-avatar">AI</div>
                  <div className="loader-content">
                    <div className="pulse-dot" />
                    <span>{loaderTexts[loaderIndex]}</span>
                  </div>
                </div>
              </div>
            )}

            {error && <div className="status-message">{error}</div>}
          </div>

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
              <button onClick={generateRecipe} disabled={loading || !ingredients.trim()}>
                <SendIcon />
              </button>
            </div>
            <p className="disclaimer">Chef AI can make mistakes. Always check ingredient allergies.</p>
          </div>
        </main>

        <footer className="site-footer">
          <p>© {new Date().getFullYear()} Chef AI Studio. Modern Kitchen Workspace.</p>
          <div className="footer-links">
            <span>Terms</span>
            <span>Privacy</span>
          </div>
        </footer>
      </div>
    </div>
  );
}