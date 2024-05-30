import { Recording, RecordingService } from "./recording"
import { BattleEvent, BattleEventService } from "./battleEvent"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"

describe("Recording", () => {
    it("placeholder once you rewrite this", () => {
        expect(true).toBeTruthy()
    })

    it("can add an event and retrieve it", () => {
        const recording: Recording = {
            history: [],
        }

        const decidedActionMovementEffect =
            DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: { q: 0, r: 1 },
            })

        const processedAction = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                actionPointCost: 1,
                battleSquaddieId: "playerSoldierBattleSquaddie",
                actionTemplateName: "Move",
                actionEffects: [decidedActionMovementEffect],
            }),
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
        expect(history[0]).toStrictEqual({
            results: undefined,
            processedAction,
        })
    })
})
