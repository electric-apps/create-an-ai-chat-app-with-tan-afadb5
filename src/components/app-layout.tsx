import { useState, useMemo, useCallback, useRef } from "react"
import { useParams, useNavigate } from "@tanstack/react-router"
import { useChat } from "@tanstack/ai-react"
import { durableStreamConnection } from "@durable-streams/tanstack-ai-transport"
import { ConversationSidebar } from "@/components/conversation-sidebar"
import { MessageThread } from "@/components/message-thread"
import { MessageInput } from "@/components/message-input"
import { useSettings } from "@/hooks/use-settings"
import { conversationsCollection } from "@/db/collections/conversations"
import { Button } from "@/components/ui/button"
import { Menu, Settings } from "lucide-react"

export function AppLayout() {
	const params = useParams({ strict: false }) as { conversationId?: string }
	const conversationId = params.conversationId
	const navigate = useNavigate()
	const { apiKey, model, setApiKey, setModel } = useSettings()
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const titleGeneratedRef = useRef<Set<string>>(new Set())

	const handleSaveSettings = useCallback((key: string, m: string) => {
		setApiKey(key)
		setModel(m)
	}, [setApiKey, setModel])

	return (
		<div className="flex h-screen overflow-hidden">
			<ConversationSidebar
				apiKey={apiKey}
				model={model}
				onSaveSettings={handleSaveSettings}
				isOpen={sidebarOpen}
				onClose={() => setSidebarOpen(false)}
			/>
			<main className="flex-1 flex flex-col min-w-0">
				{/* Mobile header */}
				<div className="flex items-center gap-2 p-3 border-b border-[#2a2c34] md:hidden">
					<Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="h-8 w-8">
						<Menu className="h-5 w-5" />
					</Button>
					<span className="text-sm font-medium">Claude Chat</span>
				</div>

				{conversationId ? (
					<ChatView
						key={conversationId}
						conversationId={conversationId}
						apiKey={apiKey}
						model={model}
						titleGeneratedRef={titleGeneratedRef}
					/>
				) : (
					<EmptyState apiKey={apiKey} navigate={navigate} />
				)}
			</main>
		</div>
	)
}

function ChatView({
	conversationId,
	apiKey,
	model,
	titleGeneratedRef,
}: {
	conversationId: string
	apiKey: string
	model: string
	titleGeneratedRef: React.MutableRefObject<Set<string>>
}) {
	const [initializing, setInitializing] = useState(true)

	const connection = useMemo(
		() =>
			durableStreamConnection({
				sendUrl: `/api/chat?id=${encodeURIComponent(conversationId)}`,
				readUrl: `/api/ds-stream?id=${encodeURIComponent(conversationId)}`,
				headers: {
					"x-api-key": apiKey,
					"x-model": model,
				},
			}),
		[conversationId, apiKey, model],
	)

	const { messages, sendMessage, isLoading } = useChat({
		id: conversationId,
		connection,
		live: true,
		onFinish: (message) => {
			if (message.role === "assistant" && !titleGeneratedRef.current.has(conversationId)) {
				titleGeneratedRef.current.add(conversationId)
				const firstUserMsg = messages.find((m) => m.role === "user")
				if (firstUserMsg) {
					const text = firstUserMsg.parts
						.filter((p) => p.type === "text")
						.map((p) => p.text ?? "")
						.join("")
					if (text) {
						fetch("/api/generate-title", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								"x-api-key": apiKey,
							},
							body: JSON.stringify({ conversationId, userMessage: text }),
						}).catch(() => {})
					}
				}
			}
		},
	})

	// Mark as done initializing once we get first response or after timeout
	useState(() => {
		const timer = setTimeout(() => setInitializing(false), 1500)
		return () => clearTimeout(timer)
	})

	// If messages arrive, stop showing skeleton
	if (initializing && messages.length > 0) {
		setInitializing(false)
	}

	const handleSend = (text: string) => {
		// Update conversation's updated_at
		conversationsCollection.update(conversationId, (draft) => {
			draft.updated_at = new Date()
		})
		sendMessage({ content: text })
	}

	return (
		<>
			{!apiKey && (
				<div className="bg-[#d29922]/10 text-[#d29922] text-sm px-4 py-2 text-center">
					Set your Anthropic API key in Settings to start chatting.
				</div>
			)}
			<MessageThread messages={messages} isLoading={isLoading} isInitializing={initializing && messages.length === 0} />
			<MessageInput onSend={handleSend} isLoading={isLoading} disabled={!apiKey} />
			<footer className="border-t border-[#2a2c34] py-4 mt-auto">
				<div className="flex items-center justify-between px-4 text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						<svg className="h-4 w-4" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
							<path d="M106.992 16.1244C107.711 15.4029 108.683 15 109.692 15H170L84.0082 101.089C83.2888 101.811 82.3171 102.213 81.3081 102.213H21L106.992 16.1244Z" fill="#d0bcff" />
							<path d="M96.4157 104.125C96.4157 103.066 97.2752 102.204 98.331 102.204H170L96.4157 176V104.125Z" fill="#d0bcff" />
						</svg>
						<span>Built with <a href="https://electric-sql.com" target="_blank" rel="noopener noreferrer" className="text-[#d0bcff] hover:underline">Electric</a></span>
					</div>
					<span>&copy; {new Date().getFullYear()} Electric SQL</span>
				</div>
			</footer>
		</>
	)
}

