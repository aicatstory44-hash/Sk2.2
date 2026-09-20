# ==========================================
# SK - AI PROVIDERS
# ==========================================
#
# Features:
# - 5 Gemini API keys
# - Gemini 3.8 Flash / 3.6 Flash
# - 4 OpenRouter API keys
# - Automatic round-robin rotation
# - Rate-limit / quota fallback
# - OpenRouter free-model discovery
# - Per-key cooldown
# - Provider status information
#
# ==========================================

import os
import time
import threading
from typing import Optional

import requests
from dotenv import load_dotenv

try:
    from google import genai
except ImportError:
    genai = None


# ==========================================
# LOAD ENVIRONMENT
# ==========================================

load_dotenv()


# ==========================================
# CONSTANTS
# ==========================================

OPENROUTER_MODELS_URL = (
    "https://openrouter.ai/api/v1/models"
)

OPENROUTER_CHAT_URL = (
    "https://openrouter.ai/api/v1/chat/completions"
)

DISCOVERY_CACHE_SECONDS = 300

DEFAULT_COOLDOWN_SECONDS = 60

LONG_COOLDOWN_SECONDS = 300


# ==========================================
# GEMINI DEFAULT MODELS
# ==========================================

DEFAULT_GEMINI_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
]


# ==========================================
# OPENROUTER DEFAULT FALLBACK
# ==========================================

# Used only if free-model discovery cannot
# retrieve the current catalog.

DEFAULT_OPENROUTER_FREE_MODELS = [
    "deepseek/deepseek-v4-flash-0731:free",
]


# ==========================================
# THREAD LOCK
# ==========================================

_lock = threading.Lock()


# ==========================================
# HELPER - ENVIRONMENT VALUE
# ==========================================

