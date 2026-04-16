import { describe, it, expect } from "vitest"
import { generateValidRow, parseDates } from "./helpers/schema-test-utils"
import { conversationSelectSchema } from "@/db/zod-schemas"

describe("conversation collection validation", () => {
	it("validates insert data", () => {
		const row = generateValidRow(conversationSelectSchema)
		expect(conversationSelectSchema.safeParse(row).success).toBe(true)
	})

	it("validates JSON round-trip with parseDates", () => {
		const row = generateValidRow(conversationSelectSchema)
		const roundTripped = parseDates(JSON.parse(JSON.stringify(row)))
		expect(conversationSelectSchema.safeParse(roundTripped).success).toBe(true)
	})

	it("rejects invalid data", () => {
		expect(conversationSelectSchema.safeParse({ random: "stuff" }).success).toBe(false)
	})
})