function EmptyState({ apiKey, navigate }: { apiKey: string; navigate: ReturnType<typeof useNavigate> }) {
	const handleNewChat = () => {
		const id = crypto.randomUUID()
		conversationsCollection.insert({
			id,
			title: "New Conversation",
			created_at: new Date(),
			updated_at: new Date(),
		})
		navigate({ to: "/chat/$conversationId", params: { conversationId: id } })
	}

	return (
		<>
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center flex flex-col items-center gap-4">
					<div className="h-16 w-16 rounded-full bg-[#d0bcff]/10 flex items-center justify-center">
						<svg className="h-8 w-8" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
							<path d="M106.992 16.1244C107.711 15.4029 108.683 15 109.692 15H170L84.0082 101.089C83.2888 101.811 82.3171 102.213 81.3081 102.213H21L106.992 16.1244Z" fill="#d0bcff" />
							<path d="M96.4157 104.125C96.4157 103.066 97.2752 102.204 98.331 102.204H170L96.4157 176V104.125Z" fill="#d0bcff" />
						</svg>
					</div>
					<h1 className="text-3xl font-bold tracking-tight">Claude Chat</h1>
					<p className="text-muted-foreground max-w-md">
						A persistent AI chat powered by Claude. Your conversations survive page refreshes and resume mid-generation.
					</p>
					{!apiKey && (
						<p className="text-sm text-[#d29922]">
							Open Settings (gear icon in sidebar) to set your Anthropic API key first.
						</p>
					)}
					<Button onClick={handleNewChat} className="mt-2">
						Start chatting
					</Button>
				</div>
			</div>
			<footer className="border-t border-[#2a2c34] py-4 mt-auto">
				<div className="flex items-center justify-between px-4 text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						<svg className="h-4 w-4" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
							<path d="M106.992 16.1244C107.711 15.4029 108.683 15 109.692 15H170L84.0082 101.089C83.2888 101.811 82.3171 102.213 81.3081 102.213H21L106.992 16.1244Z" fill="#d0bcff" />
							<path d="M96.4157 104.125C96.4157 103.066 97.2752 102.204 98.331 102.204H170L96.4157 176V104.125Z" fill="#d0bcff" />
						</svg>
						<span>Built with <a href="https://electric-sql.com" target="_blank" rel="noopener noreferrer" className="text-[#d0bcff] hover:underline">Electric</a></span>
					</div>
					<span>&copy; {new Date().getFullYear()} Electric SQL</span>
				</div>
			</footer>
		</>
	)
}
