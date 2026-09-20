# ==========================================
# SK - CONFIGURATION
# ==========================================

import os
from dotenv import load_dotenv


# Load .env file
load_dotenv()


# ==========================================
# APP SETTINGS
# ==========================================

APP_NAME = os.getenv(
    "APP_NAME",
    "SK"
)

SK_DEBUG = os.getenv(
    "SK_DEBUG",
    "false"
).lower() == "true"

SK_HOST = os.getenv(
    "SK_HOST",
    "0.0.0.0"
)

SK_PORT = int(
    os.getenv(
        "SK_PORT",
        "5000"
    )
)


# ==========================================
# GEMINI SETTINGS
# ==========================================

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    ""
).strip()

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash"
).strip()


# ==========================================
# OPENROUTER SETTINGS
# ==========================================

OPENROUTER_API_KEY = os.getenv(
    "OPENROUTER_API_KEY",
    ""
).strip()

OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "deepseek/deepseek-v4-flash-0731:free"
).strip()


# ==========================================
# CONFIG STATUS
# ==========================================

def get_config_status():

    return {
        "app_name": APP_NAME,
        "gemini_configured": bool(GEMINI_API_KEY),
        "gemini_model": GEMINI_MODEL,
        "openrouter_configured": bool(OPENROUTER_API_KEY),
        "openrouter_model": OPENROUTER_MODEL,
        "debug": SK_DEBUG,
        "host": SK_HOST,
        "port": SK_PORT
    }