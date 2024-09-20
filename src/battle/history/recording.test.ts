import { Recording, RecordingService } from "./recording"
import { BattleEvent, BattleEventService } from "./battleEvent"
import { ProcessedActionService } from "../../action/processed/processedAction"

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
