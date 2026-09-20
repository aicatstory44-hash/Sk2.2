# ============================================================
# SK - Smart Memory System
# File: backend/memory.py
# ============================================================

import os
import json
import re
import uuid
import threading
from datetime import datetime, timezone


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MEMORY_FILE = os.path.join(DATA_DIR, "memory.json")

os.makedirs(DATA_DIR, exist_ok=True)

LOCK = threading.Lock()


# ============================================================
# MEMORY FILE INITIALIZATION
# ============================================================

def _ensure_memory_file():
    if not os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, "w", encoding="utf-8") as file:
            json.dump([], file, ensure_ascii=False, indent=2)


# ============================================================
# TIME
# ============================================================

def _now():
    return datetime.now(timezone.utc).isoformat()


# ============================================================
# LOAD MEMORIES
# ============================================================

def _load_memories():
    _ensure_memory_file()

    try:
        with open(MEMORY_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)

        if isinstance(data, list):
            return data

        return []

    except (json.JSONDecodeError, OSError):
        return []


# ============================================================
# SAVE MEMORIES TO FILE
# ============================================================

def _save_memories(memories):
    with open(MEMORY_FILE, "w", encoding="utf-8") as file:
        json.dump(
            memories,
            file,
            ensure_ascii=False,
            indent=2
        )


# ============================================================
# SENSITIVE INFORMATION PROTECTION
# ============================================================

SENSITIVE_PATTERNS = [
    r"api[_ -]?key",
    r"api[_ -]?token",
    r"access[_ -]?token",
    r"secret[_ -]?key",
    r"private[_ -]?key",
    r"password",
    r"passcode",
    r"verification[_ -]?code",
    r"otp",
    r"one[- ]time password",
    r"authorization",
    r"bearer\s+[A-Za-z0-9._-]+",
]


def contains_sensitive_information(text):
    if not text:
        return False

    text_lower = text.lower()

    for pattern in SENSITIVE_PATTERNS:
        if re.search(pattern, text_lower):
            return True

    # Common API key style strings
    if re.search(r"\bsk-[A-Za-z0-9]{20,}\b", text):
        return True

    if re.search(r"\bAIza[A-Za-z0-9_-]{20,}\b", text):
        return True

    return False


# ============================================================
# ADD MEMORY
# ============================================================

def add_memory(text, category="general"):
    text = str(text).strip()
    category = str(category).strip() or "general"

    if not text:
        return {
            "success": False,
            "error": "Memory text is empty."
        }

    if len(text) > 1000:
        return {
            "success": False,
            "error": "Memory is too long. Maximum 1000 characters."
        }

    if contains_sensitive_information(text):
        return {
            "success": False,
            "error": "Sensitive credentials or security information cannot be stored."
        }

    with LOCK:
        memories = _load_memories()

        # Prevent exact duplicates
        for memory in memories:
            if memory.get("text", "").strip().lower() == text.lower():
                return {
                    "success": True,
                    "message": "Memory already exists.",
                    "memory": memory
                }

        memory = {
            "id": str(uuid.uuid4()),
            "text": text,
            "category": category,
            "created_at": _now(),
            "updated_at": _now()
        }

        memories.insert(0, memory)

        _save_memories(memories)

        return {
            "success": True,
            "message": "Memory saved successfully.",
            "memory": memory
        }


# ============================================================
# GET ALL MEMORIES
# ============================================================

def get_memories():
    with LOCK:
        memories = _load_memories()

    return memories


# ============================================================
# GET MEMORY COUNT
# ============================================================

def get_memory_count():
    return len(get_memories())


# ============================================================
# DELETE ONE MEMORY
# ============================================================

def delete_memory(memory_id):
    memory_id = str(memory_id).strip()

    if not memory_id:
        return {
            "success": False,
            "error": "Memory ID is required."
        }

    with LOCK:
        memories = _load_memories()

        original_count = len(memories)

        memories = [
            memory
            for memory in memories
            if memory.get("id") != memory_id
        ]

        if len(memories) == original_count:
            return {
                "success": False,
                "error": "Memory not found."
            }

        _save_memories(memories)

    return {
        "success": True,
        "message": "Memory deleted successfully."
    }


# ============================================================
# CLEAR ALL MEMORIES
# ============================================================

def clear_memories():
    with LOCK:
        _save_memories([])

    return {
        "success": True,
        "message": "All memories cleared successfully."
    }


# ============================================================
# SEARCH RELEVANT MEMORIES
# ============================================================

def search_memories(query, limit=8):
    query = str(query or "").strip().lower()

    if not query:
        return []

    query_words = set(
        word
        for word in re.findall(r"[a-zA-Z0-9\u0600-\u06FF]+", query)
        if len(word) >= 2
    )

    if not query_words:
        return []

    memories = get_memories()

    scored = []

    for memory in memories:
        text = memory.get("text", "").lower()

        memory_words = set(
            word
            for word in re.findall(
                r"[a-zA-Z0-9\u0600-\u06FF]+",
                text
            )
            if len(word) >= 2
        )

        common_words = query_words.intersection(memory_words)

        if common_words:
            score = len(common_words)

            scored.append(
                (
                    score,
                    memory
                )
            )

    scored.sort(
        key=lambda item: (
            -item[0],
            item[1].get("updated_at", "")
        )
    )

    return [
        memory
        for _, memory in scored[:limit]
    ]


# ============================================================
# MEMORY CONTEXT FOR AI
# ============================================================

def get_memory_context(query, limit=8):
    memories = search_memories(query, limit)

    if not memories:
        return ""

    lines = []

    for memory in memories:
        text = memory.get("text", "").strip()

        if text:
            lines.append(f"- {text}")

    if not lines:
        return ""

    return "\n".join(lines)


# ============================================================
# MEMORY STATUS
# ============================================================

def memory_status():
    memories = get_memories()

    return {
        "enabled": True,
        "count": len(memories),
        "file": MEMORY_FILE
    }


# ============================================================
# INITIALIZE
# ============================================================

_ensure_memory_file()