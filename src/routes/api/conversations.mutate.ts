import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/db"
import { conversations } from "@/db/schema"
import { parseDates, generateTxId } from "@/db/utils"
import { eq } from "drizzle-orm"

export const Route = createFileRoute("/api/conversations/mutate")({
	// @ts-expect-error — server.handlers types lag behind runtime support
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const data = parseDates(await request.json())
				const { created_at, updated_at, ...rest } = data
				let txid: number
				await db.transaction(async (tx) => {
					txid = await generateTxId(tx)
					await tx.insert(conversations).values(rest)
				})
				return Response.json({ txid: txid! })
			},
			PUT: async ({ request }: { request: Request }) => {
				const data = parseDates(await request.json())
				const { id, created_at, ...rest } = data
				let txid: number
				await db.transaction(async (tx) => {
					txid = await generateTxId(tx)
					await tx.update(conversations).set({ ...rest, updated_at: new Date() }).where(eq(conversations.id, id))
				})
				return Response.json({ txid: txid! })
			},
			DELETE: async ({ request }: { request: Request }) => {
				const { id } = await request.json()
				let txid: number
				await db.transaction(async (tx) => {
					txid = await generateTxId(tx)
					await tx.delete(conversations).where(eq(conversations.id, id))
				})
				return Response.json({ txid: txid! })
			},
		},
	},
})
