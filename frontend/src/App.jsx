import { useEffect, useRef, useState } from "react";
import "./index.css";
import { apiCall } from "./api";

const STORAGE_KEY = "chef-ai-history";
const MOBILE_BREAKPOINT = 900;
const DEFAULT_CHAT_TITLE = "New recipe chat";

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
    bgPage: "#fff2e8",
    bgPanel: "#fff8f1",
    bgPanelStrong: "#ffe5cf",
    bgCard: "#fff0e2",
    bgCardHover: "#ffe6d0",
    navSurface: "#ffd2ae",
    navSurfaceStrong: "#ffbe8b",
    textMain: "#3b2314",
    textMuted: "#8c6248",
    borderSoft: "rgba(255, 109, 0, 0.16)",
    borderStrong: "rgba(255, 109, 0, 0.28)",
    accent: "#0d6efd",
    accentStrong: "#ff6d00",
    accentCool: "#16b7ff",
    themeTop: "rgba(255, 109, 0, 0.22)",
    themeBottom: "rgba(13, 110, 253, 0.14)",
    themeCenter: "rgba(22, 183, 255, 0.08)",
    glowWarm: "rgba(255, 109, 0, 0.11)",
    glowCool: "rgba(22, 183, 255, 0.11)",
  },
  {
    bgPage: "#eef8ff",
    bgPanel: "#f8fcff",
    bgPanelStrong: "#d7efff",
    bgCard: "#e6f6ff",
    bgCardHover: "#d7eeff",
    navSurface: "#c3e6ff",
    navSurfaceStrong: "#a5d9ff",
    textMain: "#0f2940",
    textMuted: "#56758e",
    borderSoft: "rgba(0, 170, 255, 0.16)",
    borderStrong: "rgba(0, 170, 255, 0.28)",
    accent: "#1597ff",
    accentStrong: "#ff7a00",
    accentCool: "#4cc9ff",
    themeTop: "rgba(21, 151, 255, 0.2)",
    themeBottom: "rgba(255, 122, 0, 0.12)",
    themeCenter: "rgba(76, 201, 255, 0.08)",
    glowWarm: "rgba(255, 122, 0, 0.09)",
    glowCool: "rgba(76, 201, 255, 0.11)",
  },
  {
    bgPage: "#fff1e4",
    bgPanel: "#fff8f0",
    bgPanelStrong: "#ffe1c2",
    bgCard: "#ffe9d5",
    bgCardHover: "#ffdcc0",
    navSurface: "#ffcb97",
    navSurfaceStrong: "#ffb468",
    textMain: "#3d220b",
    textMuted: "#8c613b",
    borderSoft: "rgba(255, 123, 0, 0.17)",
    borderStrong: "rgba(255, 123, 0, 0.3)",
    accent: "#0ea5ff",
    accentStrong: "#ff7b00",
    accentCool: "#38bdf8",
    themeTop: "rgba(255, 123, 0, 0.24)",
    themeBottom: "rgba(14, 165, 255, 0.13)",
    themeCenter: "rgba(56, 189, 248, 0.07)",
    glowWarm: "rgba(255, 123, 0, 0.11)",
    glowCool: "rgba(56, 189, 248, 0.1)",
  },
  {
    bgPage: "#e8f6ff",
    bgPanel: "#f4fbff",
    bgPanelStrong: "#d0edff",
    bgCard: "#dcf3ff",
    bgCardHover: "#c9ebff",
    navSurface: "#b4e2ff",
    navSurfaceStrong: "#8ed3ff",
    textMain: "#0e2741",
    textMuted: "#4f7290",
    borderSoft: "rgba(34, 197, 255, 0.16)",
    borderStrong: "rgba(34, 197, 255, 0.28)",
    accent: "#22c5ff",
    accentStrong: "#ff8a00",
    accentCool: "#0f7fff",
    themeTop: "rgba(34, 197, 255, 0.22)",
    themeBottom: "rgba(255, 138, 0, 0.12)",
    themeCenter: "rgba(15, 127, 255, 0.08)",
    glowWarm: "rgba(255, 138, 0, 0.08)",
    glowCool: "rgba(15, 127, 255, 0.11)",
  },
  {
    bgPage: "#09111f",
    bgPanel: "#0e1829",
    bgPanelStrong: "#14223a",
    bgCard: "#162640",
    bgCardHover: "#1c3150",
    navSurface: "#081424",
    navSurfaceStrong: "#06101d",
    textMain: "#eaf7ff",
    textMuted: "#7ca0bb",
    borderSoft: "rgba(0, 191, 255, 0.18)",
    borderStrong: "rgba(0, 191, 255, 0.3)",
    accent: "#22c5ff",
    accentStrong: "#ff7a00",
    accentCool: "#0ea5ff",
    themeTop: "rgba(255, 122, 0, 0.18)",
    themeBottom: "rgba(34, 197, 255, 0.16)",
    themeCenter: "rgba(14, 165, 255, 0.08)",
    glowWarm: "rgba(255, 122, 0, 0.1)",
    glowCool: "rgba(14, 165, 255, 0.13)",
  },
  {
    bgPage: "#07101b",
    bgPanel: "#0d1725",
    bgPanelStrong: "#112033",
    bgCard: "#15243a",
    bgCardHover: "#1c2d47",
    navSurface: "#08111d",
    navSurfaceStrong: "#050d18",
    textMain: "#edf7ff",
    textMuted: "#8aa4ba",
    borderSoft: "rgba(34, 197, 255, 0.16)",
    borderStrong: "rgba(34, 197, 255, 0.26)",
    accent: "#38bdf8",
    accentStrong: "#ff8a00",
    accentCool: "#60a5fa",
    themeTop: "rgba(56, 189, 248, 0.14)",
    themeBottom: "rgba(255, 138, 0, 0.14)",
    themeCenter: "rgba(96, 165, 250, 0.08)",
    glowWarm: "rgba(255, 138, 0, 0.09)",
    glowCool: "rgba(96, 165, 250, 0.1)",
  },
  {
    bgPage: "#120d08",
    bgPanel: "#1a120b",
    bgPanelStrong: "#24180e",
    bgCard: "#2b1d10",
    bgCardHover: "#352414",
    navSurface: "#140d07",
    navSurfaceStrong: "#0e0804",
    textMain: "#fff4eb",
    textMuted: "#c19b82",
    borderSoft: "rgba(255, 122, 0, 0.16)",
    borderStrong: "rgba(255, 122, 0, 0.28)",
    accent: "#ff8a00",
    accentStrong: "#22c5ff",
    accentCool: "#0ea5ff",
    themeTop: "rgba(255, 122, 0, 0.18)",
    themeBottom: "rgba(34, 197, 255, 0.12)",
    themeCenter: "rgba(14, 165, 255, 0.07)",
    glowWarm: "rgba(255, 122, 0, 0.11)",
    glowCool: "rgba(14, 165, 255, 0.08)",
  },
  {
    bgPage: "#08101c",
    bgPanel: "#0d1626",
    bgPanelStrong: "#12203a",
    bgCard: "#172744",
    bgCardHover: "#203258",
    navSurface: "#070f1a",
    navSurfaceStrong: "#050b14",
    textMain: "#f3faff",
    textMuted: "#8aa8c5",
    borderSoft: "rgba(14, 165, 255, 0.15)",
    borderStrong: "rgba(14, 165, 255, 0.26)",
    accent: "#60a5fa",
    accentStrong: "#ff7b00",
    accentCool: "#22c5ff",
    themeTop: "rgba(96, 165, 250, 0.16)",
    themeBottom: "rgba(255, 123, 0, 0.11)",
    themeCenter: "rgba(34, 197, 255, 0.07)",
    glowWarm: "rgba(255, 123, 0, 0.08)",
    glowCool: "rgba(34, 197, 255, 0.11)",
  },
];

