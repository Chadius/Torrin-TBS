import { Recording, RecordingService } from "./recording"
import { BattleEvent, BattleEventService } from "./battleEvent"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { BattleActionService } from "./battleAction"

describe("Recording", () => {
    it("placeholder once you rewrite this", () => {
        expect(true).toBeTruthy()
    })

    it("can add an event and retrieve it", () => {
        const recording: Recording = {
            history: [],
        }

        const processedAction = ProcessedActionService.new({
            actionPointCost: 1,
            processedActionEffects: [],
            battleAction: BattleActionService.new({
                actor: { battleSquaddieId: "playerSoldierBattleSquaddie" },
                action: { isMovement: true },
                effect: {
                    movement: {
                        startLocation: { q: 0, r: 0 },
                        endLocation: { q: 0, r: 1 },
                    },
                },
            }),
        })

        RecordingService.addEvent(
            recording,
            BattleEventService.new({
                results: undefined,
                processedAction,
            })
        )

        const history: BattleEvent[] = recording.history
        expect(history).toHaveLength(1)
        expect(history[0]).toStrictEqual(
            BattleEventService.new({
                results: undefined,
                processedAction,
            })
        )
    })
})
