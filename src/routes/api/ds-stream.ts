import { createFileRoute } from "@tanstack/react-router"

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

export const Route = createFileRoute("/api/ds-stream")({
	// @ts-expect-error — server.handlers types lag behind runtime support
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const url = new URL(request.url)
				const chatId = url.searchParams.get("id")
				if (!chatId) return Response.json({ error: "Missing chat id" }, { status: 400 })

				const upstream = new URL(buildStreamUrl(`chat/${chatId}`))

				for (const [key, value] of url.searchParams) {
					if (key === "id") continue
					upstream.searchParams.set(key, value)
				}

				const response = await fetch(upstream, {
					headers: {
						...dsAuthHeaders(),
						...(request.headers.get("accept") ? { Accept: request.headers.get("accept")! } : {}),
					},
				})

				if (response.status === 404) {
					return Response.json({ error: "Stream not found", code: "STREAM_NOT_FOUND" }, { status: 404 })
				}

				const headers = new Headers()
				for (const [key, value] of response.headers) {
					const k = key.toLowerCase()
					if (k === "connection" || k === "transfer-encoding" || k === "content-encoding" || k === "content-length") continue
					headers.set(key, value)
				}
				headers.set("Cache-Control", "no-store")

				return new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers,
				})
			},
		},
	},
})
