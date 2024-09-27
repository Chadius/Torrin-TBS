import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "./battleActionDecisionStep"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import {
    ActionDecisionType,
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import { DamageType } from "../../squaddie/squaddieService"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { ActionComponentCalculator } from "./actionComponentCalculator"
import {
    BattleActionQueue,
    BattleActionQueueService,
} from "../history/battleActionQueue"
import { BattleActionService } from "../history/battleAction"

describe("ActionComponentCalculator", () => {
    let actionBuilderState: BattleActionDecisionStep
    let singleTargetAction: ActionTemplate
    beforeEach(() => {
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
        actionBuilderState = BattleActionDecisionStepService.new()
    })

    describe("Player squaddie completes the action", () => {
        it("suggests player squaddie selector when there is no actor", () => {
            const nextMode: BattleOrchestratorMode =
                ActionComponentCalculator.getNextOrchestratorComponentMode(
                    actionBuilderState
                )

            expect(nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR
            )
        })
        it("suggests player squaddie selector when there is no confirmed action", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionBuilderState,
                battleSquaddieId: "battleSquaddieId",
            })

            const nextMode: BattleOrchestratorMode =
                ActionComponentCalculator.getNextOrchestratorComponentMode(
                    actionBuilderState
                )
            expect(nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR
            )
        })
        it("suggests squaddie uses action on map when the action ends the turn", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionBuilderState,
                battleSquaddieId: "battleSquaddieId",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionBuilderState,
                endTurn: true,
            })

            const nextMode: BattleOrchestratorMode =
                ActionComponentCalculator.getNextOrchestratorComponentMode(
                    actionBuilderState
                )
            expect(nextMode).toEqual(
                BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
            )
        })
        it("suggests squaddie mover when action is to move", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionBuilderState,
                battleSquaddieId: "battleSquaddieId",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionBuilderState,
                movement: true,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })

            const nextMode: BattleOrchestratorMode =
                ActionComponentCalculator.getNextOrchestratorComponentMode(
                    actionBuilderState
                )
            expect(nextMode).toEqual(BattleOrchestratorMode.SQUADDIE_MOVER)
        })
    })

    describe("player selects action that needs a target", () => {
        it("suggests player squaddie target when an actor and action are set but no target", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionBuilderState,
                battleSquaddieId: "battleSquaddieId",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionBuilderState,
                actionTemplateId: singleTargetAction.id,
            })

            const nextMode: BattleOrchestratorMode =
                ActionComponentCalculator.getNextOrchestratorComponentMode(
                    actionBuilderState
                )

            expect(nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET
            )
        })
        it("suggests player squaddie target when an actor and action are set but target is considered", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionBuilderState,
                battleSquaddieId: "battleSquaddieId",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionBuilderState,
                actionTemplateId: singleTargetAction.id,
            })
            BattleActionDecisionStepService.setConsideredTarget({
                actionDecisionStep: actionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })

            const nextMode: BattleOrchestratorMode =
                ActionComponentCalculator.getNextOrchestratorComponentMode(
                    actionBuilderState
                )

            expect(nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET
            )
        })
        it("suggests squaddie uses action on squaddie when actor, action and target are selected but animation is incomplete", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionBuilderState,
                battleSquaddieId: "battleSquaddieId",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionBuilderState,
                actionTemplateId: singleTargetAction.id,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionBuilderState,
                targetLocation: { q: 0, r: 1 },
            })

            const nextMode: BattleOrchestratorMode =
                ActionComponentCalculator.getNextOrchestratorComponentMode(
                    actionBuilderState
                )

            expect(nextMode).toEqual(
                BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
            )
        })
    })

    describe("getNextModeBasedOnBattleActionQueue", () => {
        let battleActionQueue: BattleActionQueue

        beforeEach(() => {
            battleActionQueue = BattleActionQueueService.new()
        })

        it("will recommend moving a squaddie if the next action effect is movement type", () => {
            BattleActionQueueService.add(
                battleActionQueue,
                BattleActionService.new({
                    actor: { actorBattleSquaddieId: "actor" },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startLocation: { q: 0, r: 0 },
                            endLocation: { q: 0, r: 2 },
                        },
                    },
                })
            )

            expect(
                ActionComponentCalculator.getNextModeBasedOnBattleActionQueue(
                    battleActionQueue
                )
            ).toEqual(BattleOrchestratorMode.SQUADDIE_MOVER)
        })
        it("will recommend using an action effect on a squaddie if the next action effect is squaddie type", () => {
            BattleActionQueueService.add(
                battleActionQueue,
                BattleActionService.new({
                    actor: { actorBattleSquaddieId: "actor" },
                    action: { actionTemplateId: "actionTemplate" },
                    effect: {
                        squaddie: [],
                    },
                })
            )
            expect(
                ActionComponentCalculator.getNextModeBasedOnBattleActionQueue(
                    battleActionQueue
                )
            ).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE)
        })
        it("will recommend acting on the map if the next action effect is end turn", () => {
            BattleActionQueueService.add(
                battleActionQueue,
                BattleActionService.new({
                    actor: { actorBattleSquaddieId: "actor" },
                    action: { isEndTurn: true },
                    effect: {
                        endTurn: true,
                    },
                })
            )

            expect(
                ActionComponentCalculator.getNextModeBasedOnBattleActionQueue(
                    battleActionQueue
                )
            ).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP)
        })
        it("will return player hud controller if there are no actions this round", () => {
            expect(
                ActionComponentCalculator.getNextModeBasedOnBattleActionQueue(
                    battleActionQueue
                )
            ).toEqual(BattleOrchestratorMode.PLAYER_HUD_CONTROLLER)
        })
    })
    describe("getPendingActionDecisions", () => {
        it("undefined action builder needs actor and action", () => {
            expect(
                ActionComponentCalculator.getPendingActionDecisions(undefined)
            ).toEqual(
                expect.arrayContaining([
                    ActionDecisionType.ACTOR_SELECTION,
                    ActionDecisionType.ACTION_SELECTION,
                ])
            )
        })
        it("new action builder needs actor and action", () => {
            const newBuilderState = BattleActionDecisionStepService.new()

            expect(
                ActionComponentCalculator.getPendingActionDecisions(
                    newBuilderState
                )
            ).toEqual(
                expect.arrayContaining([
                    ActionDecisionType.ACTOR_SELECTION,
                    ActionDecisionType.ACTION_SELECTION,
                ])
            )
        })

        it("action builder with an actor needs an action", () => {
            const builderStateWithActor = BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: builderStateWithActor,
                battleSquaddieId: "battleSquaddieId",
            })

            expect(
                ActionComponentCalculator.getPendingActionDecisions(
                    builderStateWithActor
                )
            ).toEqual(
                expect.arrayContaining([ActionDecisionType.ACTION_SELECTION])
            )
        })
        it("action builder with an actor and single target action needs a target", () => {
            const builderStateWithActor = BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: builderStateWithActor,
                battleSquaddieId: "battleSquaddieId",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: builderStateWithActor,
                actionTemplateId: singleTargetAction.id,
            })

            expect(
                ActionComponentCalculator.getPendingActionDecisions(
                    builderStateWithActor
                )
            ).toEqual(
                expect.arrayContaining([ActionDecisionType.TARGET_SQUADDIE])
            )
        })
        it("action builder with an actor, single target action and target is settled", () => {
            const builderStateWithActor = BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: builderStateWithActor,
                battleSquaddieId: "battleSquaddieId",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: builderStateWithActor,
                actionTemplateId: singleTargetAction.id,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: builderStateWithActor,
                targetLocation: { q: 0, r: 1 },
            })

            expect(
                ActionComponentCalculator.getPendingActionDecisions(
                    builderStateWithActor
                )
            ).toHaveLength(0)
        })
    })
})