def env_value(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


# ==========================================
# GEMINI KEYS
# ==========================================

def load_gemini_keys():

    keys = []

    for number in range(1, 6):

        key = env_value(
            f"GEMINI_API_KEY_{number}"
        )

        if key:
            keys.append({
                "index": number,
                "key": key,
                "model": env_value(
                    f"GEMINI_MODEL_{number}",
                    DEFAULT_GEMINI_MODELS[
                        (number - 1) % len(
                            DEFAULT_GEMINI_MODELS
                        )
                    ]
                )
            })

    # Backward compatibility with old .env
    if not keys:

        old_key = env_value(
            "GEMINI_API_KEY"
        )

        if old_key:

            old_model = env_value(
                "GEMINI_MODEL",
                "gemini-3.8-flash"
            )

            keys.append({
                "index": 1,
                "key": old_key,
                "model": old_model
            })

    return keys


# ==========================================
# OPENROUTER KEYS
# ==========================================

def load_openrouter_keys():

    keys = []

    for number in range(1, 5):

        key = env_value(
            f"OPENROUTER_API_KEY_{number}"
        )

        if key:

            keys.append({
                "index": number,
                "key": key
            })

    # Backward compatibility
    if not keys:

        old_key = env_value(
            "OPENROUTER_API_KEY"
        )

        if old_key:

            keys.append({
                "index": 1,
                "key": old_key
            })

    return keys


# ==========================================
# PROVIDER STATE
# ==========================================

_gemini_keys = load_gemini_keys()

_openrouter_keys = load_openrouter_keys()


_gemini_pointer = 0

_openrouter_pointer = 0


_gemini_clients = {}


_gemini_cooldowns = {}


_openrouter_cooldowns = {}


_openrouter_models_cache = []


_openrouter_models_cache_time = 0


_openrouter_model_pointer = 0


# ==========================================
# TIME / COOLDOWN HELPERS
# ==========================================

def is_on_cooldown(
    cooldowns,
    index
):

    until = cooldowns.get(index, 0)

    return time.time() < until


def set_cooldown(
    cooldowns,
    index,
    seconds
):

    cooldowns[index] = (
        time.time() + seconds
    )


def clear_cooldown(
    cooldowns,
    index
):

    cooldowns.pop(index, None)


# ==========================================
# ERROR CLASSIFICATION
# ==========================================

def is_rate_limit_error(error) -> bool:

    text = str(error).lower()

    keywords = [
        "429",
        "rate limit",
        "rate_limit",
        "quota",
        "resource exhausted",
        "too many requests",
        "limit exceeded",
        "exhausted"
    ]

    return any(
        keyword in text
        for keyword in keywords
    )


def is_auth_error(error) -> bool:

    text = str(error).lower()

    keywords = [
        "401",
        "403",
        "unauthorized",
        "forbidden",
        "invalid api key",
        "api key not valid",
        "authentication"
    ]

    return any(
        keyword in text
        for keyword in keywords
    )


# ==========================================
# GEMINI CLIENT
# ==========================================

def get_gemini_client(provider):

    if genai is None:

        raise RuntimeError(
            "google-genai is not installed."
        )

    index = provider["index"]

    if index not in _gemini_clients:

        _gemini_clients[index] = genai.Client(
            api_key=provider["key"]
        )

    return _gemini_clients[index]


# ==========================================
# GEMINI REQUEST
# ==========================================

def call_gemini(
    provider,
    prompt
):

    client = get_gemini_client(
        provider
    )

    response = client.models.generate_content(
        model=provider["model"],
        contents=prompt
    )

    text = getattr(
        response,
        "text",
        None
    )

    if not text:

        raise RuntimeError(
            "Gemini returned an empty response."
        )

    return text.strip()


# ==========================================
# OPENROUTER FREE MODEL DISCOVERY
# ==========================================

def discover_openrouter_free_models(
    api_key: Optional[str] = None,
    force_refresh: bool = False
):

    global _openrouter_models_cache
    global _openrouter_models_cache_time

    # Use first available key if no key supplied
    if not api_key:

        if not _openrouter_keys:

            return []

        api_key = _openrouter_keys[0]["key"]


    # Cache
    cache_age = (
        time.time()
        - _openrouter_models_cache_time
    )

    if (
        not force_refresh
        and _openrouter_models_cache
        and cache_age < DISCOVERY_CACHE_SECONDS
    ):

        return list(
            _openrouter_models_cache
        )


    headers = {
        "Authorization": (
            f"Bearer {api_key}"
        ),
        "Accept": "application/json"
    }


    response = requests.get(
        OPENROUTER_MODELS_URL,
        headers=headers,
        params={
            "output_modalities": "text",
            "sort": "most-popular"
        },
        timeout=20
    )


    response.raise_for_status()

    payload = response.json()

    models = payload.get(
        "data",
        []
    )


    free_models = []


    for model in models:

        model_id = str(
            model.get("id", "")
        ).strip()

        pricing = model.get(
            "pricing",
            {}
        ) or {}


        prompt_price = str(
            pricing.get(
                "prompt",
                ""
            )
        )

        completion_price = str(
            pricing.get(
                "completion",
                ""
            )
        )


        # OpenRouter free variants normally
        # use :free and zero pricing.
        is_free_suffix = (
            model_id.endswith(":free")
        )


        try:

            prompt_zero = (
                float(prompt_price) == 0
            )

        except Exception:

            prompt_zero = False


        try:

            completion_zero = (
                float(completion_price) == 0
            )

        except Exception:

            completion_zero = False


        is_zero_priced = (
            prompt_zero
            and completion_zero
        )


        if (
            is_free_suffix
            or is_zero_priced
        ):

            architecture = model.get(
                "architecture",
                {}
            ) or {}


            input_modalities = architecture.get(
                "input_modalities",
                []
            )


            output_modalities = architecture.get(
                "output_modalities",
                []
            )


            # We are currently building a
            # normal text-chat provider.
            if (
                "text" not in input_modalities
                and input_modalities
            ):
                continue


            if (
                "text" not in output_modalities
                and output_modalities
            ):
                continue


            free_models.append(
                model_id
            )


    # Remove duplicates while preserving order
    unique_models = list(
        dict.fromkeys(
            free_models
        )
    )


    if unique_models:

        _openrouter_models_cache = (
            unique_models
        )

        _openrouter_models_cache_time = (
            time.time()
        )

        return list(
            unique_models
        )


    # If discovery returned nothing,
    # use known fallback.
    return list(
        DEFAULT_OPENROUTER_FREE_MODELS
    )


# ==========================================
# OPENROUTER REQUEST
# ==========================================

def call_openrouter(
    api_key,
    model,
    prompt
):

    headers = {
        "Authorization": (
            f"Bearer {api_key}"
        ),
        "Content-Type": (
            "application/json"
        ),
        "HTTP-Referer": (
            "http://127.0.0.1:5000"
        ),
        "X-Title": "SK AI Assistant"
    }


    body = {

        "model": model,

        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],

        "temperature": 0.7
    }


    response = requests.post(
        OPENROUTER_CHAT_URL,
        headers=headers,
        json=body,
        timeout=60
    )


    if response.status_code >= 400:

        try:
            error_data = (
                response.json()
            )

        except Exception:

            error_data = (
                response.text
            )


        raise RuntimeError(
            f"OpenRouter HTTP "
            f"{response.status_code}: "
            f"{error_data}"
        )


    data = response.json()


    choices = data.get(
        "choices",
        []
    )


    if not choices:

        raise RuntimeError(
            "OpenRouter returned no choices."
        )


    message = choices[0].get(
        "message",
        {}
    )


    content = message.get(
        "content"
    )


    if not content:

        raise RuntimeError(
            "OpenRouter returned empty content."
        )


    return str(content).strip()


