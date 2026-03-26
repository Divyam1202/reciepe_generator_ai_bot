import { useEffect, useRef, useState } from "react";
import "./index.css";
import { apiCall } from "./api";

const STORAGE_KEY = "chef-ai-history";
const MOBILE_BREAKPOINT = 900;

const SUGGESTIONS = [
  "chicken, garlic, onions, tomato",
  "pasta, cream, mushrooms, butter",
  "rice, eggs, soy sauce, vegetables",
  "salmon, lemon, dill, olive oil",
];

const LOADER_TEXTS = [
  "Reviewing your ingredients...",
  "Balancing flavors and timing...",
  "Drafting the cooking steps...",
  "Finishing the final recipe...",
];

const MECHANICAL_OMINOUS_COLD_THEME = {
  backgroundTop: "rgba(90, 109, 138, 0.12)",
  backgroundBottom: "rgba(60, 78, 104, 0.1)",
  backgroundCenter: "rgba(180, 198, 222, 0.02)",
  accent: "#b3c0d4",
  accentStrong: "#7f97b8",
  accentCool: "#8ea7bd",
  textMuted: "#7f8ea3",
  glowWarm: "rgba(122, 139, 165, 0.05)",
  glowCool: "rgba(84, 104, 129, 0.05)",
};

const createTitle = (text) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New recipe chat";
  return cleaned.length > 34 ? `${cleaned.slice(0, 34)}...` : cleaned;
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeMessage = (message) => ({
  id: Number(message.id) || Date.now(),
  type: message.type === "user" ? "user" : "ai",
  content: String(message.content ?? ""),
  timestamp: message.timestamp ?? new Date().toISOString(),
});

const normalizeConversation = (conversation) => ({
  id: String(conversation.id),
  title: conversation.title || "New recipe chat",
  updatedAt: conversation.updatedAt ?? new Date().toISOString(),
  messages: Array.isArray(conversation.messages)
    ? conversation.messages.map(normalizeMessage)
    : [],
});

