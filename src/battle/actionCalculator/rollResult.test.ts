import { RollResultService } from "./rollResult"

describe("Roll Result", () => {
    it("knows when the dice roll is a critical success", () => {
        expect(
            RollResultService.isACriticalSuccess(
                RollResultService.new({
                    rolls: [1, 3],
                    occurred: true,
                })
            )
        ).toBeFalsy()
        expect(
            RollResultService.isACriticalSuccess(
                RollResultService.new({
                    rolls: [6, 6],
                    occurred: true,
                })
            )
        ).toBeTruthy()
    })

    it("knows when the dice roll is a critical failure", () => {
        expect(
            RollResultService.isACriticalFailure(
                RollResultService.new({
                    rolls: [1, 3],
                    occurred: true,
                })
            )
        ).toBeFalsy()
        expect(
            RollResultService.isACriticalFailure(
                RollResultService.new({
                    rolls: [1, 1],
                    occurred: true,
                })
            )
        ).toBeTruthy()
    })

    describe("sanitize", () => {
        it("sets occurred to true if rolls are provided", () => {
            const sanitized = RollResultService.sanitize(
                RollResultService.new({
                    rolls: [3, 5],
                })
            )
            expect(sanitized.occurred).toBeTruthy()
        })
        it("sets occurred to false if rolls are not", () => {
            const sanitized = RollResultService.sanitize(
                RollResultService.new({})
            )
            expect(sanitized.occurred).toBeFalsy()
            expect(sanitized.rolls).toEqual([])
        })
    })
})