# ==========================================
# GEMINI ROUND ROBIN
# ==========================================

def try_gemini_providers(
    prompt
):

    global _gemini_pointer

    if not _gemini_keys:

        return None


    total = len(
        _gemini_keys
    )


    for attempt in range(total):

        with _lock:

            position = (
                _gemini_pointer
                % total
            )

            provider = (
                _gemini_keys[position]
            )

            _gemini_pointer = (
                _gemini_pointer + 1
            )


        index = provider["index"]


        if is_on_cooldown(
            _gemini_cooldowns,
            index
        ):

            continue


        try:

            result = call_gemini(
                provider,
                prompt
            )


            clear_cooldown(
                _gemini_cooldowns,
                index
            )


            return {
                "success": True,
                "provider": "gemini",
                "key_index": index,
                "model": provider["model"],
                "reply": result
            }


        except Exception as error:

            print(
                f"[Gemini {index}] "
                f"Failed: {error}"
            )


            if is_rate_limit_error(
                error
            ):

                set_cooldown(
                    _gemini_cooldowns,
                    index,
                    DEFAULT_COOLDOWN_SECONDS
                )

            elif is_auth_error(
                error
            ):

                set_cooldown(
                    _gemini_cooldowns,
                    index,
                    LONG_COOLDOWN_SECONDS
                )


    return None


# ==========================================
# OPENROUTER ROUND ROBIN
# ==========================================

def try_openrouter_providers(
    prompt
):

    global _openrouter_pointer
    global _openrouter_model_pointer

    if not _openrouter_keys:

        return None


    # Discover current free models
    try:

        free_models = (
            discover_openrouter_free_models()
        )

    except Exception as error:

        print(
            "OpenRouter model discovery failed:",
            error
        )

        free_models = list(
            DEFAULT_OPENROUTER_FREE_MODELS
        )


    if not free_models:

        return None


    total_keys = len(
        _openrouter_keys
    )


    total_models = len(
        free_models
    )


    # Try every configured key.
    for key_attempt in range(
        total_keys
    ):

        with _lock:

            key_position = (
                _openrouter_pointer
                % total_keys
            )

            provider = (
                _openrouter_keys[
                    key_position
                ]
            )

            _openrouter_pointer = (
                _openrouter_pointer + 1
            )


        key_index = provider["index"]


        if is_on_cooldown(
            _openrouter_cooldowns,
            key_index
        ):

            continue


        # Try every discovered free model
        # for this API key.
        for model_attempt in range(
            total_models
        ):

            with _lock:

                model_position = (
                    _openrouter_model_pointer
                    % total_models
                )

                model = (
                    free_models[
                        model_position
                    ]
                )

                _openrouter_model_pointer = (
                    _openrouter_model_pointer
                    + 1
                )


            try:

                result = call_openrouter(
                    provider["key"],
                    model,
                    prompt
                )


                clear_cooldown(
                    _openrouter_cooldowns,
                    key_index
                )


                return {
                    "success": True,
                    "provider": "openrouter",
                    "key_index": key_index,
                    "model": model,
                    "reply": result
                }


            except Exception as error:

                print(
                    f"[OpenRouter "
                    f"Key {key_index}] "
                    f"[{model}] "
                    f"Failed: {error}"
                )


                if is_rate_limit_error(
                    error
                ):

                    # Rate limit this key
                    # temporarily.
                    set_cooldown(
                        _openrouter_cooldowns,
                        key_index,
                        DEFAULT_COOLDOWN_SECONDS
                    )

                    # Move to next key.
                    break


                elif is_auth_error(
                    error
                ):

                    set_cooldown(
                        _openrouter_cooldowns,
                        key_index,
                        LONG_COOLDOWN_SECONDS
                    )

                    # Invalid key should not
                    # keep trying models.
                    break


                # Other model-specific errors:
                # continue to next free model.


    return None


