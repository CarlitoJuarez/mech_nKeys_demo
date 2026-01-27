import os
import re
import httpx
from typing import Optional
from asgiref.sync import async_to_sync
from django.conf import settings
import re, unicodedata
from unidecode import unidecode

try:
    from better_profanity import profanity
    profanity.load_censor_words()
    HAS_PROFANITY = True
except Exception:
    HAS_PROFANITY = False


# Keep ONLY your policy regexes here
BANNED_REGEXES = [
    r"\b(?:explicitword1|explicitword2)\b",  # case-insensitive, whole words
    # TODO: expand per policy
]


OPENAI_API_KEY = getattr(settings, "OPENAI_API_KEY", "")

OPENAI_MODERATION_ENABLED = bool(OPENAI_API_KEY) and getattr(
    settings, "OPENAI_MODERATION_ENABLED", True
)
OPENAI_MODERATION_MODEL = "omni-moderation-latest"
OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations"
_OPENAI_TIMEOUT = httpx.Timeout(5.0, connect=3.0)

# Choose behavior on API failure:

STRICT_MODE = getattr(settings, "OPENAI_MODERATION_STRICT", True)


LEET_MAP = str.maketrans({
    '@': 'a', '4': 'a', '\u00E0': 'a', '\u00E1': 'a', '\u00E4': 'a',  # Â Â Â
    '3': 'e', '\u20AC': 'e', '\u00E9': 'e', '\u00EB': 'e',            # Ã Â Â
    '!': 'i', '1': 'i', '\u00ED': 'i', '\u00EF': 'i',                 # Â Â
    '0': 'o', '\u00F3': 'o', '\u00F6': 'o',                           # Â Â
    '$': 's', '5': 's',
    '7': 't',
})

def matches_banned_regexes(text: str) -> bool:
    for pat in BANNED_REGEXES:
        if re.search(pat, text or "", re.IGNORECASE):
            return True
    return False


async def _moderate_with_openai_async(text: str) -> dict:
    payload = {"model": OPENAI_MODERATION_MODEL, "input": text or ""}
    async with httpx.AsyncClient(timeout=_OPENAI_TIMEOUT) as client:
        r = await client.post(
            OPENAI_MODERATION_URL,
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json=payload,
        )
        r.raise_for_status()
        return r.json()

def _is_flagged_openai(result: dict) -> bool:
    try:
        first = (result.get("results") or [])[0]
        return bool(first.get("flagged", False))
    except Exception:
        return True  # be safe if response is unexpected
#
# also handles f.u.c.k / f u c k ? fuck
# _SEP_COLLAPSE_RX = re.compile(r"([a-zA-Z])[\W_]+(?=[a-zA-Z])")

def make_even_cleaner(t: str) -> str:
    t = unicodedata.normalize("NFKC", t or "")
    t = re.sub(r"[\u200B-\u200D\uFEFF]", "", t)   # zero-width
    t = t.translate(LEET_MAP)                     # leetspeak first
    t = unidecode(t)                              # then strip diacritics
    t = re.sub(r"[\W_]+", " ", t)                 # separators -> single space
    t = re.sub(r"(.)\1{2,}", r"\1\1", t)          # loooong -> loong
    return t.strip()

# Letters/digits (no underscores), allowing internal ' or - like don't, mother-in-law
_WORD_RE = re.compile(r"[^\W_]+(?:['Õ-][^\W_]+)*", re.UNICODE)

def iter_words(text: str):
    # Returns lowercase tokens
    return (w.lower() for w in _WORD_RE.findall(text))

def any_word_is_banned(text: str) -> bool:
    normalized = make_even_cleaner(text)
    for w in iter_words(normalized):
        if matches_banned_regexes(w):
            return True
        if HAS_PROFANITY and profanity.contains_profanity(w):
            return True
    return False


async def text_is_clean_async(clean_text: str) -> bool:
    # 1) local regex pass (fast) + profanity
    normalized = make_even_cleaner(clean_text)
    if matches_banned_regexes(normalized):
        return False
 
    if any_word_is_banned(clean_text):
        return False

    # 2) OpenAI moderation
    if not OPENAI_MODERATION_ENABLED:
        return True
    try:
        result = await _moderate_with_openai_async(clean_text)
    except Exception as e:
        print("OpenAI moderation error:", e)
        return not STRICT_MODE
    return not _is_flagged_openai(result)

def simple_check(clean_text: str) -> bool:
    # 1) local regex pass (fast) + profanity
    normalized = make_even_cleaner(clean_text)
    if matches_banned_regexes(normalized):
        return False
    if any_word_is_banned(clean_text):
        return False
    return True;

def text_is_clean(clean_text: str, AI_moderation: bool, ) -> bool:
    if (AI_moderation):
        return async_to_sync(text_is_clean_async)(clean_text)
    return simple_check(clean_text)

