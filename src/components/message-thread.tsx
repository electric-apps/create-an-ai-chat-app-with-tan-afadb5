import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface UIMessage {
	id: string
	role: string
	parts: Array<{ type: string; text?: string }>
}

function getTextContent(message: UIMessage): string {
	return message.parts
		.filter((p) => p.type === "text")
		.map((p) => p.text ?? "")
		.join("")
}

interface MessageThreadProps {
	messages: UIMessage[]
	isLoading: boolean
	isInitializing: boolean
}

export function MessageThread({ messages, isLoading, isInitializing }: MessageThreadProps) {
	const bottomRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [messages, isLoading])

	if (isInitializing) {
		return (
			<div className="flex-1 flex flex-col gap-4 p-6 max-w-3xl mx-auto w-full">
				{[1, 2, 3].map((i) => (
					<div key={i} className="flex gap-3">
						<Skeleton className="h-8 w-8 rounded-full shrink-0" />
						<div className="flex-1 flex flex-col gap-2">
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="h-4 w-1/2" />
						</div>
					</div>
				))}
			</div>
		)
	}

	if (messages.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center flex flex-col items-center gap-3">
					<div className="h-12 w-12 rounded-full bg-[#d0bcff]/10 flex items-center justify-center">
						<Bot className="h-6 w-6 text-[#d0bcff]" />
					</div>
					<p className="text-lg font-medium">Start a conversation with Claude</p>
					<p className="text-sm text-muted-foreground">Type a message below to begin</p>
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="max-w-3xl mx-auto w-full flex flex-col gap-6 p-6">
				{messages.map((message) => (
					<div key={message.id} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
						<div className={cn(
							"h-8 w-8 rounded-full flex items-center justify-center shrink-0",
							message.role === "user" ? "bg-[#2a2a32]" : "bg-[#d0bcff]/10"
						)}>
							{message.role === "user" ? (
								<User className="h-4 w-4 text-foreground" />
							) : (
								<Bot className="h-4 w-4 text-[#d0bcff]" />
							)}
						</div>
						<div className={cn(
							"flex-1 rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
							message.role === "user"
								? "bg-[#2a2a32] text-foreground max-w-[80%] ml-auto"
								: "bg-transparent text-foreground"
						)}>
							{getTextContent(message)}
						</div>
					</div>
				))}
				{isLoading && messages[messages.length - 1]?.role === "user" && (
					<div className="flex gap-3">
						<div className="h-8 w-8 rounded-full bg-[#d0bcff]/10 flex items-center justify-center shrink-0">
							<Bot className="h-4 w-4 text-[#d0bcff]" />
						</div>
						<div className="flex items-center gap-1 py-3">
							<div className="h-2 w-2 rounded-full bg-[#d0bcff] animate-pulse" />
							<div className="h-2 w-2 rounded-full bg-[#d0bcff] animate-pulse [animation-delay:150ms]" />
							<div className="h-2 w-2 rounded-full bg-[#d0bcff] animate-pulse [animation-delay:300ms]" />
						</div>
					</div>
				)}
				<div ref={bottomRef} />
			</div>
		</div>
	)
}
