import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngine"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import { BattleSquaddie, BattleSquaddieService } from "../battle/battleSquaddie"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ResourceHandler } from "../resource/resourceHandler"
import { MissionMap, MissionMapService } from "../missionMap/missionMap"
import { BattlePlayerSquaddieTarget } from "../battle/orchestratorComponents/battlePlayerSquaddieTarget"
import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../action/template/actionEffectSquaddieTemplate"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { makeResult } from "../utils/ResultOrError"
import { TerrainTileMapService } from "../hexMap/terrainTileMap"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../battle/history/actionsThisRound"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { BattlePhaseStateService } from "../battle/orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { CampaignService } from "../campaign/campaign"
import { ProcessedActionService } from "../action/processed/processedAction"
import { ProcessedActionSquaddieEffectService } from "../action/processed/processedActionSquaddieEffect"
import { DecidedActionSquaddieEffectService } from "../action/decided/decidedActionSquaddieEffect"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import { convertMapCoordinatesToScreenCoordinates } from "../hexMap/convertCoordinates"
import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../battle/orchestrator/battleOrchestratorComponent"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { DegreeOfSuccess } from "../battle/calculator/actionCalculator/degreeOfSuccess"
import { BattleOrchestratorMode } from "../battle/orchestrator/battleOrchestrator"
import { SquaddieTargetsOtherSquaddiesAnimator } from "../battle/animation/squaddieTargetsOtherSquaddiesAnimatior"
import { BattleSquaddieUsesActionOnSquaddie } from "../battle/orchestratorComponents/battleSquaddieUsesActionOnSquaddie"
import { DamageType } from "../squaddie/squaddieService"
import { SquaddieSkipsAnimationAnimator } from "../battle/animation/squaddieSkipsAnimationAnimator"
import { MouseButton } from "../utils/mouseConfig"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../battle/hud/summaryHUD"
import { BattleActionActionContextService } from "../battle/history/battleAction"
import { BattlePlayerActionConfirm } from "../battle/orchestratorComponents/battlePlayerActionConfirm"
import { BattleHUDListener } from "../battle/hud/battleHUD"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../battle/actionDecision/battleActionDecisionStep"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../battle/history/battleActionSquaddieChange"
import { SquaddieSquaddieResultsService } from "../battle/history/squaddieSquaddieResults"
import { InBattleAttributesService } from "../battle/stats/inBattleAttributes"
import { BattleActionRecorderService } from "../battle/history/battleActionRecorder"

