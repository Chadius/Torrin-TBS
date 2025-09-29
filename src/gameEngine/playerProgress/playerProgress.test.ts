import { describe, it, expect } from "vitest"
import { PlayerProgressService } from "./playerProgress"

describe("Player Progress", () => {
    describe("Creating Player Progress", () => {
        it("will throw an error if no campaignId is provided", () => {
            expect(() => {
                //@ts-ignore Purposely giving invalid parameters to throw an error
                PlayerProgressService.new({})
            }).toThrow("campaignId is required")
        })
    })
})
