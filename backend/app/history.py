import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

HISTORY_FILE = Path(__file__).parent.parent / "data" / "history.json"
logger = logging.getLogger(__name__)


def ensure_history_dir():
    """Ensure the history directory exists."""
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)


def _serialize_for_json(value: Any) -> Any:
    """Convert Pydantic models and nested containers into JSON-safe data."""
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, dict):
        return {str(key): _serialize_for_json(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize_for_json(item) for item in value]
    return value


def _reset_corrupted_history_file() -> None:
    """Back up an unreadable history file so the API can recover cleanly."""
    if not HISTORY_FILE.exists():
        return

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = HISTORY_FILE.with_name(f"history.corrupt.{timestamp}.json")
    HISTORY_FILE.replace(backup_path)
    logger.warning("Moved corrupted history file to %s", backup_path)


def load_history():
    """Load all conversations from file."""
    ensure_history_dir()
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
                logger.warning("History file contained %s instead of an object. Resetting.", type(data).__name__)
                _reset_corrupted_history_file()
                return {}
        except Exception as e:
            logger.error("Error loading history: %s", e)
            _reset_corrupted_history_file()
            return {}
    return {}


def save_history(conversations):
    """Save all conversations to file."""
    ensure_history_dir()
    serializable_conversations = _serialize_for_json(conversations)
    temp_file = HISTORY_FILE.with_suffix(".tmp")
    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(serializable_conversations, f, indent=2, ensure_ascii=False)
        temp_file.replace(HISTORY_FILE)
    except Exception as e:
        logger.error("Error saving history: %s", e)
        if temp_file.exists():
            temp_file.unlink(missing_ok=True)
        raise


def save_conversation(conversation_id, title, messages):
    """Save or update a single conversation."""
    conversations = load_history()
    conversations[str(conversation_id)] = {
        "id": str(conversation_id),
        "title": title,
        "messages": _serialize_for_json(messages),
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
