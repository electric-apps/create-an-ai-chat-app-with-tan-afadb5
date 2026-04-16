import { useLiveQuery } from "@tanstack/react-db"
import { conversationsCollection } from "@/db/collections/conversations"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SettingsDialog } from "@/components/settings-dialog"
import { Plus, Trash2, MessageSquare, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useRef } from "react"

interface ConversationSidebarProps {
	apiKey: string
	model: string
	onSaveSettings: (apiKey: string, model: string) => void
	isOpen: boolean
	onClose: () => void
}

export function ConversationSidebar({ apiKey, model, onSaveSettings, isOpen, onClose }: ConversationSidebarProps) {
	const { data: conversations = [] } = useLiveQuery((q) =>
		q
			.from({ c: conversationsCollection })
			.orderBy(({ c }) => c.updated_at, "desc"),
	)
	const navigate = useNavigate()
	const params = useParams({ strict: false }) as { conversationId?: string }
	const activeId = params.conversationId
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editTitle, setEditTitle] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)

	const handleNewChat = () => {
		const id = crypto.randomUUID()
		conversationsCollection.insert({
			id,
			title: "New Conversation",
			created_at: new Date(),
			updated_at: new Date(),
		})
		navigate({ to: "/chat/$conversationId", params: { conversationId: id } })
		onClose()
	}

	const handleDelete = (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		conversationsCollection.delete(id)
		if (activeId === id) {
			navigate({ to: "/" })
		}
	}

	const handleStartRename = (e: React.MouseEvent, id: string, title: string) => {
		e.preventDefault()
		setEditingId(id)
		setEditTitle(title)
		setTimeout(() => inputRef.current?.focus(), 0)
	}

	const handleFinishRename = (id: string) => {
		if (editTitle.trim()) {
			conversationsCollection.update(id, (draft) => {
				draft.title = editTitle.trim()
				draft.updated_at = new Date()
			})
		}
		setEditingId(null)
	}

	return (
		<>
			{/* Mobile overlay */}
			{isOpen && (
				<div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose} />
			)}

			<aside className={cn(
				"flex flex-col h-full bg-[#161618] border-r border-[#2a2c34] transition-transform duration-200 z-50",
				"fixed md:relative md:translate-x-0",
				"w-72",
				isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
			)}>
				<div className="flex items-center justify-between p-4 border-b border-[#2a2c34]">
					<h2 className="text-sm font-semibold tracking-tight">Conversations</h2>
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="icon" onClick={handleNewChat} className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors duration-150">
							<Plus className="h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground md:hidden">
							<X className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<ScrollArea className="flex-1">
					<div className="flex flex-col gap-1 p-2">
						{conversations.length === 0 && (
							<p className="text-xs text-muted-foreground px-3 py-6 text-center">No conversations yet</p>
						)}
						{conversations.map((conv) => (
							<div
								key={conv.id}
								className={cn(
									"group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors duration-150",
									activeId === conv.id
										? "bg-[#2a2a32] text-foreground"
										: "text-muted-foreground hover:bg-[#2a2a32]/50 hover:text-foreground"
								)}
								onClick={() => {
									navigate({ to: "/chat/$conversationId", params: { conversationId: conv.id } })
									onClose()
								}}
							>
								<MessageSquare className="h-4 w-4 shrink-0" />
								{editingId === conv.id ? (
									<input
										ref={inputRef}
										value={editTitle}
										onChange={(e) => setEditTitle(e.target.value)}
										onBlur={() => handleFinishRename(conv.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleFinishRename(conv.id)
											if (e.key === "Escape") setEditingId(null)
										}}
										className="flex-1 min-w-0 bg-transparent border-b border-[#d0bcff] outline-none text-sm"
										onClick={(e) => e.stopPropagation()}
									/>
								) : (
									<span
										className="flex-1 truncate"
										onDoubleClick={(e) => handleStartRename(e, conv.id, conv.title)}
									>
										{conv.title}
									</span>
								)}
								<button
									className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[#f85149] transition-all duration-150 shrink-0"
									onClick={(e) => handleDelete(e, conv.id)}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</div>
						))}
					</div>
				</ScrollArea>

				<div className="p-3 border-t border-[#2a2c34]">
					<SettingsDialog apiKey={apiKey} model={model} onSave={onSaveSettings} />
				</div>
			</aside>
		</>
	)
}
