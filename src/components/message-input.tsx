import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"

interface MessageInputProps {
	onSend: (message: string) => void
	isLoading: boolean
	disabled: boolean
	disabledReason?: string
}

export function MessageInput({ onSend, isLoading, disabled, disabledReason }: MessageInputProps) {
	const [value, setValue] = useState("")
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto"
			textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px"
		}
	}, [value])

	const handleSend = () => {
		const trimmed = value.trim()
		if (!trimmed || isLoading || disabled) return
		onSend(trimmed)
		setValue("")
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	return (
		<div className="border-t border-[#2a2c34] p-4">
			<div className="max-w-3xl mx-auto flex gap-2 items-end">
				<Textarea
					ref={textareaRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={disabled ? (disabledReason || "Set your API key to start chatting") : "Type a message..."}
					disabled={disabled || isLoading}
					className="min-h-[44px] max-h-[160px] resize-none bg-[#2a2a32] border-[#3c3f44] focus-visible:ring-[#d0bcff]/50"
					rows={1}
				/>
				<Button
					onClick={handleSend}
					disabled={!value.trim() || isLoading || disabled}
					size="icon"
					className="h-[44px] w-[44px] shrink-0"
				>
					<Send className="h-4 w-4" />
				</Button>
			</div>
		</div>
	)
}
