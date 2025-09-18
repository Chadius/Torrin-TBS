import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattlePhase } from "./battlePhaseTracker"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import {
    DEFAULT_ACTION_POINTS_PER_TURN,
    SquaddieTurnService,
} from "../../squaddie/turn"
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
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleCamera, PanningInformation } from "../battleCamera"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
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
import { Damage, SquaddieService } from "../../squaddie/squaddieService"
import { BattlePhaseState } from "./battlePhaseController"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { SquaddieMovementService } from "../../squaddie/movement"
import { TeamStrategyType } from "../teamStrategy/teamStrategy"
import { BattleStateService } from "../battleState/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { CampaignService } from "../../campaign/campaign"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    VersusSquaddieResistance,
} from "../../action/template/actionEffectTemplate"
import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { MouseButton } from "../../utils/mouseConfig"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { MapGraphicsLayer } from "../../hexMap/mapLayer/mapGraphicsLayer"
import { BattleActionService } from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { TargetConstraintsService } from "../../action/targetConstraints"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import { ActionResourceCostService } from "../../action/actionResourceCost"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"

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
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                    damageDescriptions: {
                        [Damage.BODY]: demonBiteActionDamage,
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
            attributes: ArmyAttributesService.new({
                maxHitPoints: 5,
                movement: SquaddieMovementService.new({
                    movementPerAction: 2,
                }),
            }),
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

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
            battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
            battleSquaddieId: enemyDemonBattleSquaddie2.battleSquaddieId,
            originMapCoordinate: { q: 0, r: 1 },
        })
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
            targetCoordinate: { q: 1, r: 1 },
        })

        return [movementStep]
    }

    describe("before making a decision", () => {
        let missionMap: MissionMap
        let strategySpy: MockInstance
        let camera: BattleCamera
        let gameEngineState: GameEngineState
        let dateSpy: MockInstance
        let drawSquaddieUtilitiesSpy: MockInstance
        let squaddieLocation: number[]

        const setupStrategySpy = (
            battleActionDecisionStep: BattleActionDecisionStep
        ) => {
            strategySpy = vi
                .spyOn(DetermineNextDecisionService, "determineNextDecision")
                .mockReturnValue([battleActionDecisionStep])
        }

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 "],
                }),
            })

            makeBattlePhaseTrackerWithEnemyTeam(missionMap)

            const { x, y } =
                ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                    mapCoordinate: { q: 0, r: 0 },
                })
            squaddieLocation = [x, y]
            camera = new BattleCamera(x, y)
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
                    }),
                }),
                campaign: CampaignService.default(),
            })

            dateSpy = vi.spyOn(Date, "now").mockImplementation(() => 0)
            drawSquaddieUtilitiesSpy = vi
                .spyOn(
                    DrawSquaddieIconOnMapUtilities,
                    "drawSquaddieMapIconAtMapCoordinate"
                )
                .mockImplementation(() => {})
        })

        afterEach(() => {
            dateSpy.mockRestore()
            drawSquaddieUtilitiesSpy.mockRestore()
            if (strategySpy) strategySpy.mockRestore()
        })

        const expectCameraDoesNotPanAndComponentIsComplete = () => {
            camera.moveCamera()
            selector.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler!,
            })
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
            expect(camera.isPanning()).toBeFalsy()
            return true
        }

        it("moves camera to an uncontrollable squaddie if the squaddie is off screen and is using an action template", () => {
            const actionDecisionStep: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionDecisionStep,
                battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionTemplateId: "demon_bite",
                actionDecisionStep: actionDecisionStep,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionDecisionStep,
                targetCoordinate: { q: 0, r: 0 },
            })
            setupStrategySpy(actionDecisionStep)
            camera.xCoordinate = ScreenDimensions.SCREEN_WIDTH * 2
            camera.yCoordinate = ScreenDimensions.SCREEN_HEIGHT * 2
            gameEngineState.battleOrchestratorState.battleState.squaddieMovePath =
                [
                    {
                        cost: 0,
                        fromNode: { q: 0, r: 0 },
                        toNode: { q: 0, r: 0 },
                    },
                ]

            camera.moveCamera()
            selector.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler!,
            })

            expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
            expect(camera.isPanning()).toBeTruthy()
            const panningInfo: PanningInformation | undefined =
                camera.getPanningInformation()
            expect(panningInfo!.xDestination).toBe(squaddieLocation[0])
            expect(panningInfo!.yDestination).toBe(squaddieLocation[1])

            dateSpy.mockImplementation(() => SQUADDIE_SELECTOR_PANNING_TIME)
            expect(expectCameraDoesNotPanAndComponentIsComplete()).toBeTruthy()
        })

        it("does not move the camera if the squaddie movement is completely offscreen", () => {
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
                targetCoordinate: { q: 0, r: 0 },
            })
            setupStrategySpy(movementStep)

            camera.xCoordinate = ScreenDimensions.SCREEN_WIDTH * 2
            camera.yCoordinate = ScreenDimensions.SCREEN_HEIGHT * 2
            expect(expectCameraDoesNotPanAndComponentIsComplete()).toBeTruthy()
        })

        it("does not move the camera if the squaddie ends their turn", () => {
            const endTurnStep: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: endTurnStep,
                battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: endTurnStep,
                endTurn: true,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: endTurnStep,
                targetCoordinate: { q: 0, r: 0 },
            })
            setupStrategySpy(endTurnStep)

            camera.xCoordinate = ScreenDimensions.SCREEN_WIDTH * 2
            camera.yCoordinate = ScreenDimensions.SCREEN_HEIGHT * 2
            expect(expectCameraDoesNotPanAndComponentIsComplete()).toBeTruthy()
        })

        it("resets the action builder", () => {
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
                targetCoordinate: { q: 0, r: 0 },
            })
            setupStrategySpy(movementStep)
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            const resetSpy = vi.spyOn(BattleActionDecisionStepService, "reset")
            selector.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler!,
            })
            expect(resetSpy).toBeCalledWith(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
            resetSpy.mockRestore()
        })
    })

    describe("squaddie team strategy ends the turn", () => {
        let missionMap: MissionMap

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 "],
                }),
            })
            makeBattlePhaseTrackerWithEnemyTeam(missionMap)
        })

        it("instructs the squaddie to end turn when the player cannot control the team squaddies", () => {
            const strategySpy = vi.spyOn(
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

            selector.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler!,
            })
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy()

            const recommendation: BattleOrchestratorChanges | undefined =
                selector.recommendStateChanges(gameEngineState)
            expect(recommendation!.nextMode).toBe(
                BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
            )

            expect(
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toEqual(
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            enemyDemonBattleSquaddie.battleSquaddieId,
                    },
                    action: { isEndTurn: true },
                    effect: { endTurn: true },
                })
            )

            expect(strategySpy).toHaveBeenCalled()
            strategySpy.mockClear()
        })

        describe("default to ending its turn if none of the strategies provide instruction", () => {
            let gameEngineState: GameEngineState
            let determineNextDecisionSpy: MockInstance
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
                determineNextDecisionSpy = vi
                    .spyOn(
                        DetermineNextDecisionService,
                        "determineNextDecision"
                    )
                    .mockReturnValue([])
            })

            it("will default to ending its turn if none of the strategies provide instruction", () => {
                selector.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
                })
                expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
                expect(determineNextDecisionSpy).toBeCalled()
                expect(
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )?.action.isEndTurn
                ).toBeTruthy()

                const recommendation =
                    selector.recommendStateChanges(gameEngineState)
                expect(recommendation!.nextMode).toBe(
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
                )
            })

            it("will not pan the camera to the squaddie", () => {
                gameEngineState.battleOrchestratorState.battleState.camera =
                    new BattleCamera(
                        ScreenDimensions.SCREEN_WIDTH * 10,
                        ScreenDimensions.SCREEN_HEIGHT * 10
                    )
                selector.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
                })
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
        let addGraphicsLayerSpy: MockInstance
        let camera: BattleCamera

        beforeEach(() => {
            hexMap = TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 "],
            })
            addGraphicsLayerSpy = vi.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
            )

            missionMap = MissionMapService.new({
                terrainTileMap: hexMap,
            })
            makeBattlePhaseTrackerWithEnemyTeam(missionMap)

            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
                battleSquaddieId: enemyDemonBattleSquaddie.battleSquaddieId,
                originMapCoordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: enemyDemonTemplate.squaddieId.templateId,
                battleSquaddieId: enemyDemonBattleSquaddie2.battleSquaddieId,
                originMapCoordinate: { q: 0, r: 1 },
            })

            const { x, y } =
                ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                    mapCoordinate: { q: 0, r: 0 },
                })
            camera = new BattleCamera(x, y)
        })
        afterEach(() => {
            addGraphicsLayerSpy.mockRestore()
        })

        it("will prepare to move if computer controlled squaddie wants to move", () => {
            const moveAction = makeSquaddieMoveAction(
                enemyDemonBattleSquaddie.battleSquaddieId
            )

            const gameEngineState: GameEngineState = GameEngineStateService.new(
                {
                    repository: objectRepository,
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleHUD: BattleHUDService.new({}),
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
                                            type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
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

            vi.spyOn(
                DetermineNextDecisionService,
                "determineNextDecision"
            ).mockReturnValue(moveAction)
            selector.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler!,
            })

            expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
            const recommendation =
                selector.recommendStateChanges(gameEngineState)
            expect(recommendation!.nextMode).toBe(
                BattleOrchestratorMode.SQUADDIE_MOVER
            )

            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            ).toBeFalsy()
            const queuedBattleAction =
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            expect(queuedBattleAction!.actor.actorBattleSquaddieId).toEqual(
                "enemy_demon_0"
            )
            expect(queuedBattleAction!.action.isMovement).toBeTruthy()

            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn({
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                })
            ).toBeTruthy()
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
                    targetCoordinate: { q: 0, r: 1 },
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
                            }),
                        }
                    ),
                })
                vi.spyOn(
                    DetermineNextDecisionService,
                    "determineNextDecision"
                ).mockReturnValue(demonBiteDecisionSteps)

                vi.spyOn(Date, "now").mockImplementation(() => 0)
                selector.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
                })
            })

            it("will indicate the next action", () => {
                expect(
                    BattleActionRecorderService.isAnimationQueueEmpty(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                ).toBeFalsy()
                const queuedBattleAction =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                expect(queuedBattleAction!.actor.actorBattleSquaddieId).toEqual(
                    enemyDemonBattleSquaddie.battleSquaddieId
                )
                expect(queuedBattleAction!.action.actionTemplateId).toEqual(
                    demonBiteAction.id
                )
            })

            it("highlight the map target and its spread", () => {
                expect(addGraphicsLayerSpy).toBeCalled()

                const addGraphicsLayerSpyLayer: MapGraphicsLayer =
                    addGraphicsLayerSpy.mock.calls[0][1]
                expect(addGraphicsLayerSpyLayer.highlights).toHaveLength(1)
                expect(
                    addGraphicsLayerSpyLayer.highlights[0].coordinate
                ).toStrictEqual({ q: 0, r: 1 })
            })

            it("waits and then completes the battle orchestrator component", () => {
                expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
                selector.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
                })

                vi.spyOn(Date, "now").mockImplementation(
                    () => SHOW_SELECTED_ACTION_TIME
                )
                selector.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
                })
                expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
            })

            it("waits and then will recommend squaddie squaddie action as the next field", () => {
                vi.spyOn(Date, "now").mockImplementation(
                    () => SHOW_SELECTED_ACTION_TIME
                )
                selector.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
                })
                const recommendation =
                    selector.recommendStateChanges(gameEngineState)
                expect(recommendation!.nextMode).toBe(
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
                )

                expect(
                    OrchestratorUtilities.isSquaddieCurrentlyTakingATurn({
                        battleActionDecisionStep:
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionDecisionStep,
                        battleActionRecorder:
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionRecorder,
                    })
                ).toBeTruthy()

                expect(
                    BattleActionRecorderService.isAnimationQueueEmpty(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                ).toBeFalsy()
                const queuedBattleAction =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                expect(queuedBattleAction!.action.actionTemplateId).toEqual(
                    demonBiteAction.id
                )
            })

            it("player can click to complete the battle orchestrator component if an action is selected", () => {
                expect(selector.hasCompleted(gameEngineState)).toBeFalsy()
                selector.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
                })

                const mouseEvent: OrchestratorComponentMouseEvent = {
                    eventType: OrchestratorComponentMouseEventType.RELEASE,
                    mouseRelease: {
                        x: 0,
                        y: 0,
                        button: MouseButton.ACCEPT,
                    },
                }

                selector.mouseEventHappened(gameEngineState, mouseEvent)
                selector.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
                })
                expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
            })

            it("should consume the squaddie action points", () => {
                const { unSpentActionPoints } =
                    SquaddieService.getActionPointSpend({
                        battleSquaddie: enemyDemonBattleSquaddie,
                    })
                expect(unSpentActionPoints).toBe(
                    DEFAULT_ACTION_POINTS_PER_TURN -
                        demonBiteAction!.resourceCost!.actionPoints
                )
            })

            it("make sure battle action has the expected fields", () => {
                const actionToShow =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )

                expect(actionToShow!.actor.actorBattleSquaddieId).toEqual(
                    enemyDemonBattleSquaddie.battleSquaddieId
                )
                expect(actionToShow!.actor.actorContext).not.toBeUndefined()
            })

            it("should add the results to the history", () => {
                const mostRecentAction =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                expect(mostRecentAction!.action.actionTemplateId).toEqual(
                    demonBiteAction.id
                )

                const results = mostRecentAction!.effect.squaddie
                expect(results).toHaveLength(1)
                expect(results![0].battleSquaddieId).toEqual(
                    enemyDemonBattleSquaddie2.battleSquaddieId
                )
                expect(
                    results!.find(
                        (change) =>
                            change.battleSquaddieId ===
                            enemyDemonBattleSquaddie2.battleSquaddieId
                    )
                ).toBeTruthy()
            })

            it("should store the calculated results", () => {
                const mostRecentAction =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                const demonOneBitesDemonTwoResults =
                    mostRecentAction!.effect.squaddie!.find(
                        (change) =>
                            change.battleSquaddieId ===
                            enemyDemonBattleSquaddie2.battleSquaddieId
                    )
                expect(demonOneBitesDemonTwoResults!.damage.net).toBe(
                    demonBiteActionDamage
                )

                const { maxHitPoints, currentHitPoints } =
                    SquaddieService.getHitPoints({
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
