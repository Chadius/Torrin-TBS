import { describe, expect, it } from "vitest"
import { SearchLimit, SearchLimitService } from "../searchLimit"

describe("SearchLimit tests", () => {
    it("can create a new Search Limit based on a preset", () => {
        const jumpingSearchLimit: SearchLimit = SearchLimitService.new({
            baseSearchLimit: SearchLimitService.landBasedMovement(),
            crossOverPits: true,
        })

        expect(jumpingSearchLimit.crossOverPits).toBeTruthy()
        expect(jumpingSearchLimit).toEqual({
            ...SearchLimitService.landBasedMovement(),
            crossOverPits: true,
        })
    })
})
