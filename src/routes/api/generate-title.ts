import { createFileRoute } from "@tanstack/react-router"
import { chat } from "@tanstack/ai"
import { anthropicText } from "@tanstack/ai-anthropic"
import { db } from "@/db"
import { conversations } from "@/db/schema"
import { eq } from "drizzle-orm"

export const Route = createFileRoute("/api/generate-title")({
	// @ts-expect-error — server.handlers types lag behind runtime support
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const apiKey = request.headers.get("x-api-key")
				if (!apiKey) return Response.json({ error: "Missing API key" }, { status: 401 })

				const { conversationId, userMessage } = await request.json()
				if (!conversationId || !userMessage) {
					return Response.json({ error: "Missing conversationId or userMessage" }, { status: 400 })
				}

				process.env.ANTHROPIC_API_KEY = apiKey

				const stream = chat({
					adapter: anthropicText("claude-haiku-4-5-20251001"),
					messages: [
						{
							role: "user",
							content: `Generate a short title (max 6 words) for a conversation that starts with this message. Return ONLY the title, no quotes, no punctuation at the end.\n\nMessage: ${userMessage}`,
						},
					],
				})

				let title = ""
				for await (const chunk of stream) {
					if (chunk.type === "text") {
						title += chunk.text
					}
				}

				title = title.trim().slice(0, 60)
				if (title) {
					await db.update(conversations).set({ title, updated_at: new Date() }).where(eq(conversations.id, conversationId))
				}

				return Response.json({ title })
			},
		},
	},
})
