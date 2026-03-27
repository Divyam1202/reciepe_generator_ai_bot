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

const TIME_THEMES = [
  {
    bgPage: "#f5f0ff",
    bgPanel: "#ffffff",
    bgPanelStrong: "#f3ecff",
    bgCard: "#f7f3ff",
    bgCardHover: "#efe7ff",
    navSurface: "#ede4ff",
    navSurfaceStrong: "#e4d8ff",
    textMain: "#2d2447",
    textMuted: "#7d73a3",
    borderSoft: "rgba(122, 99, 169, 0.16)",
    borderStrong: "rgba(122, 99, 169, 0.26)",
    accent: "#8d7cff",
    accentStrong: "#ff8fa9",
    accentCool: "#7ed8cf",
    themeTop: "rgba(141, 124, 255, 0.18)",
    themeBottom: "rgba(255, 143, 169, 0.14)",
    themeCenter: "rgba(126, 216, 207, 0.05)",
    glowWarm: "rgba(255, 143, 169, 0.08)",
    glowCool: "rgba(126, 216, 207, 0.08)",
  },
  {
    bgPage: "#efeaff",
    bgPanel: "#faf7ff",
    bgPanelStrong: "#eee7ff",
    bgCard: "#f3edff",
    bgCardHover: "#ebe3ff",
    navSurface: "#e8defd",
    navSurfaceStrong: "#ddd0fb",
    textMain: "#30284b",
    textMuted: "#7f77a0",
    borderSoft: "rgba(111, 91, 160, 0.16)",
    borderStrong: "rgba(111, 91, 160, 0.26)",
    accent: "#8d7cff",
    accentStrong: "#ff88a3",
    accentCool: "#79d0c6",
    themeTop: "rgba(141, 124, 255, 0.16)",
    themeBottom: "rgba(255, 136, 163, 0.13)",
    themeCenter: "rgba(121, 208, 198, 0.045)",
    glowWarm: "rgba(255, 136, 163, 0.075)",
    glowCool: "rgba(121, 208, 198, 0.075)",
  },
  {
    bgPage: "#e7e2fb",
    bgPanel: "#f2edff",
    bgPanelStrong: "#e5ddfb",
    bgCard: "#ebe4ff",
    bgCardHover: "#e0d8fb",
    navSurface: "#ddd4f7",
    navSurfaceStrong: "#d3c8f2",
    textMain: "#332b4d",
    textMuted: "#7b7398",
    borderSoft: "rgba(94, 80, 139, 0.16)",
    borderStrong: "rgba(94, 80, 139, 0.26)",
    accent: "#8a79f0",
    accentStrong: "#ff819d",
    accentCool: "#70c8bf",
    themeTop: "rgba(138, 121, 240, 0.15)",
    themeBottom: "rgba(255, 129, 157, 0.12)",
    themeCenter: "rgba(112, 200, 191, 0.04)",
    glowWarm: "rgba(255, 129, 157, 0.07)",
    glowCool: "rgba(112, 200, 191, 0.07)",
  },
  {
    bgPage: "#d9d3f0",
    bgPanel: "#e7e1fa",
    bgPanelStrong: "#d9d0f0",
    bgCard: "#ddd5f4",
    bgCardHover: "#d0c7e8",
    navSurface: "#cfc4e7",
    navSurfaceStrong: "#c1b3de",
    textMain: "#342d4b",
    textMuted: "#776f8f",
    borderSoft: "rgba(83, 70, 122, 0.17)",
    borderStrong: "rgba(83, 70, 122, 0.28)",
    accent: "#8573df",
    accentStrong: "#ff7a98",
    accentCool: "#68beb5",
    themeTop: "rgba(133, 115, 223, 0.14)",
    themeBottom: "rgba(255, 122, 152, 0.11)",
    themeCenter: "rgba(104, 190, 181, 0.035)",
    glowWarm: "rgba(255, 122, 152, 0.065)",
    glowCool: "rgba(104, 190, 181, 0.065)",
  },
  {
    bgPage: "#2a2440",
    bgPanel: "#302947",
    bgPanelStrong: "#37304f",
    bgCard: "#3b3455",
    bgCardHover: "#463e63",
    navSurface: "#241f39",
    navSurfaceStrong: "#1f1a31",
    textMain: "#f4efff",
    textMuted: "#b0a6cf",
    borderSoft: "rgba(226, 215, 255, 0.12)",
    borderStrong: "rgba(226, 215, 255, 0.22)",
    accent: "#b9adff",
    accentStrong: "#ff8ca8",
    accentCool: "#7dd2c8",
    themeTop: "rgba(185, 173, 255, 0.13)",
    themeBottom: "rgba(255, 140, 168, 0.1)",
    themeCenter: "rgba(125, 210, 200, 0.03)",
    glowWarm: "rgba(255, 140, 168, 0.06)",
    glowCool: "rgba(125, 210, 200, 0.055)",
  },
  {
    bgPage: "#211c35",
    bgPanel: "#27213d",
    bgPanelStrong: "#2d2644",
    bgCard: "#322b4a",
    bgCardHover: "#3a3155",
    navSurface: "#1b172d",
    navSurfaceStrong: "#171326",
    textMain: "#f6f2ff",
    textMuted: "#aba1ca",
    borderSoft: "rgba(225, 216, 255, 0.11)",
    borderStrong: "rgba(225, 216, 255, 0.2)",
    accent: "#b7a8ff",
    accentStrong: "#ff89a6",
    accentCool: "#77c8c0",
    themeTop: "rgba(183, 168, 255, 0.12)",
    themeBottom: "rgba(255, 137, 166, 0.095)",
    themeCenter: "rgba(119, 200, 192, 0.028)",
    glowWarm: "rgba(255, 137, 166, 0.055)",
    glowCool: "rgba(119, 200, 192, 0.05)",
  },
  {
    bgPage: "#181426",
    bgPanel: "#1e1930",
    bgPanelStrong: "#241d38",
    bgCard: "#2a2240",
    bgCardHover: "#31284a",
    navSurface: "#141021",
    navSurfaceStrong: "#100d1a",
    textMain: "#f7f3ff",
    textMuted: "#a69cc4",
    borderSoft: "rgba(225, 216, 255, 0.1)",
    borderStrong: "rgba(225, 216, 255, 0.18)",
    accent: "#b19fff",
    accentStrong: "#ff85a3",
    accentCool: "#72c0b8",
    themeTop: "rgba(177, 159, 255, 0.11)",
    themeBottom: "rgba(255, 133, 163, 0.09)",
    themeCenter: "rgba(114, 192, 184, 0.024)",
    glowWarm: "rgba(255, 133, 163, 0.05)",
    glowCool: "rgba(114, 192, 184, 0.045)",
  },
  {
    bgPage: "#100d18",
    bgPanel: "#151120",
    bgPanelStrong: "#1a1527",
    bgCard: "#20192f",
    bgCardHover: "#281f3a",
    navSurface: "#0c0914",
    navSurfaceStrong: "#08060f",
    textMain: "#faf7ff",
    textMuted: "#9d94ba",
    borderSoft: "rgba(225, 216, 255, 0.09)",
    borderStrong: "rgba(225, 216, 255, 0.16)",
    accent: "#ad99ff",
    accentStrong: "#ff7e9e",
    accentCool: "#6cb8b0",
    themeTop: "rgba(173, 153, 255, 0.1)",
    themeBottom: "rgba(255, 126, 158, 0.085)",
    themeCenter: "rgba(108, 184, 176, 0.02)",
    glowWarm: "rgba(255, 126, 158, 0.045)",
    glowCool: "rgba(108, 184, 176, 0.04)",
  },
];