# ==========================================
# MAIN PROVIDER FUNCTION
# ==========================================

def ask_provider(
    prompt
):

    prompt = str(
        prompt or ""
    ).strip()


    if not prompt:

        return {
            "success": False,
            "error": "Empty prompt."
        }


    # ======================================
    # 1. GEMINI
    # ======================================

    result = try_gemini_providers(
        prompt
    )


    if result:

        return result


    # ======================================
    # 2. OPENROUTER
    # ======================================

    result = try_openrouter_providers(
        prompt
    )


    if result:

        return result


    # ======================================
    # NOTHING AVAILABLE
    # ======================================

    return {

        "success": False,

        "provider": None,

        "model": None,

        "reply": None,

        "error": (
            "All configured AI providers "
            "are currently unavailable."
        )
    }


# ==========================================
# SIMPLE ASK FUNCTION
# ==========================================

def ask(
    prompt
):

    result = ask_provider(
        prompt
    )


    if result.get("success"):

        return result["reply"]


    raise RuntimeError(
        result.get(
            "error",
            "AI providers unavailable."
        )
    )


# ==========================================
# FREE MODEL LIST
# ==========================================

def get_free_models(
    force_refresh=False
):

    try:

        return discover_openrouter_free_models(
            force_refresh=force_refresh
        )

    except Exception as error:

        print(
            "Free model discovery error:",
            error
        )

        return list(
            DEFAULT_OPENROUTER_FREE_MODELS
        )


# ==========================================
# PROVIDER STATUS
# ==========================================

def get_provider_status():

    free_models = []

    try:

        free_models = (
            get_free_models()
        )

    except Exception:
        pass


    gemini_status = []


    for provider in _gemini_keys:

        index = provider["index"]

        gemini_status.append({

            "key": index,

            "model": provider["model"],

            "configured": True,

            "cooldown": is_on_cooldown(
                _gemini_cooldowns,
                index
            )

        })


    openrouter_status = []


    for provider in _openrouter_keys:

        index = provider["index"]

        openrouter_status.append({

            "key": index,

            "configured": True,

            "cooldown": is_on_cooldown(
                _openrouter_cooldowns,
                index
            )

        })


    return {

        "gemini": {

            "configured_keys": len(
                _gemini_keys
            ),

            "keys": gemini_status

        },

        "openrouter": {

            "configured_keys": len(
                _openrouter_keys
            ),

            "keys": openrouter_status,

            "free_models_count": len(
                free_models
            ),

            "free_models": free_models

        }

    }


# ==========================================
# RELOAD PROVIDERS
# ==========================================

def reload_providers():

    global _gemini_keys
    global _openrouter_keys

    global _gemini_pointer
    global _openrouter_pointer

    global _openrouter_models_cache
    global _openrouter_models_cache_time
    global _openrouter_model_pointer


    _gemini_keys = load_gemini_keys()

    _openrouter_keys = (
        load_openrouter_keys()
    )


    _gemini_pointer = 0

    _openrouter_pointer = 0

    _openrouter_model_pointer = 0

    _openrouter_models_cache = []

    _openrouter_models_cache_time = 0


    _gemini_clients.clear()

    _gemini_cooldowns.clear()

    _openrouter_cooldowns.clear()


# ==========================================
# TEST
# ==========================================

if __name__ == "__main__":

    print("=" * 60)
    print("SK AI PROVIDER SYSTEM")
    print("=" * 60)

    print()

    print(
        "Gemini keys:",
        len(_gemini_keys)
    )

    for provider in _gemini_keys:

        print(
            f"  Gemini {provider['index']}: "
            f"{provider['model']}"
        )


    print()

    print(
        "OpenRouter keys:",
        len(_openrouter_keys)
    )

    for provider in _openrouter_keys:

        print(
            f"  OpenRouter {provider['index']}: "
            "Configured"
        )


    print()

    print(
        "Discovering OpenRouter free models..."
    )


    try:

        models = (
            discover_openrouter_free_models(
                force_refresh=True
            )
        )


        print(
            f"Free models found: "
            f"{len(models)}"
        )


        for number, model in enumerate(
            models,
            start=1
        ):

            print(
                f"{number}. {model}"
            )


    except Exception as error:

        print(
            "Discovery failed:",
            error
        )


    print()

    print(
        "Provider system ready."
    )

    print("=" * 60)