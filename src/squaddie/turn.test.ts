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
import { ActionEffectSquaddieTemplateService } from "../action/template/actionEffectSquaddieTemplate"

describe("Squaddie turn and resources", () => {
    describe("actions", () => {
        let turn: SquaddieTurn
        let actionSpends2ActionPoints: ActionTemplate
        beforeEach(() => {
            turn = SquaddieTurnService.new()
            actionSpends2ActionPoints = ActionTemplateService.new({
                id: "actionSpends2ActionPoints",
                name: "Power Attack",
                actionPoints: 2,
                actionEffectTemplates: [
                    ActionEffectSquaddieTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                        }),
                    }),
                ],
            })
        })

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
                        ActionEffectSquaddieTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                { [Trait.ATTACK]: true }
                            ),
                        }),
                    ],
                }).actionPoints
            )
            expect(turn.remainingActionPoints).toBe(2)
        })
        it("should spend multiple actions if action uses more", () => {
            SquaddieTurnService.spendActionPoints(
                turn,
                actionSpends2ActionPoints.actionPoints
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
                actionSpends2ActionPoints.actionPoints
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
                actionSpends2ActionPoints.actionPoints
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
})