const getTimeTheme = () => TIME_THEMES[Math.floor(new Date().getHours() / 3)];

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
  const [timeTheme, setTimeTheme] = useState(getTimeTheme);
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeTheme(getTimeTheme());
    }, 60000);

    return () => window.clearInterval(interval);
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
    "--bg-page": "#050505",
    "--bg-panel": "#101014",
    "--bg-panel-strong": "#15151c",
    "--bg-card": "#181820",
    "--bg-card-hover": "#20202a",
    "--nav-surface": "#0d0d12",
    "--nav-surface-strong": "#12121a",
    "--text-main": timeTheme.textMain,
    "--text-muted": timeTheme.textMuted,
    "--border-soft": timeTheme.borderSoft,
    "--border-strong": timeTheme.borderStrong,
    "--theme-top": timeTheme.themeTop,
    "--theme-bottom": timeTheme.themeBottom,
    "--theme-center": timeTheme.themeCenter,
    "--accent": timeTheme.accent,
    "--accent-strong": timeTheme.accentStrong,
    "--accent-cool": timeTheme.accentCool,
    "--glow-warm": timeTheme.glowWarm,
    "--glow-cool": timeTheme.glowCool,
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

          <div
            className={`messages ${
              messages.length === 0 && !loading && !error ? "messages-empty" : ""
            }`}
          >
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