describe("User Selects Target and Confirms", () => {
    let objectRepository: ObjectRepository
    let gameEngineState: GameEngineState

    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie
    let player2BattleSquaddie: BattleSquaddie

    let enemySquaddieTemplate: SquaddieTemplate
    let enemyBattleSquaddie: BattleSquaddie

    let attackAction: ActionTemplate

    let resourceHandler: ResourceHandler
    let missionMap: MissionMap

    let targeting: BattlePlayerSquaddieTarget
    let confirm: BattlePlayerActionConfirm
    let graphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.TARGET_FOE]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: { [DamageType.BODY]: 1 },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            attackAction
        )

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            playerSquaddieTemplate
        )

        playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            playerBattleSquaddie
        )

        player2BattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 2",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            player2BattleSquaddie
        )

        graphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(graphicsContext)
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult({ width: 1, height: 1 }))

        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 "],
            }),
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            location: {
                q: 0,
                r: 1,
            },
        })

        enemySquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                templateId: "enemy",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            enemySquaddieTemplate
        )

        enemyBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: enemySquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "enemy 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            enemyBattleSquaddie
        )

        targeting = new BattlePlayerSquaddieTarget()
        confirm = new BattlePlayerActionConfirm()
    })

    it("Clicking a target should show the confirmation window", () => {
        const actionsThisRound = useActionTemplateOnLocation({
            actionTemplate: attackAction,
            attackerBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            targetLocation: { q: 0, r: 2 },
        })

        const playerBattleActionBuilderState =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: playerBattleActionBuilderState,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: playerBattleActionBuilderState,
            actionTemplateId: attackAction.id,
        })

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: enemySquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
            location: {
                q: 0,
                r: 2,
            },
        })

        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep: playerBattleActionBuilderState,
            targetLocation: { q: 0, r: 2 },
        })

        gameEngineState = getGameEngineState({
            repository: objectRepository,
            actionsThisRound: actionsThisRound,
            missionMap,
            resourceHandler,
            playerBattleActionBuilderState,
        })

        targeting.update(gameEngineState, graphicsContext)

        let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            0,
            2,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        )
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        })
        targeting.update(gameEngineState, graphicsContext)

        expect(targeting.hasSelectedValidTarget).toBeTruthy()
        expect(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .processedActions
        ).toHaveLength(1)
        expect(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .processedActions[0].processedActionEffects
        ).toHaveLength(0)
    })

    describe("Confirming attack", () => {
        let actionsThisRound: ActionsThisRound

        beforeEach(() => {
            ;({ gameEngineState, actionsThisRound } = clickOnEnemy({
                actionTemplate: attackAction,
                attackerBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                targetBattleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                targetBattleTemplateId: enemyBattleSquaddie.squaddieTemplateId,
                targeting,
                repository: objectRepository,
                missionMap,
                graphicsContext,
                resourceHandler,
            }))
        })

        const confirmMethods = [
            {
                name: "mouse clicks confirm",
                action: () => {
                    clickOnConfirmTarget({ confirm, gameEngineState })
                },
            },
            {
                name: "keyboard presses accept",
                action: () => {
                    keyboardPressToConfirmTarget({ confirm, gameEngineState })
                },
            },
        ]

        it.each(confirmMethods)(
            `After Squaddie Targets is confirmed, will process the first action template via $name`,
            ({ action }) => {
                action()
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                ).toEqual(
                    ActionsThisRoundService.new({
                        battleSquaddieId: actionsThisRound.battleSquaddieId,
                        startingLocation: actionsThisRound.startingLocation,
                        previewedActionTemplateId: undefined,
                        processedActions: [
                            ProcessedActionService.new({
                                actionPointCost:
                                    actionsThisRound.processedActions[0]
                                        .actionPointCost,
                                processedActionEffects: [
                                    ProcessedActionSquaddieEffectService.newFromDecidedActionEffect(
                                        {
                                            decidedActionEffect:
                                                DecidedActionSquaddieEffectService.new(
                                                    {
                                                        template: attackAction
                                                            .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                                        target: { q: 0, r: 2 },
                                                    }
                                                ),
                                            results:
                                                SquaddieSquaddieResultsService.new(
                                                    {
                                                        actingBattleSquaddieId:
                                                            "player 0",
                                                        actionContext:
                                                            BattleActionActionContextService.new(
                                                                {
                                                                    targetSquaddieModifiers:
                                                                        {},
                                                                }
                                                            ),
                                                        squaddieChanges: [
                                                            BattleActionSquaddieChangeService.new(
                                                                {
                                                                    actorDegreeOfSuccess:
                                                                        DegreeOfSuccess.SUCCESS,
                                                                    damageExplanation:
                                                                        DamageExplanationService.new(
                                                                            {
                                                                                raw: 1,
                                                                                net: 1,
                                                                            }
                                                                        ),
                                                                    healingReceived: 0,
                                                                    attributesAfter:
                                                                        InBattleAttributesService.new(
                                                                            {
                                                                                armyAttributes:
                                                                                    {
                                                                                        armorClass: 0,
                                                                                        maxHitPoints: 5,
                                                                                        movement:
                                                                                            {
                                                                                                crossOverPits:
                                                                                                    false,
                                                                                                movementPerAction: 2,
                                                                                                passThroughWalls:
                                                                                                    false,
                                                                                            },
                                                                                    },
                                                                                currentHitPoints: 4,
                                                                            }
                                                                        ),
                                                                    attributesBefore:
                                                                        InBattleAttributesService.new(
                                                                            {
                                                                                armyAttributes:
                                                                                    {
                                                                                        armorClass: 0,
                                                                                        maxHitPoints: 5,
                                                                                        movement:
                                                                                            {
                                                                                                crossOverPits:
                                                                                                    false,
                                                                                                movementPerAction: 2,
                                                                                                passThroughWalls:
                                                                                                    false,
                                                                                            },
                                                                                    },
                                                                                currentHitPoints: 5,
                                                                            }
                                                                        ),
                                                                    battleSquaddieId:
                                                                        enemyBattleSquaddie.battleSquaddieId,
                                                                }
                                                            ),
                                                        ],
                                                        targetedBattleSquaddieIds:
                                                            ["enemy 0"],
                                                    }
                                                ),
                                        }
                                    ),
                                ],
                            }),
                        ],
                    })
                )
            }
        )

        it.each(confirmMethods)(
            `Knows the targeting system is done via $name`,
            ({ action }) => {
                action()
                expect(confirm.hasCompleted(gameEngineState)).toBeTruthy()
            }
        )

        it.each(confirmMethods)(
            `Next mode should be the Squaddie Actor via $name`,
            ({ action }) => {
                action()
                const battleOrchestratorChanges =
                    confirm.recommendStateChanges(gameEngineState)
                expect(battleOrchestratorChanges.nextMode).toEqual(
                    BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                )
            }
        )

        it.each(confirmMethods)(
            `Will add the expected battle action to the queue via $name`,
            ({ action }) => {
                action()
                const actualBattleAction =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                expect(actualBattleAction.actor.actorBattleSquaddieId).toEqual(
                    playerBattleSquaddie.battleSquaddieId
                )
                expect(actualBattleAction.action.actionTemplateId).toEqual(
                    attackAction.id
                )
                expect(
                    actualBattleAction.effect.squaddie[0].battleSquaddieId
                ).toEqual(enemyBattleSquaddie.battleSquaddieId)
                expect(actualBattleAction.effect.squaddie[0]).toEqual(
                    BattleActionSquaddieChangeService.new({
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        damageExplanation: DamageExplanationService.new({
                            raw: 1,
                            net: 1,
                        }),
                        healingReceived: 0,
                        attributesAfter: InBattleAttributesService.new({
                            armyAttributes: {
                                armorClass: 0,
                                maxHitPoints: 5,
                                movement: {
                                    crossOverPits: false,
                                    movementPerAction: 2,
                                    passThroughWalls: false,
                                },
                            },
                            currentHitPoints: 4,
                        }),
                        attributesBefore: InBattleAttributesService.new({
                            armyAttributes: {
                                armorClass: 0,
                                maxHitPoints: 5,
                                movement: {
                                    crossOverPits: false,
                                    movementPerAction: 2,
                                    passThroughWalls: false,
                                },
                            },
                            currentHitPoints: 5,
                        }),
                        battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                    })
                )
            }
        )
    })

    describe("Canceling attack", () => {
        let actionsThisRound: ActionsThisRound

        beforeEach(() => {
            ;({ gameEngineState, actionsThisRound } = clickOnEnemy({
                actionTemplate: attackAction,
                attackerBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                targetBattleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                targetBattleTemplateId: enemyBattleSquaddie.squaddieTemplateId,
                targeting,
                repository: objectRepository,
                missionMap,
                graphicsContext,
                resourceHandler,
            }))
        })

        const cancelMethods = [
            {
                name: "mouse clicks ACCEPT on lower right corner",
                action: () => {
                    confirm.mouseEventHappened(gameEngineState, {
                        eventType: OrchestratorComponentMouseEventType.CLICKED,
                        mouseX: ScreenDimensions.SCREEN_WIDTH,
                        mouseY: ScreenDimensions.SCREEN_HEIGHT,
                        mouseButton: MouseButton.ACCEPT,
                    })
                },
            },
            {
                name: "mouse clicks CANCEL",
                action: () => {
                    confirm.mouseEventHappened(gameEngineState, {
                        eventType: OrchestratorComponentMouseEventType.CLICKED,
                        mouseX: 0,
                        mouseY: 0,
                        mouseButton: MouseButton.CANCEL,
                    })
                },
            },
            {
                name: "keyboard presses CANCEL",
                action: () => {
                    confirm.keyEventHappened(gameEngineState, {
                        eventType: OrchestratorComponentKeyEventType.PRESSED,
                        keyCode: JSON.parse(
                            process.env.KEYBOARD_SHORTCUTS_BINDINGS_CANCEL
                        )[0],
                    })
                },
            },
        ]

        it.each(cancelMethods)(
            `does complete the confirm module via $name`,
            ({ action }) => {
                action()
                expect(confirm.hasCompleted(gameEngineState)).toBeTruthy()
            }
        )

        it.each(cancelMethods)(
            `did not select a valid target via $name`,
            ({ action }) => {
                action()
                expect(
                    BattleActionDecisionStepService.isTargetConsidered(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeFalsy()
            }
        )

        it.each(cancelMethods)(
            `did not confirm an action via $name`,
            ({ action }) => {
                action()
                expect(
                    BattleActionDecisionStepService.isTargetConfirmed(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeFalsy()
                expect(actionsThisRound.previewedActionTemplateId).toEqual(
                    attackAction.id
                )
                expect(actionsThisRound.processedActions).toHaveLength(0)
            }
        )
    })

    describe("Animator chooses correct mode", () => {
        let squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie
        let squaddieTargetsOtherSquaddiesAnimatorUpdateSpy: jest.SpyInstance
        let squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy: jest.SpyInstance
        let squaddieSkipsAnimationAnimatorUpdateSpy: jest.SpyInstance
        let squaddieSkipsAnimationAnimatorHasCompletedSpy: jest.SpyInstance

        beforeEach(() => {
            squaddieUsesActionOnSquaddie =
                new BattleSquaddieUsesActionOnSquaddie()
            squaddieTargetsOtherSquaddiesAnimatorUpdateSpy = jest
                .spyOn(
                    squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                    "update"
                )
                .mockImplementation()
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest
                .spyOn(
                    squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                    "hasCompleted"
                )
                .mockReturnValue(false)

            squaddieSkipsAnimationAnimatorUpdateSpy = jest
                .spyOn(
                    squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator,
                    "update"
                )
                .mockImplementation()
            squaddieSkipsAnimationAnimatorHasCompletedSpy = jest
                .spyOn(
                    squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator,
                    "hasCompleted"
                )
                .mockReturnValue(false)
        })

        describe("select next phase based on how the action animates", () => {
            const clickAndConfirmWithAttackAction = (
                attackAction: ActionTemplate
            ) => {
                ;({ gameEngineState } = clickOnEnemy({
                    actionTemplate: attackAction,
                    attackerBattleSquaddieId:
                        playerBattleSquaddie.battleSquaddieId,
                    targetBattleSquaddieId:
                        enemyBattleSquaddie.battleSquaddieId,
                    targetBattleTemplateId:
                        enemyBattleSquaddie.squaddieTemplateId,
                    targeting,
                    repository: objectRepository,
                    missionMap,
                    graphicsContext,
                    resourceHandler,
                }))
                clickOnConfirmTarget({ confirm, gameEngineState })

                confirm.recommendStateChanges(gameEngineState)
                confirm.reset(gameEngineState)
            }

            it("If the action animates we should switch to SquaddieSquaddieAnimation", () => {
                clickAndConfirmWithAttackAction(attackAction)

                squaddieUsesActionOnSquaddie.update(
                    gameEngineState,
                    graphicsContext
                )

                expect(
                    squaddieUsesActionOnSquaddie.squaddieActionAnimator
                ).toBeInstanceOf(SquaddieTargetsOtherSquaddiesAnimator)
                expect(
                    squaddieTargetsOtherSquaddiesAnimatorUpdateSpy
                ).toBeCalled()
                expect(
                    squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
                ).toBeCalled()
                expect(
                    squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
                ).toBeFalsy()
            })

            it("If the action does not animate we should switch to the non-animating phase", () => {
                ;(
                    attackAction
                        .actionEffectTemplates[0] as ActionEffectSquaddieTemplate
                ).traits.booleanTraits[Trait.SKIP_ANIMATION] = true
                clickAndConfirmWithAttackAction(attackAction)

                squaddieUsesActionOnSquaddie.update(
                    gameEngineState,
                    graphicsContext
                )

                expect(
                    squaddieUsesActionOnSquaddie.squaddieActionAnimator
                ).toBeInstanceOf(SquaddieSkipsAnimationAnimator)
                expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled()
                expect(
                    squaddieSkipsAnimationAnimatorHasCompletedSpy
                ).toBeCalled()
                expect(
                    squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
                ).toBeFalsy()
            })
        })
    })
})

const getGameEngineState = ({
    repository,
    actionsThisRound,
    missionMap,
    resourceHandler,
    playerBattleActionBuilderState,
}: {
    repository: ObjectRepository
    actionsThisRound?: ActionsThisRound
    missionMap: MissionMap
    resourceHandler: ResourceHandler
    playerBattleActionBuilderState: BattleActionDecisionStep
}): GameEngineState => {
    const gameEngineState = GameEngineStateService.new({
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                camera: new BattleCamera(0, 0),
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
                actionsThisRound,
                missionMap,
            }),
        }),
        repository,
        resourceHandler,
        campaign: CampaignService.default(),
    })

    const battleHUDListener = new BattleHUDListener("testBattleListener")
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION
    )
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION
    )
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_CONFIRMS_ACTION
    )
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_SELECTS_TARGET_LOCATION
    )

    gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
        playerBattleActionBuilderState

    gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
        SummaryHUDStateService.new({ mouseSelectionLocation: { x: 0, y: 0 } })
    SummaryHUDStateService.createCommandWindow({
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        resourceHandler: gameEngineState.resourceHandler,
        objectRepository: gameEngineState.repository,
        gameEngineState,
    })

    return gameEngineState
}

