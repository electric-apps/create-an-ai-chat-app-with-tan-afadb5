import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Eye, EyeOff } from "lucide-react"

const MODELS = [
	{ value: "claude-opus-4-6", label: "Claude Opus 4.6" },
	{ value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
	{ value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
]

interface SettingsDialogProps {
	apiKey: string
	model: string
	onSave: (apiKey: string, model: string) => void
}

export function SettingsDialog({ apiKey, model, onSave }: SettingsDialogProps) {
	const [open, setOpen] = useState(false)
	const [localKey, setLocalKey] = useState(apiKey)
	const [localModel, setLocalModel] = useState(model)
	const [showKey, setShowKey] = useState(false)

	useEffect(() => {
		if (open) {
			setLocalKey(apiKey)
			setLocalModel(model)
		}
	}, [open, apiKey, model])

	const handleSave = () => {
		onSave(localKey, localModel)
		setOpen(false)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground transition-colors duration-150">
					<Settings className="h-5 w-5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="bg-card border-[#2a2c34]">
				<DialogHeader>
					<DialogTitle className="text-lg font-medium">Settings</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-4 pt-2">
					<div className="flex flex-col gap-2">
						<Label htmlFor="api-key" className="text-sm font-medium">Anthropic API Key</Label>
						<div className="relative">
							<Input
								id="api-key"
								type={showKey ? "text" : "password"}
								value={localKey}
								onChange={(e) => setLocalKey(e.target.value)}
								placeholder="sk-ant-..."
								className="pr-10"
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
								onClick={() => setShowKey(!showKey)}
							>
								{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</Button>
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="model" className="text-sm font-medium">Model</Label>
						<Select value={localModel} onValueChange={setLocalModel}>
							<SelectTrigger id="model">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MODELS.map((m) => (
									<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button onClick={handleSave} className="mt-2">Save</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
