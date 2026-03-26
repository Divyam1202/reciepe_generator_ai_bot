import json
import os
from datetime import datetime
from pathlib import Path

HISTORY_FILE = Path(__file__).parent.parent / "data" / "history.json"


def ensure_history_dir():
    """Ensure the history directory exists."""
    HISTORY_FILE.parent.mkdir(exist_ok=True)


def load_history():
    """Load all conversations from file."""
    ensure_history_dir()
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading history: {e}")
            return {}
    return {}


def save_history(conversations):
    """Save all conversations to file."""
    ensure_history_dir()
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(conversations, f, indent=2)
    except Exception as e:
        print(f"Error saving history: {e}")


def save_conversation(conversation_id, title, messages):
    """Save or update a single conversation."""
    conversations = load_history()
    conversations[str(conversation_id)] = {
        "id": str(conversation_id),
        "title": title,
        "messages": messages,
        "updatedAt": datetime.now().isoformat()
    }
    save_history(conversations)
    return conversations[str(conversation_id)]


def get_conversation(conversation_id):
    """Get a single conversation by ID."""
    conversations = load_history()
    return conversations.get(str(conversation_id))


def delete_conversation(conversation_id):
    """Delete a conversation by ID."""
    conversations = load_history()
    if str(conversation_id) in conversations:
        del conversations[str(conversation_id)]
        save_history(conversations)
        return True
    return False


def get_all_conversations():
    """Get all conversations sorted by updated time (newest first)."""
    conversations = load_history()
    return sorted(
        conversations.values(),
        key=lambda x: x.get("updatedAt", ""),
        reverse=True
    )


def clear_all_history():
    """Clear all conversation history."""
    save_history({})
