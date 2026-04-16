import { createFileRoute } from "@tanstack/react-router"
import { chat } from "@tanstack/ai"
import { anthropicText } from "@tanstack/ai-anthropic"
import { toDurableChatSessionResponse } from "@durable-streams/tanstack-ai-transport"

function buildStreamUrl(streamPath: string): string {
	const base =
		process.env.DS_URL ??
		`${process.env.ELECTRIC_URL || "https://api.electric-sql.cloud"}/v1/stream/${process.env.DS_SERVICE_ID}`
	return new URL(streamPath, base.replace(/\/+$/, "") + "/").toString()
}

function dsAuthHeaders(): Record<string, string> {
	const secret = process.env.DS_SECRET
	return secret ? { Authorization: `Bearer ${secret}` } : {}
}

export const Route = createFileRoute("/api/chat")({
	// @ts-expect-error — server.handlers types lag behind runtime support
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const apiKey = request.headers.get("x-api-key")
				if (!apiKey) {
					return Response.json({ error: "Missing API key. Set your Anthropic API key in Settings." }, { status: 401 })
				}

				const model = request.headers.get("x-model") || "claude-sonnet-4-6"
				process.env.ANTHROPIC_API_KEY = apiKey

				const body = await request.json()
				const messages = body.messages
				const url = new URL(request.url)
				const id = url.searchParams.get("id") ?? body.id
				if (!id) return Response.json({ error: "Missing chat id" }, { status: 400 })

				const latestUserMessage = messages.findLast((m: { role: string }) => m.role === "user")

				const responseStream = chat({
					adapter: anthropicText(model),
					messages,
				})

				const dsResponse = await toDurableChatSessionResponse({
					stream: {
						writeUrl: buildStreamUrl(`chat/${id}`),
						headers: { ...dsAuthHeaders(), "Content-Type": "application/json" },
						createIfMissing: true,
					},
					newMessages: latestUserMessage ? [latestUserMessage] : [],
					responseStream,
				})

				const headers = new Headers(dsResponse.headers)
				headers.delete("content-length")
				headers.delete("content-encoding")
				return new Response(dsResponse.body, { status: dsResponse.status, headers })
			},
		},
	},
})