const useActionTemplateOnLocation = ({
    actionTemplate,
    attackerBattleSquaddieId,
    targetLocation,
}: {
    actionTemplate: ActionTemplate
    attackerBattleSquaddieId: string
    targetLocation: HexCoordinate
}): ActionsThisRound => {
    return ActionsThisRoundService.new({
        battleSquaddieId: attackerBattleSquaddieId,
        startingLocation: { q: 0, r: 0 },
        previewedActionTemplateId: actionTemplate.id,
        processedActions: [
            ProcessedActionService.new({
                actionPointCost: actionTemplate.actionPoints,
                processedActionEffects: [],
            }),
        ],
    })
}

const clickOnEnemy = ({
    actionTemplate,
    attackerBattleSquaddieId,
    targetBattleSquaddieId,
    targetBattleTemplateId,
    targeting,
    repository,
    missionMap,
    graphicsContext,
    resourceHandler,
}: {
    actionTemplate: ActionTemplate
    attackerBattleSquaddieId: string
    targetBattleSquaddieId: string
    targetBattleTemplateId: string
    targeting: BattlePlayerSquaddieTarget
    repository: ObjectRepository
    missionMap: MissionMap
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}) => {
    const actionsThisRound = ActionsThisRoundService.new({
        battleSquaddieId: attackerBattleSquaddieId,
        startingLocation: { q: 0, r: 0 },
        previewedActionTemplateId: actionTemplate.id,
    })

    const playerBattleActionBuilderState = BattleActionDecisionStepService.new()
    BattleActionDecisionStepService.setActor({
        actionDecisionStep: playerBattleActionBuilderState,
        battleSquaddieId: attackerBattleSquaddieId,
    })
    BattleActionDecisionStepService.addAction({
        actionDecisionStep: playerBattleActionBuilderState,
        actionTemplateId: actionTemplate.id,
    })

    MissionMapService.addSquaddie({
        missionMap,
        squaddieTemplateId: targetBattleTemplateId,
        battleSquaddieId: targetBattleSquaddieId,
        location: {
            q: 0,
            r: 2,
        },
    })

    BattleActionDecisionStepService.setConsideredTarget({
        actionDecisionStep: playerBattleActionBuilderState,
        targetLocation: { q: 0, r: 2 },
    })

    const gameEngineState = getGameEngineState({
        repository,
        actionsThisRound: actionsThisRound,
        missionMap,
        resourceHandler,
        playerBattleActionBuilderState,
    })

    targeting.update(gameEngineState, graphicsContext)

    let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
        0,
        2,
        ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
    )
    targeting.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.CLICKED,
        mouseX,
        mouseY,
        mouseButton: MouseButton.ACCEPT,
    })
    targeting.update(gameEngineState, graphicsContext)

    return {
        gameEngineState,
        actionsThisRound,
    }
}

const clickOnConfirmTarget = ({
    confirm,
    gameEngineState,
}: {
    confirm: BattlePlayerActionConfirm
    gameEngineState: GameEngineState
}) => {
    const confirmSelectionClick: OrchestratorComponentMouseEvent = {
        eventType: OrchestratorComponentMouseEventType.CLICKED,
        mouseX: ScreenDimensions.SCREEN_WIDTH,
        mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
        mouseButton: MouseButton.ACCEPT,
    }

    confirm.mouseEventHappened(gameEngineState, confirmSelectionClick)
}

const keyboardPressToConfirmTarget = ({
    confirm,
    gameEngineState,
}: {
    confirm: BattlePlayerActionConfirm
    gameEngineState: GameEngineState
}) => {
    const confirmSelectionPress: OrchestratorComponentKeyEvent = {
        eventType: OrchestratorComponentKeyEventType.PRESSED,
        keyCode: JSON.parse(process.env.KEYBOARD_SHORTCUTS_BINDINGS_ACCEPT)[0],
    }

    confirm.keyEventHappened(gameEngineState, confirmSelectionPress)
}