const getTimeTheme = () => TIME_THEMES[Math.floor(new Date().getHours() / 3)];

const createTitle = (text) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return DEFAULT_CHAT_TITLE;
  return cleaned.length > 34 ? `${cleaned.slice(0, 34)}...` : cleaned;
};

const isRecipeMetaLine = (line) =>
  /^(prep time|cook time|servings|serves|yield|ingredients|instructions|method|directions|storage|variation|variations|serving tips)\b/i.test(
    line,
  );

const cleanTitleCandidate = (line) =>
  line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/^[*-]\s*/, "")
    .trim();

const extractRecipeTitle = (recipeText, fallbackTitle) => {
  const lines = String(recipeText ?? "")
    .split(/\r?\n/)
    .map(cleanTitleCandidate)
    .filter(Boolean);

  for (let index = 0; index < Math.min(lines.length, 10); index += 1) {
    const line = lines[index];
    const inlineTitle = line.match(/^recipe title\s*:\s*(.+)$/i);

    if (inlineTitle?.[1]) {
      return createTitle(inlineTitle[1]);
    }

    if (/^recipe title\s*:?$/i.test(line)) {
      const nextLine = lines
        .slice(index + 1)
        .find((candidate) => !isRecipeMetaLine(candidate) && candidate.length >= 4);

      if (nextLine) {
        return createTitle(nextLine);
      }
    }
  }

  const fallbackCandidate = lines.find(
    (line) =>
      line.length >= 4 &&
      line.length <= 80 &&
      !isRecipeMetaLine(line) &&
      !/^recipe title\s*:?$/i.test(line),
  );

  return fallbackCandidate ? createTitle(fallbackCandidate) : fallbackTitle;
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
  title: conversation.title || DEFAULT_CHAT_TITLE,
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

  const syncConversation = (conversationId, nextMessages, nextTitle, options = {}) => {
    const { forceTitleUpdate = false } = options;
    const timestamp = new Date().toISOString();

    setConversations((previous) => {
      const normalizedId = String(conversationId);
      const existing = previous.find((conversation) => conversation.id === normalizedId);

      if (!existing) {
        return [
          {
            id: normalizedId,
            title: nextTitle || DEFAULT_CHAT_TITLE,
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
              title:
                forceTitleUpdate && nextTitle
                  ? nextTitle
                  : conversation.title || nextTitle || DEFAULT_CHAT_TITLE,
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
    const existingConversation = conversations.find(
      (conversation) => conversation.id === String(conversationId),
    );
    const hadAssistantMessage = messages.some((message) => message.type === "ai");
    const timestamp = new Date().toISOString();
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: trimmedIngredients,
      timestamp,
    };

    const nextMessages = [...messages, userMessage];
    const draftTitle = existingConversation?.title || createTitle(trimmedIngredients);

    setCurrentConversationId(conversationId);
    setMessages(nextMessages);
    setIngredients("");
    setLoading(true);
    setError("");
    syncConversation(conversationId, nextMessages, draftTitle);

    try {
      const data = await apiCall("/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: trimmedIngredients,
          messages: buildConversationPayload(conversationId, draftTitle, nextMessages).messages,
        }),
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: "ai",
        content: data.recipe,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...nextMessages, aiMessage];
      const finalTitle =
        hadAssistantMessage || existingConversation?.title
          ? existingConversation?.title || draftTitle
          : extractRecipeTitle(data.recipe, draftTitle);

      setMessages(updatedMessages);
      syncConversation(conversationId, updatedMessages, finalTitle, {
        forceTitleUpdate: !hadAssistantMessage,
      });
      await saveConversationToBackend(conversationId, finalTitle, updatedMessages);
    } catch (requestError) {
      console.error("Recipe generation failed:", requestError);
      setError(requestError.message || "Unable to reach the backend right now.");
      await saveConversationToBackend(conversationId, draftTitle, nextMessages);
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
    "--bg-page": timeTheme.bgPage,
    "--bg-panel": timeTheme.bgPanel,
    "--bg-panel-strong": timeTheme.bgPanelStrong,
    "--bg-card": timeTheme.bgCard,
    "--bg-card-hover": timeTheme.bgCardHover,
    "--nav-surface": timeTheme.navSurface,
    "--nav-surface-strong": timeTheme.navSurfaceStrong,
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
