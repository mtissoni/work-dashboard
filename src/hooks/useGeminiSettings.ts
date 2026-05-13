import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useGeminiSettings(userId: string | null) {
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null)
  const [geminiInstructions, setGeminiInstructions] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    supabase
      .from('user_settings')
      .select('openai_api_key, ai_instructions')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setGeminiApiKey(data?.openai_api_key ?? null)
        setGeminiInstructions(data?.ai_instructions ?? null)
        setLoading(false)
      })
  }, [userId])

  const saveSettings = useCallback(
    async (apiKey: string, instructions: string): Promise<boolean> => {
      if (!userId) return false
      const { error } = await supabase.from('user_settings').upsert(
        {
          user_id: userId,
          openai_api_key: apiKey.trim() || null,
          ai_instructions: instructions.trim() || null,
        },
        { onConflict: 'user_id' }
      )
      if (!error) {
        setGeminiApiKey(apiKey.trim() || null)
        setGeminiInstructions(instructions.trim() || null)
      }
      return !error
    },
    [userId]
  )

  return { geminiApiKey, geminiInstructions, loading, saveSettings }
}
