import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie } from "../battleSquaddie"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { ResourceHandler } from "../../resource/resourceHandler"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import {
    CreateNewKnightSquaddie,
    CreateNewThiefSquaddie,
} from "../../utils/test/squaddie"
import { DamageType } from "../../squaddie/squaddieService"
import { SquaddieTargetsOtherSquaddiesAnimator } from "./squaddieTargetsOtherSquaddiesAnimatior"
import { ActionAnimationPhase } from "./actionAnimation/actionAnimationConstants"
import { ActionTimer } from "./actionAnimation/actionTimer"
import { BattleStateService } from "../battleState/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    VersusSquaddieResistance,
} from "../../action/template/actionEffectTemplate"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { MouseButton } from "../../utils/mouseConfig"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../history/battleAction/battleActionSquaddieChange"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { TargetConstraintsService } from "../../action/targetConstraints"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlayerInputTestService } from "../../utils/test/playerInput"

describe("SquaddieTargetsOtherSquaddiesAnimation", () => {
    let objectRepository: ObjectRepository
    let knightBattleSquaddie: BattleSquaddie
    let knightBattleSquaddieId = "knight_0"
    let knightTemplateId = "knight_0"
    let thiefDynamicId = "thief_0"
    let thiefStaticId = "thief_0"

    let longswordActionTemplate: ActionTemplate
    let animator: SquaddieTargetsOtherSquaddiesAnimator
    let mockResourceHandler: ResourceHandler

    let knightHitsThiefWithLongswordInstructionBattleAction: BattleAction

    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        objectRepository = ObjectRepositoryService.new()
        CreateNewThiefSquaddie({
            squaddieRepository: objectRepository,
            templateId: thiefStaticId,
            battleId: thiefDynamicId,
        })

        longswordActionTemplate = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
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

        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        mockResourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 32, height: 32 })

        knightHitsThiefWithLongswordInstructionBattleAction =
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        knightBattleSquaddie.battleSquaddieId,
                },
                action: { actionTemplateId: longswordActionTemplate.id },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            battleSquaddieId: thiefDynamicId,
                            damageExplanation: DamageExplanationService.new({
                                net: 1,
                            }),
                            healingReceived: 0,
                            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        }),
                    ],
                },
            })
    })

    function mockActionTimerPhase(
        timer: ActionTimer,
        actionAnimationPhase: ActionAnimationPhase
    ) {
        return vi
            .spyOn(timer, "currentPhase", "get")
            .mockReturnValue(actionAnimationPhase)
    }

    it("will create an actor sprite and a target sprite", () => {
        vi.spyOn(Date, "now").mockImplementation(() => 0)
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                }),
            }),
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            knightHitsThiefWithLongswordInstructionBattleAction
        )

        animator.reset(gameEngineState)
        animator.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })

        expect(animator.actorSprite).not.toBeUndefined()
        expect(animator.actorSprite.battleSquaddieId).toBe(
            knightBattleSquaddieId
        )

        expect(animator.targetSprites).not.toBeUndefined()
        expect(animator.targetSprites).toHaveLength(1)
        expect(animator.targetSprites[0].battleSquaddieId).toBe(thiefDynamicId)
    })

    describe("will skip displaying the results", () => {
        const tests = [
            {
                name: "when mouse clicks ACCEPT",
                action: (gameEngineState: GameEngineState) => {
                    const mouseEvent: OrchestratorComponentMouseEvent = {
                        eventType: OrchestratorComponentMouseEventType.CLICKED,
                        mouseX: 0,
                        mouseY: 0,
                        mouseButton: MouseButton.ACCEPT,
                    }

                    animator.mouseEventHappened(gameEngineState, mouseEvent)
                },
            },
            {
                name: "when mouse clicks CANCEL",
                action: (gameEngineState: GameEngineState) => {
                    const mouseEvent: OrchestratorComponentMouseEvent = {
                        eventType: OrchestratorComponentMouseEventType.CLICKED,
                        mouseX: 0,
                        mouseY: 0,
                        mouseButton: MouseButton.CANCEL,
                    }

                    animator.mouseEventHappened(gameEngineState, mouseEvent)
                },
            },
            {
                name: "when keyboard presses ACCEPT",
                action: (gameEngineState: GameEngineState) => {
                    const keyboardEvent: OrchestratorComponentKeyEvent =
                        PlayerInputTestService.pressAcceptKey()
                    animator.keyEventHappened(gameEngineState, keyboardEvent)
                },
            },
        ]

        it.each(tests)(`$name `, ({ action }) => {
            mockActionTimerPhase(
                animator.actionAnimationTimer,
                ActionAnimationPhase.INITIALIZED
            )
            const gameEngineState: GameEngineState = GameEngineStateService.new(
                {
                    repository: objectRepository,
                    resourceHandler: mockResourceHandler,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                            }),
                        }
                    ),
                }
            )
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                knightHitsThiefWithLongswordInstructionBattleAction
            )

            animator.reset(gameEngineState)
            animator.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
            mockActionTimerPhase(
                animator.actionAnimationTimer,
                ActionAnimationPhase.DURING_ACTION
            )

            animator.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
            expect(animator.hasCompleted(gameEngineState)).toBeFalsy()

            action(gameEngineState)
            animator.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
            expect(animator.hasCompleted(gameEngineState)).toBeTruthy()
        })
    })

    it("is complete at the end of the animation time", () => {
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
                }),
            }),
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            knightHitsThiefWithLongswordInstructionBattleAction
        )

        animator.reset(gameEngineState)
        animator.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(animator.hasCompleted(gameEngineState)).toBeFalsy()

        mockActionTimerPhase(
            animator.actionAnimationTimer,
            ActionAnimationPhase.FINISHED_SHOWING_RESULTS
        )
        animator.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
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
                }),
            }),
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            knightHitsThiefWithLongswordInstructionBattleAction
        )

        animator.reset(gameEngineState)

        expect(
            BattleActionService.isAnimationComplete(
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            )
        ).toBeTruthy()
    })
})
