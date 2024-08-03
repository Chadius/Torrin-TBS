import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "./battleActionDecisionStep"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import { DamageType } from "../../squaddie/squaddieService"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"

describe("Action Builder", () => {
    let actionBuilderState: BattleActionDecisionStep
    let singleTargetAction: ActionTemplate

    beforeEach(() => {
        actionBuilderState = BattleActionDecisionStepService.new()
        singleTargetAction = ActionTemplateService.new({
            id: "single target",
            name: "single target",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    damageDescriptions: { [DamageType.BODY]: 2 },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        TARGETS_FOE: true,
                    }),
                }),
            ],
        })
    })

    it("Needs actor, action, target, and animation status upon creation", () => {
        expect(
            BattleActionDecisionStepService.isActionRecordComplete(
                actionBuilderState
            )
        ).toEqual(false)
        expect(
            BattleActionDecisionStepService.isActorSet(actionBuilderState)
        ).toEqual(false)
        expect(
            BattleActionDecisionStepService.isTargetConfirmed(
                actionBuilderState
            )
        ).toEqual(false)
        expect(
            BattleActionDecisionStepService.isAnimationComplete(
                actionBuilderState
            )
        ).toEqual(false)
    })

    it("can set the actor", () => {
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionBuilderState,
            battleSquaddieId: "battle squaddie",
        })

        expect(
            BattleActionDecisionStepService.isActorSet(actionBuilderState)
        ).toEqual(true)
        expect(
            BattleActionDecisionStepService.getActor(actionBuilderState)
        ).toEqual({
            battleSquaddieId: "battle squaddie",
        })
        expect(
            BattleActionDecisionStepService.isActionRecordComplete(
                actionBuilderState
            )
        ).toEqual(false)
    })

    describe("squaddie on squaddie action", () => {
        beforeEach(() => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionBuilderState,
                battleSquaddieId: "battle squaddie",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionBuilderState,
                actionTemplate: singleTargetAction,
            })
        })
        it("can set the action template without setting a target", () => {
            expect(
                BattleActionDecisionStepService.isActorSet(actionBuilderState)
            ).toEqual(true)
            expect(
                BattleActionDecisionStepService.isActionSet(actionBuilderState)
            ).toEqual(true)
            expect(
                BattleActionDecisionStepService.isTargetConfirmed(
                    actionBuilderState
                )
            ).toEqual(false)
            expect(
                BattleActionDecisionStepService.getAction(actionBuilderState)
            ).toEqual({
                actionTemplate: singleTargetAction,
            })
            expect(
                BattleActionDecisionStepService.isActionRecordComplete(
                    actionBuilderState
                )
            ).toEqual(false)
        })
        it("can consider the target for an action", () => {
            BattleActionDecisionStepService.setConsideredTarget({
                actionDecisionStep: actionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })

            expect(
                BattleActionDecisionStepService.isActorSet(actionBuilderState)
            ).toEqual(true)
            expect(
                BattleActionDecisionStepService.isTargetConsidered(
                    actionBuilderState
                )
            ).toEqual(true)
            expect(
                BattleActionDecisionStepService.isTargetConfirmed(
                    actionBuilderState
                )
            ).toEqual(false)

            expect(
                BattleActionDecisionStepService.getAction(actionBuilderState)
            ).toEqual({
                actionTemplate: singleTargetAction,
            })
            expect(
                BattleActionDecisionStepService.getTarget(actionBuilderState)
            ).toEqual({
                targetLocation: { q: 0, r: 1 },
                confirmed: false,
            })

            expect(
                BattleActionDecisionStepService.isActionRecordComplete(
                    actionBuilderState
                )
            ).toEqual(false)
        })
        it("can remove the considered target for an action", () => {
            BattleActionDecisionStepService.setConsideredTarget({
                actionDecisionStep: actionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })
            BattleActionDecisionStepService.removeTarget({
                actionDecisionStep: actionBuilderState,
            })

            expect(
                BattleActionDecisionStepService.isTargetConsidered(
                    actionBuilderState
                )
            ).toBeFalsy()
            expect(
                BattleActionDecisionStepService.isTargetConfirmed(
                    actionBuilderState
                )
            ).toBeFalsy()

            expect(
                BattleActionDecisionStepService.getAction(actionBuilderState)
            ).toEqual({
                actionTemplate: singleTargetAction,
            })
            expect(
                BattleActionDecisionStepService.getTarget(actionBuilderState)
            ).toBeUndefined()

            expect(
                BattleActionDecisionStepService.isActionRecordComplete(
                    actionBuilderState
                )
            ).toEqual(false)
        })
        it("can confirm an already considered target without declaring the target", () => {
            BattleActionDecisionStepService.setConsideredTarget({
                actionDecisionStep: actionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })
            BattleActionDecisionStepService.confirmAlreadyConsideredTarget({
                actionDecisionStep: actionBuilderState,
            })

            expect(
                BattleActionDecisionStepService.isTargetConsidered(
                    actionBuilderState
                )
            ).toEqual(true)
            expect(
                BattleActionDecisionStepService.isTargetConfirmed(
                    actionBuilderState
                )
            ).toEqual(true)
        })
        it("can set the target for an action", () => {
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })

            expect(
                BattleActionDecisionStepService.isActorSet(actionBuilderState)
            ).toEqual(true)
            expect(
                BattleActionDecisionStepService.isTargetConfirmed(
                    actionBuilderState
                )
            ).toEqual(true)

            expect(
                BattleActionDecisionStepService.getAction(actionBuilderState)
            ).toEqual({
                actionTemplate: singleTargetAction,
            })
            expect(
                BattleActionDecisionStepService.getTarget(actionBuilderState)
            ).toEqual({
                targetLocation: { q: 0, r: 1 },
                confirmed: true,
            })

            expect(
                BattleActionDecisionStepService.isActionRecordComplete(
                    actionBuilderState
                )
            ).toEqual(false)
        })
        it("Knows the action is complete if an actor, action, target and animation is complete", () => {
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })
            BattleActionDecisionStepService.setAnimationCompleted({
                actionDecisionStep: actionBuilderState,
                animationCompleted: true,
            })
            expect(
                BattleActionDecisionStepService.isActionRecordComplete(
                    actionBuilderState
                )
            ).toEqual(true)
        })
    })

    describe("movement action", () => {
        beforeEach(() => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionBuilderState,
                battleSquaddieId: "battle squaddie",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionBuilderState,
                movement: true,
            })
        })
        it("can set a move action without setting a target", () => {
            expect(
                BattleActionDecisionStepService.isActorSet(actionBuilderState)
            ).toEqual(true)
            expect(
                BattleActionDecisionStepService.getAction(actionBuilderState)
            ).toEqual({
                movement: true,
            })
            expect(
                BattleActionDecisionStepService.isActionRecordComplete(
                    actionBuilderState
                )
            ).toEqual(false)
        })
        it("can set the target for movement", () => {
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })
            expect(
                BattleActionDecisionStepService.getAction(actionBuilderState)
            ).toEqual({
                movement: true,
            })
            expect(
                BattleActionDecisionStepService.getTarget(actionBuilderState)
            ).toEqual({
                targetLocation: { q: 0, r: 1 },
                confirmed: true,
            })
        })
        it("Knows the action is complete if an actor, action, target and animation is complete", () => {
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })
            BattleActionDecisionStepService.setAnimationCompleted({
                actionDecisionStep: actionBuilderState,
                animationCompleted: true,
            })
            expect(
                BattleActionDecisionStepService.isActionRecordComplete(
                    actionBuilderState
                )
            ).toEqual(true)
        })
    })

    describe("end turn action", () => {
        beforeEach(() => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionBuilderState,
                battleSquaddieId: "battle squaddie",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionBuilderState,
                endTurn: true,
            })
        })
        it("can end the turn and set its target", () => {
            expect(
                BattleActionDecisionStepService.isActorSet(actionBuilderState)
            ).toEqual(true)
            expect(
                BattleActionDecisionStepService.isTargetConfirmed(
                    actionBuilderState
                )
            ).toEqual(true)
            expect(
                BattleActionDecisionStepService.getAction(actionBuilderState)
            ).toEqual({
                endTurn: true,
            })
            expect(
                BattleActionDecisionStepService.isActionRecordComplete(
                    actionBuilderState
                )
            ).toEqual(false)
        })
        it("Knows the action is complete if an actor, action, target and animation is complete", () => {
            BattleActionDecisionStepService.setAnimationCompleted({
                actionDecisionStep: actionBuilderState,
                animationCompleted: true,
            })
            expect(
                BattleActionDecisionStepService.isActionRecordComplete(
                    actionBuilderState
                )
            ).toEqual(true)
        })
    })

    it("can declare the action complete if it is a single target action and a single target is set and animated", () => {
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionBuilderState,
            battleSquaddieId: "battle squaddie",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionBuilderState,
            actionTemplate: singleTargetAction,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionBuilderState,
            targetLocation: { q: 0, r: 1 },
        })
        BattleActionDecisionStepService.setAnimationCompleted({
            actionDecisionStep: actionBuilderState,
            animationCompleted: true,
        })

        expect(
            BattleActionDecisionStepService.isActionRecordComplete(
                actionBuilderState
            )
        ).toEqual(true)
    })

    it("throws an error if no action is specified when it is set", () => {
        expect(() => {
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionBuilderState,
            })
        }).toThrow("addAction: missing actionTemplate, movement or end turn")
    })

    it("can remove the previously set action", () => {
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionBuilderState,
            battleSquaddieId: "battle squaddie",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionBuilderState,
            actionTemplate: singleTargetAction,
        })
        BattleActionDecisionStepService.removeAction({
            actionDecisionStep: actionBuilderState,
        })

        expect(
            BattleActionDecisionStepService.isActionSet(actionBuilderState)
        ).toEqual(false)
    })

    it("knows when the action is ready to animate", () => {
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionBuilderState,
            battleSquaddieId: "battle squaddie",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionBuilderState,
            actionTemplate: singleTargetAction,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionBuilderState,
            targetLocation: { q: 0, r: 1 },
        })

        expect(
            BattleActionDecisionStepService.isActionRecordReadyToAnimate(
                actionBuilderState
            )
        ).toEqual(true)

        expect(
            BattleActionDecisionStepService.isActionRecordComplete(
                actionBuilderState
            )
        ).toEqual(false)
    })
})
