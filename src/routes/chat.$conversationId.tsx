import { createFileRoute } from "@tanstack/react-router"
import { ClientOnly } from "@/components/ClientOnly"
import { AppLayout } from "@/components/app-layout"

export const Route = createFileRoute("/chat/$conversationId")({
	ssr: false,
	component: ChatPage,
})

function ChatPage() {
	return <ClientOnly>{() => <AppLayout />}</ClientOnly>
}
