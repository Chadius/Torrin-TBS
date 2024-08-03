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
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import { ProcessedActionEndTurnEffectService } from "../../action/processed/processedActionEndTurnEffect"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import { DecidedActionSquaddieEffectService } from "../../action/decided/decidedActionSquaddieEffect"
import { DecidedActionEndTurnEffectService } from "../../action/decided/decidedActionEndTurnEffect"
import { ActionEffectEndTurnTemplateService } from "../../action/template/actionEffectEndTurnTemplate"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"

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

    describe("action needs one target", () => {
        it("suggests player squaddie target when an actor and action are set but no target", () => {
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionBuilderState,
                battleSquaddieId: "battleSquaddieId",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionBuilderState,
                actionTemplate: singleTargetAction,
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
                actionTemplate: singleTargetAction,
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
                actionTemplate: singleTargetAction,
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

    describe("getNextModeBasedOnActionsThisRound", () => {
        let endTurnActionsThisRound: ActionsThisRound
        let moveActionsThisRound: ActionsThisRound
        let squaddieActionsThisRound: ActionsThisRound

        beforeEach(() => {
            const endTurnActionEffect = ProcessedActionEndTurnEffectService.new(
                {
                    decidedActionEffect: DecidedActionEndTurnEffectService.new({
                        template: ActionEffectEndTurnTemplateService.new({}),
                    }),
                }
            )

            endTurnActionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battleSquaddieId",
                startingLocation: { q: 0, r: 0 },
                processedActions: [
                    ProcessedActionService.new({
                        processedActionEffects: [endTurnActionEffect],
                        decidedAction: DecidedActionService.new({
                            battleSquaddieId: "soldier",
                            actionPointCost: 3,
                            actionTemplateName: "action",
                            actionTemplateId: "id",
                            actionEffects: [
                                endTurnActionEffect.decidedActionEffect,
                            ],
                        }),
                    }),
                ],
            })

            const movementActionEffect =
                ProcessedActionMovementEffectService.new({
                    decidedActionEffect: DecidedActionMovementEffectService.new(
                        {
                            destination: { q: 0, r: 2 },
                            template: ActionEffectMovementTemplateService.new(
                                {}
                            ),
                        }
                    ),
                })

            moveActionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battleSquaddieId",
                startingLocation: { q: 0, r: 0 },
                processedActions: [
                    ProcessedActionService.new({
                        processedActionEffects: [movementActionEffect],
                        decidedAction: DecidedActionService.new({
                            battleSquaddieId: "soldier",
                            actionPointCost: 3,
                            actionTemplateName: "action",
                            actionTemplateId: "id",
                            actionEffects: [
                                movementActionEffect.decidedActionEffect,
                            ],
                        }),
                    }),
                ],
            })

            const squaddieActionEffect =
                ProcessedActionSquaddieEffectService.new({
                    decidedActionEffect: DecidedActionSquaddieEffectService.new(
                        {
                            target: { q: 0, r: 2 },
                            template: ActionEffectSquaddieTemplateService.new(
                                {}
                            ),
                        }
                    ),
                    results: undefined,
                })

            squaddieActionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battleSquaddieId",
                startingLocation: { q: 0, r: 0 },
                processedActions: [
                    ProcessedActionService.new({
                        processedActionEffects: [squaddieActionEffect],
                        decidedAction: DecidedActionService.new({
                            battleSquaddieId: "soldier",
                            actionPointCost: 3,
                            actionTemplateName: "action",
                            actionTemplateId: "id",
                            actionEffects: [
                                squaddieActionEffect.decidedActionEffect,
                            ],
                        }),
                    }),
                ],
            })
        })

        it("will recommend moving a squaddie if the next action effect is movement type", () => {
            expect(
                ActionComponentCalculator.getNextModeBasedOnActionsThisRound(
                    moveActionsThisRound
                )
            ).toEqual(BattleOrchestratorMode.SQUADDIE_MOVER)
        })
        it("will recommend using an action effect on a squaddie if the next action effect is squaddie type", () => {
            expect(
                ActionComponentCalculator.getNextModeBasedOnActionsThisRound(
                    squaddieActionsThisRound
                )
            ).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE)
        })
        it("will recommend acting on the map if the next action effect is end turn", () => {
            expect(
                ActionComponentCalculator.getNextModeBasedOnActionsThisRound(
                    endTurnActionsThisRound
                )
            ).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP)
        })
        it("will return undefined if there is no actions this round", () => {
            expect(
                ActionComponentCalculator.getNextModeBasedOnActionsThisRound(
                    undefined
                )
            ).toBeUndefined()
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
                actionTemplate: singleTargetAction,
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
                actionTemplate: singleTargetAction,
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
