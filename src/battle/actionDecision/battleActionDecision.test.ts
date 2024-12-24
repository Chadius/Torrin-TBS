import {
    BattleActionDecision,
    BattleActionDecisionService,
} from "./battleActionDecision"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "./battleActionDecisionStep"
import { beforeEach, describe, expect, it } from "vitest"

describe("action decision", () => {
    let decision: BattleActionDecision
    let movementStep: BattleActionDecisionStep
    let endTurnStep: BattleActionDecisionStep

    beforeEach(() => {
        decision = BattleActionDecisionService.new()
        movementStep = BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: movementStep,
            battleSquaddieId: "actor",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: movementStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: movementStep,
            targetCoordinate: { q: 0, r: 1 },
        })

        endTurnStep = BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: endTurnStep,
            battleSquaddieId: "actor",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: endTurnStep,
            endTurn: true,
        })
    })

    it("can create an empty decision", () => {
        expect(BattleActionDecisionService.isEmpty(decision)).toBeTruthy()
    })

    it("can add action decision steps and know it is not empty", () => {
        const decisionStep = BattleActionDecisionStepService.new()
        BattleActionDecisionService.addStep(decision, decisionStep)
        expect(BattleActionDecisionService.isEmpty(decision)).toBeFalsy()
    })

    it("can return the current action decision step", () => {
        BattleActionDecisionService.addStep(decision, movementStep)

        const actualStep: BattleActionDecisionStep =
            BattleActionDecisionService.getCurrentStep(decision)

        expect(actualStep).toEqual(movementStep)
    })
    it("can move to the next decision step", () => {
        BattleActionDecisionService.addStep(decision, movementStep)
        BattleActionDecisionService.addStep(decision, endTurnStep)

        BattleActionDecisionService.goToNextStep(decision)

        const actualStep: BattleActionDecisionStep =
            BattleActionDecisionService.getCurrentStep(decision)

        expect(actualStep).toEqual(endTurnStep)
    })

    it("returns undefined after all decision steps", () => {
        BattleActionDecisionService.addStep(decision, movementStep)
        BattleActionDecisionService.addStep(decision, endTurnStep)

        BattleActionDecisionService.goToNextStep(decision)
        BattleActionDecisionService.goToNextStep(decision)

        const actualStep: BattleActionDecisionStep =
            BattleActionDecisionService.getCurrentStep(decision)

        expect(actualStep).toBeUndefined()
    })
})
