import { createCollection } from "@tanstack/react-db"
import { electricCollectionOptions } from "@tanstack/electric-db-collection"
import { absoluteApiUrl } from "@/lib/client-url"
import { conversationSelectSchema } from "@/db/zod-schemas"

export const conversationsCollection = createCollection(
	electricCollectionOptions({
		id: "conversations",
		schema: conversationSelectSchema,
		getKey: (row) => row.id,
		shapeOptions: {
			url: absoluteApiUrl("/api/conversations"),
			parser: {
				timestamptz: (date: string) => new Date(date),
			},
		},
		onInsert: async ({ transaction }) => {
			const { modified: newConversation } = transaction.mutations[0]
			const res = await fetch("/api/conversations/mutate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newConversation),
			})
			const { txid } = await res.json()
			return { txid }
		},
		onUpdate: async ({ transaction }) => {
			const { modified: updated } = transaction.mutations[0]
			const res = await fetch("/api/conversations/mutate", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updated),
			})
			const { txid } = await res.json()
			return { txid }
		},
		onDelete: async ({ transaction }) => {
			const { original: deleted } = transaction.mutations[0]
			const res = await fetch("/api/conversations/mutate", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: deleted.id }),
			})
			const { txid } = await res.json()
			return { txid }
		},
	}),
)
