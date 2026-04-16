import { useState, useCallback, useEffect } from "react"

const API_KEY_STORAGE_KEY = "anthropic-api-key"
const MODEL_STORAGE_KEY = "anthropic-model"
const DEFAULT_MODEL = "claude-sonnet-4-6"

export function useSettings() {
	const [apiKey, setApiKeyState] = useState<string>("")
	const [model, setModelState] = useState<string>(DEFAULT_MODEL)

	useEffect(() => {
		setApiKeyState(localStorage.getItem(API_KEY_STORAGE_KEY) || "")
		setModelState(localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL)
	}, [])

	const setApiKey = useCallback((key: string) => {
		localStorage.setItem(API_KEY_STORAGE_KEY, key)
		setApiKeyState(key)
	}, [])

	const setModel = useCallback((m: string) => {
		localStorage.setItem(MODEL_STORAGE_KEY, m)
		setModelState(m)
	}, [])

	return { apiKey, model, setApiKey, setModel }
}
