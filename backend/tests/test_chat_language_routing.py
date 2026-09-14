"""
test_chat_language_routing.py
Tests for Chatbot Language Routing:
- Chatbot replies in Bangla (বাংলা) by default.
- When user writes in Romanized Bengali (Banglish) or Bengali script,
  language resolves to 'bn' (even if client UI language is set to 'en').
- When user writes fully in English, language resolves to 'en'.
- Proper prompt directives are generated.
- Safety guard correctly propagates the resolved language.
"""

import pytest
from unittest.mock import AsyncMock, patch

from app.utils import (
    is_fully_english,
    resolve_chat_language,
    get_language_prompt_directive,
)
from app.agents.safety_guard import safety_guard_node


class TestChatLanguageDetection:
    """Test is_fully_english and resolve_chat_language functions."""

    def test_user_screenshot_banglish_query(self):
        """The exact query from the user screenshot must resolve to 'bn'."""
        query = "amar height 5 feet 4, weight 56kg. ata all time maintain korte regular koto calorie comsume korte hobe?"
        assert not is_fully_english(query)
        assert resolve_chat_language(query, client_language="en") == "bn"
        assert resolve_chat_language(query, client_language="bn") == "bn"

    def test_bengali_script_queries(self):
        """Bengali script queries must resolve to 'bn'."""
        queries = [
            "আমার উচ্চতা ৫ ফুট ৪ ইঞ্চি, ওজন ৫৬ কেজি। দৈনিক কত ক্যালোরি লাগবে?",
            "আজকের দুপুরের খাবার কী?",
            "ডায়াবেটিসে কলা খাওয়া যাবে?",
            "ভাত এবং মাছ খেয়েছি",
        ]
        for q in queries:
            assert not is_fully_english(q)
            assert resolve_chat_language(q, client_language="en") == "bn"

    def test_banglish_queries(self):
        """Various Banglish queries must resolve to 'bn'."""
        banglish_queries = [
            "koto calorie lagbe?",
            "ki khete pari?",
            "amar diabetes ache, mishti khete parbo?",
            "ami bhat ar mach kheyechi",
            "ek cup cha khawa jabe?",
            "shokal er breakfast e ki khabo?",
            "ojon komanor jonno diet plan dao",
        ]
        for q in banglish_queries:
            assert not is_fully_english(q), f"Failed for: {q}"
            assert resolve_chat_language(q, client_language="en") == "bn", f"Failed for: {q}"

    def test_pure_english_queries(self):
        """Fully English queries must resolve to 'en'."""
        english_queries = [
            "What is my daily caloric requirement to maintain 56 kg?",
            "Can I eat bananas if I have type 2 diabetes?",
            "Please give me a high-protein meal plan for weight loss.",
            "I ate 2 boiled eggs and 1 slice of whole wheat toast for breakfast.",
            "How many calories are in 100 grams of cooked brown rice?",
        ]
        for q in english_queries:
            assert is_fully_english(q), f"Failed for: {q}"
            assert resolve_chat_language(q, client_language="en") == "en", f"Failed for: {q}"
            assert resolve_chat_language(q, client_language="bn") == "en", f"Failed for: {q}"

    def test_language_prompt_directives(self):
        """Verify prompt directives contain necessary instructions."""
        directive_bn = get_language_prompt_directive("bn")
        assert "BANGLA (বাংলা ভাষা ও বাংলা লিপি)" in directive_bn
        assert "Banglish" in directive_bn

        directive_en = get_language_prompt_directive("en")
        assert "FULLY in English" in directive_en
        assert "pure, professional English" in directive_en


class TestSafetyGuardLanguagePropagation:
    """Verify safety guard maintains correct language resolution."""

    @pytest.mark.asyncio
    async def test_safety_guard_banglish_query_resolves_bn(self):
        state = {
            "message": "amar height 5 feet 4, weight 56kg. ata all time maintain korte regular koto calorie comsume korte hobe?",
            "language": "en",  # Client UI was in English
            "intent": None,
            "reply": None,
        }
        with patch(
            "app.agents.safety_guard.llm_client.chat_completion",
            new_callable=AsyncMock,
            return_value='{"is_safe": true, "is_in_scope": true, "language": "en"}',
        ):
            result = await safety_guard_node(state)
        # Even if LLM classified language as 'en', safety_guard must resolve to 'bn'
        assert result.get("language") == "bn"

    @pytest.mark.asyncio
    async def test_safety_guard_pure_english_query_resolves_en(self):
        state = {
            "message": "What is my daily caloric requirement to maintain 56 kg?",
            "language": "bn",
            "intent": None,
            "reply": None,
        }
        with patch(
            "app.agents.safety_guard.llm_client.chat_completion",
            new_callable=AsyncMock,
            return_value='{"is_safe": true, "is_in_scope": true, "language": "en"}',
        ):
            result = await safety_guard_node(state)
        assert result.get("language") == "en"


class TestCleanMathAndLatex:
    """Verify raw LaTeX syntax and math delimiters are cleanly sanitized into plain text."""

    def test_sanitize_bmr_tdee_formula_from_user_screenshot(self):
        from app.utils import clean_math_and_latex

        raw = (
            "পুরুষদের জন্য BMR হিসাব:\n"
            r"\[ \text{BMR} = 10 \times \text{ওজন (কেজি)} + 6.25 \times \text{উচ্চতা (সেমি)} - 5 \times \text{বয়স (বছর)} + 5 \]"
            "\n"
            r"\[ \text{BMR} = 560 + 1015.625 - 130 + 5 = 1450.625 \text{ ক্যালোরি (প্রায় 1451 ক্যালোরি)} \]"
            "\n"
            r"\[ \text{TDEE} = 1451 \times 1.375 \approx 1990 \text{ ক্যালোরি} \]"
        )

        cleaned = clean_math_and_latex(raw)

        # Raw LaTeX delimiters and commands must NOT be present
        assert r"\[" not in cleaned
        assert r"\]" not in cleaned
        assert r"\text{" not in cleaned
        assert r"\times" not in cleaned
        assert r"\approx" not in cleaned

        # Clean Unicode representations must be present
        assert "BMR = 10 × ওজন (কেজি) + 6.25 × উচ্চতা (সেমি) - 5 × বয়স (বছর) + 5" in cleaned
        assert "TDEE = 1451 × 1.375 ≈ 1990 ক্যালোরি" in cleaned

    def test_sanitize_fractions_and_delimiters(self):
        from app.utils import clean_math_and_latex

        raw = r"Formula: $\frac{A}{B}$ and \(\text{Result} = 10 \pm 2\)"
        cleaned = clean_math_and_latex(raw)
        assert cleaned == "Formula: (A / B) and Result = 10 ± 2"
