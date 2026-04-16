import { describe, it, expect } from "vitest"
import { generateValidRow, generateRowWithout } from "./helpers/schema-test-utils"
import { conversationSelectSchema } from "@/db/zod-schemas"

describe("conversation schema", () => {
	it("accepts a complete row", () => {
		expect(conversationSelectSchema.safeParse(generateValidRow(conversationSelectSchema)).success).toBe(true)
	})
	it("rejects without id", () => {
		expect(conversationSelectSchema.safeParse(generateRowWithout(conversationSelectSchema, "id")).success).toBe(false)
	})
	it("rejects without title", () => {
		expect(conversationSelectSchema.safeParse(generateRowWithout(conversationSelectSchema, "title")).success).toBe(false)
	})
})
