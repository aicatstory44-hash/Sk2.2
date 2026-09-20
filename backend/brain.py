# ============================================================
# SK AI - Brain
# ============================================================

from providers import (
    ask_provider,
    get_provider_status,
    reload_providers
)


# ============================================================
# SK IDENTITY
# ============================================================

SK_NAME = "SK"
SK_VERSION = "2.2"
SK_CREATOR = "Abdul Rasheed Zahid"
CREATOR_WHATSAPP = "https://wa.me/923354405110"


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = f"""
You are {SK_NAME}, an AI personal assistant.

OFFICIAL IDENTITY
-----------------
Name: SK
Version: SK {SK_VERSION}
Creator: {SK_CREATOR}

Creator WhatsApp:
{CREATOR_WHATSAPP}


IDENTITY RULES
--------------

If the user asks who you are:

"I am SK {SK_VERSION}, an AI personal assistant created by Abdul Rasheed Zahid."

If the user asks about your version:

"I am SK {SK_VERSION}."

If the user asks who created you:

"SK was created by Abdul Rasheed Zahid."

If the user asks about your creator and version:

"I am SK {SK_VERSION}, created by Abdul Rasheed Zahid."


CREATOR CONTACT RULE
--------------------

If the user asks to contact your creator, asks for your creator's
WhatsApp, asks for Abdul Rasheed Zahid's contact, or says something
similar to:

"I want to contact your creator"
"How can I contact your creator?"
"Give me your creator's number"
"Creator WhatsApp"
"How do I contact Abdul Rasheed Zahid?"

Respond naturally:

"Sure. You can contact my creator, Abdul Rasheed Zahid, directly on WhatsApp."

The frontend will automatically create the WhatsApp contact button.

IMPORTANT:
Do NOT say that direct contact information is unavailable.

Do NOT suggest LinkedIn or GitHub when the user specifically asks
for the creator's contact.

Do NOT expose internal provider information.


LANGUAGES
---------

You can communicate naturally in:

English
Urdu
Roman Urdu
Hindi
Arabic
Chinese
Japanese
Spanish
German
Russian


GENERAL RULES
-------------

1. Reply in the same language as the user whenever possible.

2. Keep simple answers short and natural.

3. Explain technical questions clearly.

4. When code is requested, provide complete working code.

5. Never claim an action was completed if it was not actually performed.

6. Never expose:
   - API keys
   - passwords
   - tokens
   - private credentials
   - provider key indexes
   - internal model routing
   - cooldown information
   - technical provider metadata

7. Never return JSON for a normal user question.

8. Never return Python dictionaries as a user-facing answer.

9. Never include:
   success:
   provider:
   key_index:
   model:
   reply:

10. Return only the natural answer intended for the user.

11. Be helpful, polite, concise and honest.
"""


# ============================================================
# BUILD PROMPT
# ============================================================

def build_prompt(message, conversation=None):

    conversation_text = ""

    if conversation:

        for item in conversation:

            if not isinstance(item, dict):
                continue

            role = item.get("role", "user")
            content = item.get("content", "")

            if not content:
                continue

            if role == "assistant":
                conversation_text += f"SK: {content}\n"
            else:
                conversation_text += f"User: {content}\n"

    return f"""
{SYSTEM_PROMPT}

==================================================
CONVERSATION HISTORY
==================================================

{conversation_text}

==================================================
CURRENT USER MESSAGE
==================================================

User: {message}

==================================================
FINAL ANSWER
==================================================

Give ONLY the natural-language answer for the user.

Do NOT return JSON.
Do NOT return a Python dictionary.
Do NOT return technical metadata.
Do NOT mention AI providers.
Do NOT mention API keys.
Do NOT mention model names.

SK:
"""


# ============================================================
# CLEAN PROVIDER RESPONSE
# ============================================================

def clean_provider_response(response):

    if isinstance(response, dict):

        if "reply" in response:

            reply = response.get("reply")

            if reply is not None:
                return str(reply).strip()

        for key in ("response", "text", "content", "message"):

            if key in response:

                value = response.get(key)

                if value is not None:
                    return str(value).strip()

        return "Sorry, I received an invalid AI response."

    if isinstance(response, str):

        return response.strip()

    return str(response).strip()


# ============================================================
# ASK AI
# ============================================================

def ask_ai(message, conversation=None):

    if not message:
        return "Please enter a message."

    try:

        prompt = build_prompt(
            message,
            conversation
        )

        provider_response = ask_provider(prompt)

        if provider_response is None:

            return (
                "Sorry, all configured AI providers are currently "
                "unavailable. Please try again in a moment."
            )

        response = clean_provider_response(
            provider_response
        )

        if not response:

            return (
                "Sorry, I received an empty response from the AI provider."
            )

        return response

    except Exception as error:

        print("AI ERROR:", str(error))

        return (
            "Sorry, I could not process your request right now. "
            "Please try again."
        )


# ============================================================
# BRAIN STATUS
# ============================================================

def brain_status():

    try:

        status = get_provider_status()

        return {
            "online": True,
            "assistant": SK_NAME,
            "version": SK_VERSION,
            "providers": status
        }

    except Exception as error:

        return {
            "online": False,
            "assistant": SK_NAME,
            "version": SK_VERSION,
            "error": str(error)
        }


# ============================================================
# RELOAD PROVIDERS
# ============================================================

def reload_ai_providers():

    try:

        return reload_providers()

    except Exception as error:

        return {
            "success": False,
            "error": str(error)
        }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    print("=" * 50)
    print("SK AI BRAIN TEST")
    print("=" * 50)

    result = ask_ai(
        "Who created you?"
    )

    print()
    print("SK:")
    print(result)

    print()
    print("=" * 50)