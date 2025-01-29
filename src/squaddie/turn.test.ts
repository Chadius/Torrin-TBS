import {
    ActionPerformFailureReason,
    SquaddieTurn,
    SquaddieTurnService,
} from "./turn"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../action/template/actionEffectTemplate"
import { ActionResourceCostService } from "../action/actionResourceCost"
import { beforeEach, describe, expect, it } from "vitest"

describe("Squaddie turn and resources", () => {
    let turn: SquaddieTurn
    let actionSpends2ActionPoints: ActionTemplate
    beforeEach(() => {
        turn = SquaddieTurnService.new()
        actionSpends2ActionPoints = ActionTemplateService.new({
            id: "actionSpends2ActionPoints",
            name: "Power Attack",
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                }),
            ],
        })
    })

    describe("actions", () => {
        it("should start with 3 action points", () => {
            expect(turn.remainingActionPoints).toBe(3)
        })
        it("should spend 1 action by default", () => {
            SquaddieTurnService.spendActionPoints(
                turn,
                ActionTemplateService.new({
                    id: "actionSpends1ActionPoint",
                    name: "Power Attack",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                { [Trait.ATTACK]: true }
                            ),
                        }),
                    ],
                }).resourceCost.actionPoints
            )
            expect(turn.remainingActionPoints).toBe(2)
        })
        it("should spend multiple actions if action uses more", () => {
            SquaddieTurnService.spendActionPoints(
                turn,
                actionSpends2ActionPoints.resourceCost.actionPoints
            )
            expect(turn.remainingActionPoints).toBe(1)
        })
        it("will remove all action when you spend the entire round", () => {
            SquaddieTurnService.spendActionPoints(turn, "End Turn")
            expect(turn.remainingActionPoints).toBe(0)
        })
        it("should report when an action cannot be spent", () => {
            SquaddieTurnService.spendActionPoints(
                turn,
                actionSpends2ActionPoints.resourceCost.actionPoints
            )
            const query = SquaddieTurnService.canPerformAction(
                turn,
                actionSpends2ActionPoints
            )
            expect(query.canPerform).toBeFalsy()
            expect(query.reason).toBe(
                ActionPerformFailureReason.TOO_FEW_ACTIONS_REMAINING
            )
        })
        it("should give 3 action points upon starting a new round", () => {
            SquaddieTurnService.spendActionPoints(
                turn,
                actionSpends2ActionPoints.resourceCost.actionPoints
            )
            SquaddieTurnService.beginNewRound(turn)
            expect(turn.remainingActionPoints).toBe(3)
        })
        it("can spend arbitrary number of action points", () => {
            SquaddieTurnService.beginNewRound(turn)
            SquaddieTurnService.spendActionPoints(turn, 1)
            expect(turn.remainingActionPoints).toBe(2)
        })
        it("knows when it is out of action points", () => {
            expect(
                SquaddieTurnService.hasActionPointsRemaining(turn)
            ).toBeTruthy()
            SquaddieTurnService.spendActionPoints(turn, 3)
            expect(
                SquaddieTurnService.hasActionPointsRemaining(turn)
            ).toBeFalsy()
            SquaddieTurnService.beginNewRound(turn)
            expect(
                SquaddieTurnService.hasActionPointsRemaining(turn)
            ).toBeTruthy()
        })
        it("can end its turn", () => {
            SquaddieTurnService.endTurn(turn)
            expect(
                SquaddieTurnService.hasActionPointsRemaining(turn)
            ).toBeFalsy()
        })
    })
    describe("Marking action points", () => {
        it("can mark action points and knows when the remaining points are not enough", () => {
            SquaddieTurnService.markActionPoints(turn, 2)
            expect(turn.markedActionPoints).toBe(2)
            expect(turn.remainingActionPoints).toBe(3)
        })
        it("cannot mark more action points than it has available", () => {
            SquaddieTurnService.spendActionPoints(turn, 1)
            SquaddieTurnService.markActionPoints(turn, 3)
            expect(turn.markedActionPoints).toBe(2)
        })
        it("can override marked action points and knows when the remaining points are enough", () => {
            SquaddieTurnService.markActionPoints(turn, 2)
            SquaddieTurnService.markActionPoints(turn, 1)
            expect(turn.markedActionPoints).toBe(1)
        })
        it("resetting the turn should clear marked action points", () => {
            SquaddieTurnService.markActionPoints(turn, 2)
            SquaddieTurnService.beginNewRound(turn)
            expect(turn.markedActionPoints).toBe(0)
        })
        it("spending action points should clear marked action points", () => {
            SquaddieTurnService.markActionPoints(turn, 2)
            SquaddieTurnService.spendActionPoints(turn, 1)
            expect(turn.markedActionPoints).toBe(0)
        })
    })
})
