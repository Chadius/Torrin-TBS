import { BattleEvent, BattleEventService } from "./battleEvent"
import { SquaddieSquaddieResultsService } from "./squaddieSquaddieResults"
import { BattleActionService } from "./battleAction/battleAction"
import { BattleActionActionContextService } from "./battleAction/battleActionActionContext"

describe("BattleEvent", () => {
    it("throws an error if there is no event added", () => {
        const shouldThrowError = () => {
            BattleEventService.new({
                results: SquaddieSquaddieResultsService.new({
                    actingBattleSquaddieId: "actor",
                    targetedBattleSquaddieIds: [],
                    actionContext: BattleActionActionContextService.new({}),
                    squaddieChanges: [],
                }),
            })
        }

        expect(shouldThrowError).toThrow()
    })
    it("can clone an existing event", () => {
        const original: BattleEvent = BattleEventService.new({
            results: SquaddieSquaddieResultsService.new({
                actingBattleSquaddieId: "actor",
                targetedBattleSquaddieIds: [],
                actionContext: BattleActionActionContextService.new({}),
                squaddieChanges: [],
            }),
            battleAction: BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: "actor",
                },
                action: {
                    isEndTurn: true,
                },
                effect: {
                    endTurn: true,
                },
            }),
        })

        const clone: BattleEvent = BattleEventService.clone(original)
        expect(clone).toEqual(original)
    })
})
