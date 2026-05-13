ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS gemini_api_key text,
  ADD COLUMN IF NOT EXISTS gemini_instructions text;
