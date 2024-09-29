import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie } from "../battleSquaddie"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { ResourceHandler } from "../../resource/resourceHandler"
import { makeResult } from "../../utils/ResultOrError"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import {
    CreateNewKnightSquaddie,
    CreateNewThiefSquaddie,
} from "../../utils/test/squaddie"
import { Recording, RecordingService } from "../history/recording"
import { BattleEvent, BattleEventService } from "../history/battleEvent"
import { DamageType } from "../../squaddie/squaddieService"
import { SquaddieTargetsOtherSquaddiesAnimator } from "./squaddieTargetsOtherSquaddiesAnimatior"
import { ActionAnimationPhase } from "./actionAnimation/actionAnimationConstants"
import { ActionTimer } from "./actionAnimation/actionTimer"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import { DecidedActionSquaddieEffectService } from "../../action/decided/decidedActionSquaddieEffect"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { MouseButton } from "../../utils/mouseConfig"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../history/battleActionSquaddieChange"
import { SquaddieSquaddieResultsService } from "../history/squaddieSquaddieResults"
import {
    BattleAction,
    BattleActionActionContextService,
    BattleActionService,
} from "../history/battleAction"
import { BattleActionQueueService } from "../history/battleActionQueue"

describe("SquaddieTargetsOtherSquaddiesAnimation", () => {
    let objectRepository: ObjectRepository
    let knightBattleSquaddie: BattleSquaddie
    let knightBattleSquaddieId = "knight_0"
    let knightTemplateId = "knight_0"
    let thiefBattleSquaddie: BattleSquaddie
    let thiefDynamicId = "thief_0"
    let thiefStaticId = "thief_0"

    let longswordActionTemplate: ActionTemplate
    let powerAttackLongswordAction: ActionTemplate
    let animator: SquaddieTargetsOtherSquaddiesAnimator
    let mockResourceHandler: jest.Mocked<ResourceHandler>
    let battleEventRecording: Recording

    let knightHitsThiefWithLongswordInstructionInProgress: ActionsThisRound
    let knightHitsThiefWithLongswordEvent: BattleEvent

    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        objectRepository = ObjectRepositoryService.new()
        ;({ thiefBattleSquaddie } = CreateNewThiefSquaddie({
            squaddieRepository: objectRepository,
            templateId: thiefStaticId,
            battleId: thiefDynamicId,
        }))

        longswordActionTemplate = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.VERSUS_ARMOR]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            longswordActionTemplate
        )
        ;({ knightBattleSquaddie } = CreateNewKnightSquaddie({
            squaddieRepository: objectRepository,
            templateId: knightTemplateId,
            battleId: knightBattleSquaddieId,
            actionTemplates: [longswordActionTemplate],
        }))

        animator = new SquaddieTargetsOtherSquaddiesAnimator()

        const oneDecisionInstruction = ProcessedActionService.new({
            actionPointCost: 1,
            processedActionEffects: [
                ProcessedActionSquaddieEffectService.newFromDecidedActionEffect(
                    {
                        decidedActionEffect:
                            DecidedActionSquaddieEffectService.new({
                                template: longswordActionTemplate
                                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                target: { q: 0, r: 0 },
                            }),
                        results: undefined,
                    }
                ),
            ],
        })

        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        mockResourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult(null))

        knightHitsThiefWithLongswordInstructionInProgress =
            ActionsThisRoundService.new({
                battleSquaddieId: "dynamic_squaddie",
                startingLocation: { q: 0, r: 0 },
                processedActions: [oneDecisionInstruction],
            })

        knightHitsThiefWithLongswordEvent = BattleEventService.new({
            processedAction: oneDecisionInstruction,
            results: SquaddieSquaddieResultsService.new({
                actingBattleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                targetedBattleSquaddieIds: [thiefDynamicId],
                squaddieChanges: [
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: thiefDynamicId,
                        damageExplanation: DamageExplanationService.new({
                            net: 1,
                        }),
                        healingReceived: 0,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    }),
                ],
                actionContext: BattleActionActionContextService.new({}),
            }),
        })
        battleEventRecording = { history: [] }
    })

    function mockActionTimerPhase(
        timer: ActionTimer,
        actionAnimationPhase: ActionAnimationPhase
    ) {
        return jest
            .spyOn(timer, "currentPhase", "get")
            .mockReturnValue(actionAnimationPhase)
    }

    it("will create an actor sprite and a target sprite", () => {
        RecordingService.addEvent(
            battleEventRecording,
            knightHitsThiefWithLongswordEvent
        )
        jest.spyOn(Date, "now").mockImplementation(() => 0)
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    actionsThisRound:
                        knightHitsThiefWithLongswordInstructionInProgress,
                    recording: battleEventRecording,
                }),
            }),
        })
        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        knightBattleSquaddie.battleSquaddieId,
                },
                action: { actionTemplateId: longswordActionTemplate.id },
                effect: { squaddie: [] },
            })
        )

        animator.reset(gameEngineState)
        animator.update(gameEngineState, mockedP5GraphicsContext)

        expect(animator.actorSprite).not.toBeUndefined()
        expect(animator.actorSprite.battleSquaddieId).toBe(
            knightBattleSquaddieId
        )

        expect(animator.targetSprites).not.toBeUndefined()
        expect(animator.targetSprites).toHaveLength(1)
        expect(animator.targetSprites[0].battleSquaddieId).toBe(thiefDynamicId)
    })

    it("will skip displaying the results if the user clicks", () => {
        RecordingService.addEvent(
            battleEventRecording,
            knightHitsThiefWithLongswordEvent
        )
        mockActionTimerPhase(
            animator.actionAnimationTimer,
            ActionAnimationPhase.INITIALIZED
        )
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    actionsThisRound:
                        knightHitsThiefWithLongswordInstructionInProgress,
                    recording: battleEventRecording,
                }),
            }),
        })
        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        knightBattleSquaddie.battleSquaddieId,
                },
                action: { actionTemplateId: longswordActionTemplate.id },
                effect: { squaddie: [] },
            })
        )

        animator.reset(gameEngineState)
        animator.update(gameEngineState, mockedP5GraphicsContext)
        mockActionTimerPhase(
            animator.actionAnimationTimer,
            ActionAnimationPhase.DURING_ACTION
        )

        animator.update(gameEngineState, mockedP5GraphicsContext)
        expect(animator.hasCompleted(gameEngineState)).toBeFalsy()

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
            mouseButton: MouseButton.ACCEPT,
        }

        animator.mouseEventHappened(gameEngineState, mouseEvent)
        animator.update(gameEngineState, mockedP5GraphicsContext)
        expect(animator.hasCompleted(gameEngineState)).toBeTruthy()
    })

    it("is complete at the end of the animation time", () => {
        RecordingService.addEvent(
            battleEventRecording,
            knightHitsThiefWithLongswordEvent
        )

        mockActionTimerPhase(
            animator.actionAnimationTimer,
            ActionAnimationPhase.INITIALIZED
        )
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    actionsThisRound:
                        knightHitsThiefWithLongswordInstructionInProgress,
                    recording: battleEventRecording,
                }),
            }),
        })
        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        knightBattleSquaddie.battleSquaddieId,
                },
                action: { actionTemplateId: longswordActionTemplate.id },
                effect: { squaddie: [] },
            })
        )

        animator.reset(gameEngineState)
        animator.update(gameEngineState, mockedP5GraphicsContext)
        expect(animator.hasCompleted(gameEngineState)).toBeFalsy()

        mockActionTimerPhase(
            animator.actionAnimationTimer,
            ActionAnimationPhase.FINISHED_SHOWING_RESULTS
        )
        animator.update(gameEngineState, mockedP5GraphicsContext)
        expect(animator.hasCompleted(gameEngineState)).toBeTruthy()
    })

    it("will set the battle action animation to true when it resets", () => {
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    actionsThisRound:
                        knightHitsThiefWithLongswordInstructionInProgress,
                    recording: battleEventRecording,
                }),
            }),
        })

        const battleAction: BattleAction = BattleActionService.new({
            actor: {
                actorBattleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            },
            action: { actionTemplateId: longswordActionTemplate.id },
            effect: { squaddie: [] },
        })
        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            battleAction
        )

        animator.reset(gameEngineState)

        expect(
            BattleActionService.isAnimationComplete(
                BattleActionQueueService.peek(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionQueue
                )
            )
        ).toBeTruthy()
    })
})