const buildConversationPayload = (conversationId, title, messages) => ({
  id: String(conversationId),
  title,
  messages: messages.map(({ id, type, content }) => ({
    id: Number(id),
    type,
    content,
  })),
});

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 3 10 14" />
    <path d="m21 3-7 18-4-7-7-4Z" />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M3 12h18" />
    <path d="M3 18h18" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="m6 6 1 14h10l1-14" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > MOBILE_BREAKPOINT);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ingredients, setIngredients] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const loadInitialState = async () => {
      const savedState = window.localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          const savedConversations = Array.isArray(parsed.conversations)
            ? parsed.conversations.map(normalizeConversation)
            : [];
          const savedCurrentId =
            parsed.currentConversationId !== undefined && parsed.currentConversationId !== null
              ? String(parsed.currentConversationId)
              : null;

          if (!mounted) return;

          setConversations(savedConversations);
          setCurrentConversationId(savedCurrentId);

          if (savedCurrentId) {
            const activeConversation = savedConversations.find((item) => item.id === savedCurrentId);
            setMessages(activeConversation?.messages ?? []);
          }
        } catch (storageError) {
          console.error("Failed to restore local conversation history:", storageError);
        }
      }

      try {
        const history = await apiCall("/history");
        if (!mounted || !Array.isArray(history)) return;

        const normalizedHistory = history.map(normalizeConversation);
        if (normalizedHistory.length === 0) return;

        setConversations(normalizedHistory);
        setCurrentConversationId((previousId) => {
          const nextId = previousId ?? normalizedHistory[0].id;
          const activeConversation = normalizedHistory.find((item) => item.id === nextId);
          setMessages(activeConversation?.messages ?? normalizedHistory[0].messages ?? []);
          return nextId;
        });
      } catch (historyError) {
        console.error("Failed to load backend history:", historyError);
      }
    };

    loadInitialState();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ conversations, currentConversationId }),
    );
  }, [conversations, currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  useEffect(() => {
    if (!loading) {
      setLoadingTextIndex(0);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setLoadingTextIndex((previous) => (previous + 1) % LOADER_TEXTS.length);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const syncConversation = (conversationId, nextMessages, fallbackTitle) => {
    const timestamp = new Date().toISOString();

    setConversations((previous) => {
      const normalizedId = String(conversationId);
      const existing = previous.find((conversation) => conversation.id === normalizedId);

      if (!existing) {
        return [
          {
            id: normalizedId,
            title: fallbackTitle,
            updatedAt: timestamp,
            messages: nextMessages,
          },
          ...previous,
        ];
      }

      const updated = previous.map((conversation) =>
        conversation.id === normalizedId
          ? {
              ...conversation,
              title: fallbackTitle || conversation.title,
              updatedAt: timestamp,
              messages: nextMessages,
            }
          : conversation,
      );

      return updated.sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
    });
  };

  const saveConversationToBackend = async (conversationId, title, nextMessages) => {
    try {
      await apiCall("/save-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildConversationPayload(conversationId, title, nextMessages)),
      });
    } catch (saveError) {
      console.error("Failed to save conversation:", saveError);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setIngredients("");
    setError("");

    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      setSidebarOpen(false);
    }
  };

  const loadConversation = (conversationId) => {
    const normalizedId = String(conversationId);
    const conversation = conversations.find((item) => item.id === normalizedId);
    if (!conversation) return;

    setCurrentConversationId(normalizedId);
    setMessages(conversation.messages);
    setError("");

    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      setSidebarOpen(false);
    }
  };

  const deleteConversation = async (conversationId) => {
    const normalizedId = String(conversationId);
    const remaining = conversations.filter((conversation) => conversation.id !== normalizedId);

    setConversations(remaining);

    if (currentConversationId === normalizedId) {
      const nextConversation = remaining[0];
      setCurrentConversationId(nextConversation?.id ?? null);
      setMessages(nextConversation?.messages ?? []);
      setError("");
    }

    try {
      await apiCall("/delete-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: normalizedId }),
      });
    } catch (deleteError) {
      console.error("Failed to delete conversation from backend:", deleteError);
    }
  };

  const clearHistory = async () => {
    setConversations([]);
    setCurrentConversationId(null);
    setMessages([]);
    setIngredients("");
    setError("");

    try {
      await apiCall("/clear-history", { method: "POST" });
    } catch (clearError) {
      console.error("Failed to clear backend history:", clearError);
    }
  };

  const generateRecipe = async () => {
    const trimmedIngredients = ingredients.trim();
    if (!trimmedIngredients || loading) return;

    const conversationId = currentConversationId ?? String(Date.now());
    const timestamp = new Date().toISOString();
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: trimmedIngredients,
      timestamp,
    };

    const nextMessages = [...messages, userMessage];
    const title = createTitle(trimmedIngredients);

    setCurrentConversationId(conversationId);
    setMessages(nextMessages);
    setIngredients("");
    setLoading(true);
    setError("");
    syncConversation(conversationId, nextMessages, title);

    try {
      const data = await apiCall("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: trimmedIngredients,
          messages: buildConversationPayload(conversationId, title, nextMessages).messages,
        }),
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: data.recipe,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...nextMessages, aiMessage];
      setMessages(updatedMessages);
      syncConversation(conversationId, updatedMessages, title);
      await saveConversationToBackend(conversationId, title, updatedMessages);
    } catch (requestError) {
      console.error("Recipe generation failed:", requestError);
      setError(requestError.message || "Unable to reach the backend right now.");
      await saveConversationToBackend(conversationId, title, nextMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      generateRecipe();
    }
  };

  const activeConversationTitle =
    currentConversationId &&
    conversations.find((conversation) => conversation.id === currentConversationId)?.title;

  const themeStyle = {
    "--theme-top": MECHANICAL_OMINOUS_COLD_THEME.backgroundTop,
    "--theme-bottom": MECHANICAL_OMINOUS_COLD_THEME.backgroundBottom,
    "--theme-center": MECHANICAL_OMINOUS_COLD_THEME.backgroundCenter,
    "--accent": MECHANICAL_OMINOUS_COLD_THEME.accent,
    "--accent-strong": MECHANICAL_OMINOUS_COLD_THEME.accentStrong,
    "--accent-cool": MECHANICAL_OMINOUS_COLD_THEME.accentCool,
    "--text-muted": MECHANICAL_OMINOUS_COLD_THEME.textMuted,
    "--glow-warm": MECHANICAL_OMINOUS_COLD_THEME.glowWarm,
    "--glow-cool": MECHANICAL_OMINOUS_COLD_THEME.glowCool,
  };

  return (
    <div
      className={`app-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}
      style={themeStyle}
    >
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div>
            <p className="sidebar-kicker">Recipe workspace</p>
            <h1 className="sidebar-title">Chef AI</h1>
          </div>
          <button
            className="icon-btn mobile-only"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            type="button"
          >
            <MenuIcon />
          </button>
        </div>

        <button className="new-chat-btn" onClick={startNewConversation} type="button">
          <PlusIcon />
          <span className="new-chat-label">New chat</span>
        </button>

        <div className="history-section">
          <div className="history-header">
            <span>Recent chats</span>
            {conversations.length > 0 ? (
              <button className="clear-history-btn" onClick={clearHistory} type="button">
                Clear all
              </button>
            ) : null}
          </div>

          <div className="history-list">
            {conversations.length === 0 ? (
              <div className="empty-history">Saved recipe chats will show up here.</div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`history-item ${
                    conversation.id === currentConversationId ? "active" : ""
                  }`}
                >
                  <button
                    className="history-main"
                    onClick={() => loadConversation(conversation.id)}
                    type="button"
                  >
                    <span className="history-title">{conversation.title}</span>
                    <span className="history-time">{formatTime(conversation.updatedAt)}</span>
                  </button>
                  <button
                    className="history-delete"
                    onClick={() => deleteConversation(conversation.id)}
                    aria-label={`Delete conversation ${conversation.title}`}
                    title="Delete conversation"
                    type="button"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {sidebarOpen && window.innerWidth <= MOBILE_BREAKPOINT ? (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-side">
            <button
              className="icon-btn"
              onClick={() => setSidebarOpen((previous) => !previous)}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              type="button"
            >
              <MenuIcon />
            </button>
          </div>

          <div className="topbar-center">
            <p className="brand-title">CHEF ASSISTANT</p>
            <h2 className="chat-name">{activeConversationTitle || "New recipe chat"}</h2>
          </div>

          <div className="topbar-side topbar-side-end">
            <div className="status-pill">Chef Online</div>
          </div>
        </header>

        <section className="chat-panel">
          <div className="chat-suggestions-bar">
            <div className="chat-suggestions-track">
              {SUGGESTIONS.map((prompt) => (
                <button
                  key={`bar-${prompt}`}
                  className="suggestion-chip suggestion-chip-bar"
                  onClick={() => setIngredients(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
              {SUGGESTIONS.map((prompt) => (
                <button
                  key={`bar-${prompt}-duplicate`}
                  className="suggestion-chip suggestion-chip-bar"
                  onClick={() => setIngredients(prompt)}
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {messages.length === 0 && !loading ? (
            <div className="empty-state">
              <h3>Turn a list of ingredients into a complete recipe conversation.</h3>
              <p>
                Ask for quick dinners, meal-prep ideas, calorie goals, or follow-up tweaks in the
                same chat.
              </p>
            </div>
          ) : null}

          <div className="messages">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`message-row ${message.type === "user" ? "user-row" : "ai-row"}`}
              >
                <div
                  className={`message-bubble ${
                    message.type === "user" ? "user-bubble" : "ai-bubble"
                  }`}
                >
                  <div className="message-text">{message.content}</div>
                  <div className="message-meta">
                    <span>{formatTime(message.timestamp)}</span>
                    {message.type === "ai" ? (
                      <button
                        className="copy-btn"
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        type="button"
                      >
                        Copy
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}

            {loading ? (
              <article className="message-row ai-row">
                <div className="message-bubble ai-bubble loading-bubble">
                  <div className="typing">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                  <span>{LOADER_TEXTS[loadingTextIndex]}</span>
                </div>
              </article>
            ) : null}

            {error ? (
              <article className="message-row ai-row">
                <div className="message-bubble ai-bubble error-bubble">{error}</div>
              </article>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="composer">
            <div className="composer-shell">
              <input
                type="text"
                value={ingredients}
                onChange={(event) => setIngredients(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask for a recipe with your ingredients..."
                autoComplete="off"
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={generateRecipe}
                disabled={loading || !ingredients.trim()}
                aria-label="Send recipe request"
                type="button"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <p className="footer-copy">Copyright © 2026 Chef Assistant</p>
          <p className="footer-note">
            Chef AI can make mistakes. Double-check allergens, temperatures, and
            substitutions.
          </p>
        </footer>
      </main>
    </div>
  );
}
