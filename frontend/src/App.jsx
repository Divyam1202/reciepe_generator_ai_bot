import { useState, useEffect, useRef } from "react";
import "./App.css";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [ingredients, setIngredients] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
  };

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
  };

  const deleteConversation = (convId, e) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (currentConversationId === convId) {
      startNewConversation();
    }
  };

  const clearAllConversations = () => {
    if (window.confirm("Clear all conversations?")) {
      setConversations([]);
      startNewConversation();
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

            <div ref={messagesEndRef} />
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
