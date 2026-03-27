import unittest

from backend.app.recipe_engine import (
    CHAT_MAX_NEW_TOKENS,
    RECIPE_MAX_NEW_TOKENS,
    _get_generation_kwargs,
)


class _TokenizerStub:
    eos_token_id = 7


class RecipeEngineConfigTests(unittest.TestCase):
    def test_recipe_generation_uses_lower_bounded_recipe_limit(self):
        kwargs = _get_generation_kwargs(_TokenizerStub(), require_recipe=True)

        self.assertEqual(kwargs["max_new_tokens"], RECIPE_MAX_NEW_TOKENS)
        self.assertTrue(kwargs["use_cache"])
        self.assertEqual(kwargs["temperature"], 0.45)

    def test_chat_generation_uses_shorter_limit(self):
        kwargs = _get_generation_kwargs(_TokenizerStub(), require_recipe=False)

        self.assertEqual(kwargs["max_new_tokens"], CHAT_MAX_NEW_TOKENS)
        self.assertTrue(kwargs["use_cache"])
        self.assertEqual(kwargs["temperature"], 0.7)


if __name__ == "__main__":
    unittest.main()
