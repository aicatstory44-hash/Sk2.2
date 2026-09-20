# ============================================================
# SK - Main Flask Backend
# File: backend/app.py
# ============================================================

from flask import (
    Flask,
    jsonify,
    request,
    send_from_directory
)

import os

from brain import ask_ai, brain_status

from memory import (
    get_memories,
    get_memory_count,
    add_memory,
    delete_memory,
    clear_memories,
    get_memory_context,
    memory_status
)


# ============================================================
# APP
# ============================================================

app = Flask(__name__)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FRONTEND_DIR = os.path.abspath(
    os.path.join(BASE_DIR, "..", "frontend")
)


# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():
    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


# ============================================================
# FRONTEND FILES
# ============================================================

@app.route("/<path:filename>")
def frontend_files(filename):
    return send_from_directory(
        FRONTEND_DIR,
        filename
    )


# ============================================================
# API STATUS
# ============================================================

@app.route("/api/status", methods=["GET"])
def api_status():

    try:
        status = brain_status()

    except Exception:
        status = {
            "online": True,
            "assistant": "SK"
        }

    return jsonify({
        "success": True,
        "status": "online",
        "assistant": "SK",
        "brain": status,
        "memory": {
            "enabled": True,
            "count": get_memory_count()
        }
    })


# ============================================================
# MEMORY STATUS
# ============================================================

@app.route("/api/memory", methods=["GET"])
def api_memory():

    memories = get_memories()

    return jsonify({
        "success": True,
        "enabled": True,
        "count": len(memories),
        "memory_count": len(memories),
        "memories": memories
    })


# ============================================================
# ADD MEMORY
# ============================================================

@app.route("/api/memory", methods=["POST"])
def api_add_memory():

    data = request.get_json(silent=True) or {}

    text = str(
        data.get("text", "")
    ).strip()

    category = str(
        data.get("category", "general")
    ).strip()

    approved = data.get(
        "approved",
        False
    )

    # --------------------------------------------------------
    # Explicit approval required
    # --------------------------------------------------------

    if approved is not True:
        return jsonify({
            "success": False,
            "error": "Memory must be explicitly approved before saving."
        }), 400

    result = add_memory(
        text=text,
        category=category
    )

    if not result.get("success"):
        return jsonify(result), 400

    return jsonify(result)


# ============================================================
# DELETE MEMORY
# ============================================================

@app.route("/api/memory/<memory_id>", methods=["DELETE"])
def api_delete_memory(memory_id):

    result = delete_memory(memory_id)

    if not result.get("success"):
        return jsonify(result), 404

    return jsonify(result)


# ============================================================
# CLEAR ALL MEMORIES
# ============================================================

@app.route("/api/memory", methods=["DELETE"])
def api_clear_memory():

    data = request.get_json(silent=True) or {}

    confirm = data.get(
        "confirm",
        False
    )

    if confirm is not True:
        return jsonify({
            "success": False,
            "error": "Confirmation is required to clear all memories."
        }), 400

    result = clear_memories()

    return jsonify(result)


# ============================================================
# MEMORY SEARCH
# ============================================================

@app.route("/api/memory/search", methods=["POST"])
def api_memory_search():

    data = request.get_json(silent=True) or {}

    query = str(
        data.get("query", "")
    ).strip()

    if not query:
        return jsonify({
            "success": False,
            "error": "Search query is required."
        }), 400

    from memory import search_memories

    results = search_memories(
        query,
        limit=8
    )

    return jsonify({
        "success": True,
        "count": len(results),
        "memories": results
    })


# ============================================================
# CHAT
# ============================================================

@app.route("/api/chat", methods=["POST"])
def api_chat():

    data = request.get_json(
        silent=True
    ) or {}

    message = str(
        data.get("message", "")
    ).strip()

    conversation = data.get(
        "conversation",
        []
    )

    # --------------------------------------------------------
    # Validate message
    # --------------------------------------------------------

    if not message:
        return jsonify({
            "success": False,
            "error": "Message is required."
        }), 400

    # --------------------------------------------------------
    # Validate conversation
    # --------------------------------------------------------

    if not isinstance(
        conversation,
        list
    ):
        conversation = []

    # Keep context reasonable
    conversation = conversation[-20:]

    # --------------------------------------------------------
    # Get relevant user-approved memories
    # --------------------------------------------------------

    memory_context = get_memory_context(
        message,
        limit=8
    )

    # --------------------------------------------------------
    # Build AI prompt
    # --------------------------------------------------------

    prompt_parts = []

    if memory_context:

        prompt_parts.append(
            "USER-APPROVED MEMORY\n"
            "The following information was explicitly saved "
            "by the user. Use it only when relevant.\n\n"
            + memory_context
        )

    # --------------------------------------------------------
    # Conversation context
    # --------------------------------------------------------

    if conversation:

        conversation_lines = []

        for item in conversation:

            if not isinstance(
                item,
                dict
            ):
                continue

            role = str(
                item.get("role", "")
            ).strip()

            content = str(
                item.get(
                    "content",
                    item.get(
                        "message",
                        ""
                    )
                )
            ).strip()

            if not content:
                continue

            if role not in (
                "user",
                "assistant"
            ):
                continue

            conversation_lines.append(
                f"{role.upper()}: {content}"
            )

        if conversation_lines:

            prompt_parts.append(
                "RECENT CONVERSATION\n"
                + "\n".join(
                    conversation_lines
                )
            )

    # --------------------------------------------------------
    # Current message
    # --------------------------------------------------------

    prompt_parts.append(
        "CURRENT USER MESSAGE\n"
        + message
    )

    final_prompt = "\n\n".join(
        prompt_parts
    )

    # --------------------------------------------------------
    # Ask SK AI
    # --------------------------------------------------------

    try:

        reply = ask_ai(
            final_prompt,
            conversation=[]
        )

        if not isinstance(
            reply,
            str
        ):
            reply = str(reply)

        reply = reply.strip()

        if not reply:

            reply = (
                "Sorry, I could not generate a response."
            )

        return jsonify({
            "success": True,
            "reply": reply
        })

    except Exception as error:

        print(
            "AI ERROR:",
            error
        )

        return jsonify({
            "success": False,
            "error": "AI service is temporarily unavailable."
        }), 503


# ============================================================
# HEALTH
# ============================================================

@app.route("/health", methods=["GET"])
def health():

    return jsonify({
        "status": "ok",
        "assistant": "SK",
        "memory": memory_status()
    })


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print("=" * 50)
    print("SK AI BACKEND")
    print("=" * 50)
    print("Server starting...")
    print("URL: http://127.0.0.1:5000")
    print("Memory system: ENABLED")
    print("=" * 50)

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )