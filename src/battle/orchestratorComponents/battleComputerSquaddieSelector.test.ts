import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattlePhase } from "./battlePhaseTracker"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    BattleOrchestratorChanges,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import {
    TerrainTileMap,
    TerrainTileMapService,
} from "../../hexMap/terrainTileMap"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { MissionMap } from "../../missionMap/missionMap"
import { BattleCamera, PanningInformation } from "../battleCamera"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { BattleEvent, BattleEventService } from "../history/battleEvent"
import { DetermineNextDecisionService } from "../teamStrategy/determineNextDecision"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    BattleComputerSquaddieSelector,
    SHOW_SELECTED_ACTION_TIME,
    SQUADDIE_SELECTOR_PANNING_TIME,
} from "./battleComputerSquaddieSelector"
import {
    DamageType,
    GetHitPoints,
    GetNumberOfActionPoints,
} from "../../squaddie/squaddieService"
import { BattlePhaseState } from "./battlePhaseController"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { CreateNewSquaddieMovementWithTraits } from "../../squaddie/movement"
import { TeamStrategyType } from "../teamStrategy/teamStrategy"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import { CampaignService } from "../../campaign/campaign"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import { DecidedActionEndTurnEffectService } from "../../action/decided/decidedActionEndTurnEffect"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ProcessedActionSquaddieEffect } from "../../action/processed/processedActionSquaddieEffect"
import { ProcessedActionEndTurnEffectService } from "../../action/processed/processedActionEndTurnEffect"
import { ActionEffectEndTurnTemplateService } from "../../action/template/actionEffectEndTurnTemplate"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { BattleHUDService } from "../hud/battleHUD"
import { MouseButton } from "../../utils/mouseConfig"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { MapGraphicsLayer } from "../../hexMap/mapGraphicsLayer"
import { BattleActionQueueService } from "../history/battleActionQueue"

