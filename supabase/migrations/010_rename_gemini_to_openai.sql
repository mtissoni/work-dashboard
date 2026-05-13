ALTER TABLE user_settings
  RENAME COLUMN gemini_api_key TO openai_api_key;

ALTER TABLE user_settings
  RENAME COLUMN gemini_instructions TO ai_instructions;
