"""Utility helpers for JSON serialization, parsing, etc."""

import json
from typing import Any, Optional, List, Dict


def to_json_string(value: Any) -> Optional[str]:
    """Serialize a Python object to a JSON string for SQLite storage."""
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def from_json_string(value: Optional[str]) -> Any:
    """Deserialize a JSON string from SQLite back to a Python object."""
    if value is None or value == "":
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def safe_list(value: Any) -> List[str]:
    """Ensure value is a list of strings."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        parsed = from_json_string(value)
        if isinstance(parsed, list):
            return parsed
    return []


def safe_dict(value: Any) -> Dict[str, Any]:
    """Ensure value is a dict."""
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        parsed = from_json_string(value)
        if isinstance(parsed, dict):
            return parsed
    return {}


# ── Language Detection & Enforcement Helpers ─────────────────────────────────

import re

BANGLISH_WORDS = {
    'amar', 'amr', 'amake', 'amader', 'apnar', 'apnr', 'apnake', 'apnader', 'apni', 'tumi', 'tomar', 'tomake', 'tui', 'tor',
    'shey', 'tar', 'tader', 'ata', 'eta', 'eita', 'oita', 'sheita', 'ei', 'oi',
    'ki', 'koto', 'kivabe', 'kibhabe', 'kemon', 'keno', 'kobe', 'koi', 'kothay', 'kar', 'kon',
    'korte', 'korbo', 'kore', 'kori', 'koro', 'korben', 'kora', 'korechi', 'korchi', 'korle',
    'khete', 'khabo', 'khai', 'khao', 'kheye', 'kheyechi', 'kheyeche', 'kheyechilam', 'khawa',
    'hobe', 'hoye', 'hoy', 'hoyeche', 'hoise', 'hobar', 'hole',
    'lagbe', 'lage', 'lagle',
    'ache', 'achhe', 'ase', 'ashe', 'nai', 'nei',
    'parbo', 'pari', 'paren', 'parbe',
    'bolen', 'bolun', 'bolo', 'bujhte', 'bujhi', 'dekhun', 'dekhan', 'dekhi', 'jante', 'chai', 'dibo', 'den', 'dao', 'dile', 'dilam',
    'shokal', 'shokale', 'dupur', 'dupure', 'bikal', 'bikale', 'shondha', 'shondhay', 'raat', 'rate', 'nasta', 'khabar', 'khabare',
    'bhat', 'macher', 'mach', 'dal', 'torkari', 'shak', 'dim', 'dudh', 'tel', 'pani', 'chal', 'ruti', 'shobji', 'mangsho', 'murgi', 'ilish', 'rui',
    'roktocap', 'roktoshunnota', 'jhuki', 'shustho', 'rogi', 'ashole', 'bepar', 'ojon', 'shorir', 'pet', 'batha', 'ghom', 'ranna', 'pati', 'bati', 'tukra', 'chamoch',
    'kisu', 'kichu', 'ar', 'ebong', 'kintu', 'jodi', 'tobe', 'karone', 'jonno', 'theke', 'por', 'moto', 'moton', 'bhalo', 'kharap', 'thaka', 'thakte',
    'babu', 'baccha', 'bacha', 'shishu', 'daktar', 'doctor', 'khub', 'onek', 'olpo', 'beshi', 'kom',
    'ekhon', 'kokhon', 'shob', 'shobshomoy', 'protidin'
}

ENGLISH_GRAMMAR_WORDS = {
    'the', 'is', 'are', 'was', 'were', 'what', 'how', 'why', 'when', 'where', 'which', 'who', 'whom',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'their', 'our', 'me', 'him', 'them',
    'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might', 'must',
    'do', 'does', 'did', 'have', 'has', 'had', 'having',
    'a', 'an', 'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while',
    'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
    'please', 'tell', 'suggest', 'give', 'recommend', 'show', 'calculate', 'need', 'want'
}


def is_fully_english(text: str) -> bool:
    """
    Check if a text is strictly in English.
    Returns False if text contains Bengali Unicode characters, Banglish words,
    or does not exhibit clear English structural vocabulary.
    """
    if not text or not text.strip():
        return False
    # If contains any Bengali Unicode character (\u0980 - \u09FF)
    if any(0x0980 <= ord(c) <= 0x09FF for c in text):
        return False
    tokens = [w.lower() for w in re.findall(r'[a-zA-Z]+', text)]
    if not tokens:
        return False
    # If any token matches a Banglish word, it's definitely not pure English
    if any(t in BANGLISH_WORDS for t in tokens):
        return False
    # To be classified as pure English, requires English structural words
    grammar_matches = sum(1 for t in tokens if t in ENGLISH_GRAMMAR_WORDS)
    if grammar_matches >= 2 or (grammar_matches >= 1 and len(tokens) >= 3):
        return True
    return False


def resolve_chat_language(message: str, client_language: Optional[str] = None) -> str:
    """
    Resolve whether the chatbot should reply in Bengali ('bn') or English ('en').
    
    Core Rules:
    1. Chatbot should answer in Bangla ('bn') by default.
    2. If the user asks in Bengali script OR Romanized Bengali (Banglish) OR mixed,
       the chatbot MUST reply in Bangla ('bn').
    3. ONLY when the user asks FULLY in English does the chatbot reply in pure English ('en').
    """
    if is_fully_english(message):
        return "en"
    return "bn"


def get_language_prompt_directive(language: str) -> str:
    """
    Generate an authoritative system prompt directive to enforce the response language.
    """
    if language == "en":
        return (
            "\n\n=== MANDATORY LANGUAGE DIRECTIVE ===\n"
            "The user asked FULLY in English.\n"
            "You MUST formulate your response ENTIRELY in pure, professional English.\n"
            "Do not include Bengali script unless specifically requested.\n"
        )
    return (
        "\n\n=== MANDATORY LANGUAGE DIRECTIVE ===\n"
        "The user asked in Bangla (or Romanized Bengali / Banglish).\n"
        "You MUST formulate your entire response in BANGLA (বাংলা ভাষা ও বাংলা লিপি).\n"
        "CRITICAL: Even if the user typed using English letters (Banglish, e.g. 'amar height... koto calorie lagbe'), "
        "YOU MUST RESPOND COMPLETELY IN BANGLA (বাংলা).\n"
        "Translate all nutritional explanations, calorie calculations, portion sizes, and food names into warm, natural Bengali.\n"
    )