describe("BattleComputerSquaddieSelector", () => {
    let selector: BattleComputerSquaddieSelector =
        new BattleComputerSquaddieSelector()
    let objectRepository: ObjectRepository = ObjectRepositoryService.new()
    let enemyDemonTemplate: SquaddieTemplate
    let enemyDemonBattleSquaddie: BattleSquaddie
    let enemyDemonBattleSquaddie2: BattleSquaddie
    let demonBiteAction: ActionTemplate
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let battlePhaseState: BattlePhaseState
    let teams: BattleSquaddieTeam[]
    let demonBiteActionDamage: number

    beforeEach(() => {
        selector = new BattleComputerSquaddieSelector()
        objectRepository = ObjectRepositoryService.new()
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        teams = []
    })

    const makeBattlePhaseTrackerWithEnemyTeam = (missionMap: MissionMap) => {
        const enemyTeam: BattleSquaddieTeam = {
            id: "teamId",
            name: "enemies cannot be controlled by the player",
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: [],
            iconResourceKey: "icon_enemy_team",
        }

        demonBiteActionDamage = 2
        demonBiteAction = ActionTemplateService.new({
            name: "demon bite",
            id: "demon_bite",
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: demonBiteActionDamage,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            demonBiteAction
        )
        ;({
            battleSquaddie: enemyDemonBattleSquaddie,
            squaddieTemplate: enemyDemonTemplate,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "enemy_demon",
            name: "Slither Demon",
            affiliation: SquaddieAffiliation.ENEMY,
            battleId: "enemy_demon_0",
            objectRepository: objectRepository,
            actionTemplateIds: [demonBiteAction.id],
            attributes: {
                maxHitPoints: 5,
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                }),
                armorClass: 0,
            },
        }))

        enemyDemonBattleSquaddie2 = BattleSquaddieService.newBattleSquaddie({
            squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
            battleSquaddieId: "enemy_demon_2",
            squaddieTurn: SquaddieTurnService.new(),
        })

        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            enemyDemonBattleSquaddie2
        )

        BattleSquaddieTeamService.addBattleSquaddieIds(enemyTeam, [
            enemyDemonBattleSquaddie.battleSquaddieId,
            enemyDemonBattleSquaddie2.battleSquaddieId,
        ])

        battlePhaseState = {
            currentAffiliation: BattlePhase.ENEMY,
            turnCount: 1,
        }

        teams.push(enemyTeam)

        missionMap.addSquaddie(
            enemyDemonTemplate.squaddieId.templateId,
            enemyDemonBattleSquaddie.battleSquaddieId,
            { q: 0, r: 0 }
        )
        missionMap.addSquaddie(
            enemyDemonBattleSquaddie.squaddieTemplateId,
            enemyDemonBattleSquaddie2.battleSquaddieId,
            { q: 0, r: 1 }
        )
    }

    const makeSquaddieMoveAction = (
        battleSquaddieId: string
    ): BattleActionDecisionStep[] => {
        const movementStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: movementStep,
            battleSquaddieId: battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: movementStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: movementStep,
            targetLocation: { q: 1, r: 1 },
        })

        return [movementStep]
    }

    describe("before making a decision", () => {
        let missionMap: MissionMap
        let strategySpy: jest.SpyInstance
        let camera: BattleCamera
        let gameEngineState: GameEngineState
        let dateSpy: jest.SpyInstance
        let drawSquaddieUtilitiesSpy: jest.SpyInstance
        let squaddieLocation: number[]

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 "],
                }),
            })

            makeBattlePhaseTrackerWithEnemyTeam(missionMap)

            const movementStep: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: movementStep,
                battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: movementStep,
                movement: true,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: movementStep,
                targetLocation: { q: 0, r: 0 },
            })

            strategySpy = jest
                .spyOn(DetermineNextDecisionService, "determineNextDecision")
                .mockReturnValue([movementStep])

            squaddieLocation =
                ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    0,
                    0
                )
            camera = new BattleCamera(
                squaddieLocation[0] + ScreenDimensions.SCREEN_WIDTH * 2,
                squaddieLocation[1] + ScreenDimensions.SCREEN_HEIGHT * 2
            )
            gameEngineState = GameEngineStateService.new({
                repository: objectRepository,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        battlePhaseState,
                        camera,
                        missionMap,
                        teams,
                        teamStrategiesById: {
                            teamId: [
                                {
                                    type: TeamStrategyType.END_TURN,
                                    options: {},
                                },
                            ],
                        },
                        recording: { history: [] },
                    }),
                }),
                campaign: CampaignService.default(),
            })

            dateSpy = jest.spyOn(Date, "now").mockImplementation(() => 0)
            drawSquaddieUtilitiesSpy = jest
                .spyOn(
                    DrawSquaddieUtilities,
                    "drawSquaddieMapIconAtMapLocation"
                )
                .mockImplementation(() => {})
        })

        afterEach(() => {
            dateSpy.mockRestore()
            drawSquaddieUtilitiesSpy.mockRestore()
            strategySpy.mockRestore()
        })

        it("moves camera to an uncontrollable squaddie before before moving", () => {
            camera.moveCamera()
            selector.update(gameEngineState, mockedP5GraphicsContext)
            expect(strategySpy).toHaveBeenCalled()

            expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
            expect(camera.isPanning()).toBeTruthy()
            const panningInfo: PanningInformation =
                camera.getPanningInformation()
            expect(panningInfo.xDestination).toBe(squaddieLocation[0])
            expect(panningInfo.yDestination).toBe(squaddieLocation[1])

            dateSpy.mockImplementation(() => SQUADDIE_SELECTOR_PANNING_TIME)
            camera.moveCamera()
            selector.update(gameEngineState, mockedP5GraphicsContext)

            expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
            expect(camera.isPanning()).toBeFalsy()
        })

        it("clears the action builder", () => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            selector.update(gameEngineState, mockedP5GraphicsContext)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).toBeUndefined()
        })
    })

    describe("squaddie team strategy ends the turn", () => {
        let missionMap: MissionMap

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 "],
                }),
            })
            makeBattlePhaseTrackerWithEnemyTeam(missionMap)
        })

        it("instructs the squaddie to end turn when the player cannot control the team squaddies", () => {
            const strategySpy = jest.spyOn(
                DetermineNextDecisionService,
                "determineNextDecision"
            )

            const gameEngineState: GameEngineState = GameEngineStateService.new(
                {
                    repository: objectRepository,
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                battlePhaseState,
                                missionMap,
                                recording: { history: [] },
                                teams,
                                teamStrategiesById: {
                                    teamId: [
                                        {
                                            type: TeamStrategyType.END_TURN,
                                            options: {},
                                        },
                                    ],
                                },
                            }),
                        }
                    ),
                    campaign: CampaignService.default(),
                }
            )

            selector.update(gameEngineState, mockedP5GraphicsContext)
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy()

            const processedAction = ProcessedActionService.new({
                actionPointCost: "End Turn",
                processedActionEffects: [
                    ProcessedActionEndTurnEffectService.newFromDecidedActionEffect(
                        {
                            decidedActionEffect:
                                DecidedActionEndTurnEffectService.new({
                                    template:
                                        ActionEffectEndTurnTemplateService.new(
                                            {}
                                        ),
                                }),
                        }
                    ),
                ],
            })
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            ).toEqual(
                ActionsThisRoundService.new({
                    battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                    startingLocation: { q: 0, r: 0 },
                    processedActions: [processedAction],
                })
            )

            const recommendation: BattleOrchestratorChanges =
                selector.recommendStateChanges(gameEngineState)
            expect(recommendation.nextMode).toBe(
                BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
            )

            const history =
                gameEngineState.battleOrchestratorState.battleState.recording
                    .history
            expect(history).toHaveLength(1)
            expect(history[0]).toStrictEqual(
                BattleEventService.new({
                    processedAction,
                    results: undefined,
                })
            )

            expect(strategySpy).toHaveBeenCalled()
            strategySpy.mockClear()
            expect(
                ActionsThisRoundService.getProcessedActionEffectToShow(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                )
            ).toEqual(processedAction.processedActionEffects[0])
        })

        describe("default to ending its turn if none of the strategies provide instruction", () => {
            let gameEngineState: GameEngineState
            let determineNextDecisionSpy: jest.SpyInstance
            beforeEach(() => {
                gameEngineState = GameEngineStateService.new({
                    repository: objectRepository,
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                battlePhaseState,
                                missionMap,
                                recording: { history: [] },
                                teams,
                                teamStrategiesById: {
                                    teamId: [
                                        {
                                            type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                            options: {},
                                        },
                                    ],
                                },
                            }),
                        }
                    ),
                })
                determineNextDecisionSpy = jest
                    .spyOn(
                        DetermineNextDecisionService,
                        "determineNextDecision"
                    )
                    .mockReturnValue(undefined)
            })

            it("will default to ending its turn if none of the strategies provide instruction", () => {
                selector.update(gameEngineState, mockedP5GraphicsContext)
                expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
                expect(determineNextDecisionSpy).toBeCalled()
                expect(
                    BattleActionQueueService.peek(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionQueue
                    ).action.isEndTurn
                ).toBeTruthy()

                const recommendation: BattleOrchestratorChanges =
                    selector.recommendStateChanges(gameEngineState)
                expect(recommendation.nextMode).toBe(
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
                )
            })

            it("will not pan the camera to the squaddie", () => {
                gameEngineState.battleOrchestratorState.battleState.camera =
                    new BattleCamera(
                        ScreenDimensions.SCREEN_WIDTH * 10,
                        ScreenDimensions.SCREEN_HEIGHT * 10
                    )
                selector.update(gameEngineState, mockedP5GraphicsContext)
                expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
                expect(determineNextDecisionSpy).toBeCalled()

                expect(
                    gameEngineState.battleOrchestratorState.battleState.camera.isPanning()
                ).toBeFalsy()
            })
        })
    })

    describe("computer decides to act", () => {
        let missionMap: MissionMap
        let hexMap: TerrainTileMap
        let addGraphicsLayerSpy: jest.SpyInstance
        let camera: BattleCamera

        beforeEach(() => {
            hexMap = TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 "],
            })
            addGraphicsLayerSpy = jest.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
            )

            missionMap = new MissionMap({
                terrainTileMap: hexMap,
            })
            makeBattlePhaseTrackerWithEnemyTeam(missionMap)

            missionMap.addSquaddie(
                enemyDemonTemplate.squaddieId.templateId,
                enemyDemonBattleSquaddie.battleSquaddieId,
                { q: 0, r: 0 }
            )
            missionMap.addSquaddie(
                enemyDemonTemplate.squaddieId.templateId,
                enemyDemonBattleSquaddie2.battleSquaddieId,
                { q: 0, r: 1 }
            )

            camera = new BattleCamera(
                ...ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    0,
                    0
                )
            )
        })
        afterEach(() => {
            addGraphicsLayerSpy.mockRestore()
        })

        it("will prepare to move if computer controlled squaddie wants to move", () => {
            const moveAction = makeSquaddieMoveAction(
                enemyDemonBattleSquaddie.battleSquaddieId
            )

            const state: GameEngineState = GameEngineStateService.new({
                repository: objectRepository,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        recording: { history: [] },
                        battlePhaseState,
                        camera,
                        missionMap,
                        teams,
                        teamStrategiesById: {
                            teamId: [
                                {
                                    type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                                    options: {},
                                },
                            ],
                        },
                    }),
                }),
                campaign: CampaignService.default(),
            })

            jest.spyOn(
                DetermineNextDecisionService,
                "determineNextDecision"
            ).mockReturnValue(moveAction)
            selector.update(state, mockedP5GraphicsContext)

            expect(selector.hasCompleted(state)).toBeTruthy()
            const recommendation: BattleOrchestratorChanges =
                selector.recommendStateChanges(state)
            expect(recommendation.nextMode).toBe(
                BattleOrchestratorMode.SQUADDIE_MOVER
            )

            expect(
                state.battleOrchestratorState.battleState.actionsThisRound
                    .battleSquaddieId
            ).toEqual("enemy_demon_0")
            expect(
                state.battleOrchestratorState.battleState.actionsThisRound
                    .processedActions
            ).toHaveLength(1)
            expect(
                state.battleOrchestratorState.battleState.actionsThisRound
                    .processedActions[0].processedActionEffects[0].type
            ).toEqual(ActionEffectType.MOVEMENT)

            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)
            ).toBeTruthy()
            expect(
                ActionsThisRoundService.getProcessedActionEffectToShow(
                    state.battleOrchestratorState.battleState.actionsThisRound
                ).type
            ).toEqual(ActionEffectType.MOVEMENT)

            expect(addGraphicsLayerSpy).toBeCalled()
        })

        describe("computer controlled squaddie acts with an action", () => {
            let gameEngineState: GameEngineState
            let demonBiteDecisionSteps: BattleActionDecisionStep[]

            beforeEach(() => {
                const actionStep: BattleActionDecisionStep =
                    BattleActionDecisionStepService.new()
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep: actionStep,
                    battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                })
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep: actionStep,
                    actionTemplateId: demonBiteAction.id,
                })
                BattleActionDecisionStepService.setConfirmedTarget({
                    actionDecisionStep: actionStep,
                    targetLocation: { q: 0, r: 1 },
                })
                demonBiteDecisionSteps = [actionStep]

                gameEngineState = GameEngineStateService.new({
                    repository: objectRepository,
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                battlePhaseState,
                                camera,
                                missionMap,
                                teams,
                                teamStrategiesById: {
                                    teamId: [
                                        {
                                            type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                                            options: {},
                                        },
                                    ],
                                },
                                recording: { history: [] },
                            }),
                        }
                    ),
                })
                jest.spyOn(
                    DetermineNextDecisionService,
                    "determineNextDecision"
                ).mockReturnValue(demonBiteDecisionSteps)

                jest.spyOn(Date, "now").mockImplementation(() => 0)
                selector.update(gameEngineState, mockedP5GraphicsContext)
            })

            it("will indicate the next action", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.battleSquaddieId
                ).toEqual(enemyDemonBattleSquaddie.battleSquaddieId)
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.processedActions
                ).toHaveLength(1)
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.processedActions[0]
                        .processedActionEffects[0].type
                ).toEqual(ActionEffectType.SQUADDIE)
            })

            it("highlight the map target and its spread", () => {
                expect(addGraphicsLayerSpy).toBeCalled()

                const addGraphicsLayerSpyLayer: MapGraphicsLayer =
                    addGraphicsLayerSpy.mock.calls[0][1]
                expect(addGraphicsLayerSpyLayer.highlights).toHaveLength(1)
                expect(
                    addGraphicsLayerSpyLayer.highlights[0].location
                ).toStrictEqual({ q: 0, r: 1 })
            })

            it("waits and then completes the component", () => {
                expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
                selector.update(gameEngineState, mockedP5GraphicsContext)

                jest.spyOn(Date, "now").mockImplementation(
                    () => SHOW_SELECTED_ACTION_TIME
                )
                selector.update(gameEngineState, mockedP5GraphicsContext)
                expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
            })

            it("waits and then will recommend squaddie squaddie action as the next field", () => {
                jest.spyOn(Date, "now").mockImplementation(
                    () => SHOW_SELECTED_ACTION_TIME
                )
                selector.update(gameEngineState, mockedP5GraphicsContext)
                const recommendation: BattleOrchestratorChanges =
                    selector.recommendStateChanges(gameEngineState)
                expect(recommendation.nextMode).toBe(
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
                )

                expect(
                    OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                        gameEngineState
                    )
                ).toBeTruthy()
                expect(
                    ActionsThisRoundService.getProcessedActionEffectToShow(
                        gameEngineState.battleOrchestratorState.battleState
                            .actionsThisRound
                    ).decidedActionEffect.type
                ).toEqual(ActionEffectType.SQUADDIE)
            })

            it("player can click to complete the component if an action is selected", () => {
                expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
                selector.update(gameEngineState, mockedP5GraphicsContext)

                const mouseEvent: OrchestratorComponentMouseEvent = {
                    eventType: OrchestratorComponentMouseEventType.CLICKED,
                    mouseX: 0,
                    mouseY: 0,
                    mouseButton: MouseButton.ACCEPT,
                }

                selector.mouseEventHappened(gameEngineState, mouseEvent)
                selector.update(gameEngineState, mockedP5GraphicsContext)
                expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
            })

            it("should consume the squaddie action points", () => {
                const { actionPointsRemaining } = GetNumberOfActionPoints({
                    squaddieTemplate: enemyDemonTemplate,
                    battleSquaddie: enemyDemonBattleSquaddie,
                })
                expect(actionPointsRemaining).toBe(
                    3 - demonBiteAction.actionPoints
                )
            })

            it("should add the results to the history", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleState
                        .recording.history
                ).toHaveLength(1)

                const mostRecentEvent: BattleEvent =
                    gameEngineState.battleOrchestratorState.battleState
                        .recording.history[0]
                expect(
                    mostRecentEvent.processedAction.processedActionEffects[0]
                        .type
                ).toEqual(ActionEffectType.SQUADDIE)

                const processedActionSquaddieEffect = mostRecentEvent
                    .processedAction
                    .processedActionEffects[0] as ProcessedActionSquaddieEffect
                const results = processedActionSquaddieEffect.results
                expect(results.actingBattleSquaddieId).toBe(
                    enemyDemonBattleSquaddie.battleSquaddieId
                )
                expect(results.targetedBattleSquaddieIds).toHaveLength(1)
                expect(results.targetedBattleSquaddieIds[0]).toBe(
                    enemyDemonBattleSquaddie2.battleSquaddieId
                )
                expect(
                    results.squaddieChanges.find(
                        (change) =>
                            change.battleSquaddieId ===
                            enemyDemonBattleSquaddie2.battleSquaddieId
                    )
                ).toBeTruthy()
            })

            it("should store the calculated results", () => {
                const mostRecentEvent: BattleEvent =
                    gameEngineState.battleOrchestratorState.battleState
                        .recording.history[0]
                const demonOneBitesDemonTwoResults =
                    mostRecentEvent.results.squaddieChanges.find(
                        (change) =>
                            change.battleSquaddieId ===
                            enemyDemonBattleSquaddie2.battleSquaddieId
                    )
                expect(demonOneBitesDemonTwoResults.damageTaken).toBe(
                    demonBiteActionDamage
                )

                const { maxHitPoints, currentHitPoints } = GetHitPoints({
                    squaddieTemplate: enemyDemonTemplate,
                    battleSquaddie: enemyDemonBattleSquaddie2,
                })
                expect(currentHitPoints).toBe(
                    maxHitPoints - demonBiteActionDamage
                )
            })
        })
    })
})
