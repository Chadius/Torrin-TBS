import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie } from "../battleSquaddie"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../orchestrator/battleOrchestratorState"
import { BattleSquaddieMover } from "./battleSquaddieMover"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParams"
import { getResultOrThrowError, makeResult } from "../../utils/ResultOrError"
import { TIME_TO_MOVE } from "../animation/squaddieMoveAnimationUtils"
import {
    GetTargetingShapeGenerator,
    TargetingShape,
} from "../targeting/targetingShapeGenerator"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { CampaignService } from "../../campaign/campaign"
import { BattleHUDListener, BattleHUDService } from "../hud/battleHUD"
import { BattlePhase } from "./battlePhaseTracker"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { MouseButton, MouseClickService } from "../../utils/mouseConfig"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"

describe("BattleSquaddieMover", () => {
    let squaddieRepo: ObjectRepository
    let player1Static: SquaddieTemplate
    let player1BattleSquaddie: BattleSquaddie
    let enemy1Static: SquaddieTemplate
    let enemy1Dynamic: BattleSquaddie
    let map: MissionMap
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        squaddieRepo = ObjectRepositoryService.new()
        map = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 ", " 1 1 "],
            }),
        })
        ;({
            squaddieTemplate: player1Static,
            battleSquaddie: player1BattleSquaddie,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "Player1",
            templateId: "player_1",
            battleId: "player_1",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: squaddieRepo,
            actionTemplateIds: [],
        }))
        ;({ squaddieTemplate: enemy1Static, battleSquaddie: enemy1Dynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Enemy1",
                templateId: "enemy_1",
                battleId: "enemy_1",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: squaddieRepo,
                actionTemplateIds: [],
            }))
    })

    it("is complete once enough time passes and the squaddie finishes moving", () => {
        MissionMapService.addSquaddie({
            missionMap: map,
            squaddieTemplateId: "player_1",
            battleSquaddieId: "player_1",
            coordinate: { q: 0, r: 0 },
        })

        const searchResults: SearchResult = PathfinderService.search({
            searchParameters: SearchParametersService.new({
                startLocations: [{ q: 0, r: 0 }],
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                canStopOnSquaddies: true,
                movementPerAction: 99,
                shapeGenerator: getResultOrThrowError(
                    GetTargetingShapeGenerator(TargetingShape.SNAKE)
                ),
                maximumDistanceMoved: undefined,
                minimumDistanceMoved: undefined,
                ignoreTerrainCost: false,
                canPassOverPits: false,
                canPassThroughWalls: false,
                stopLocations: [{ q: 1, r: 1 }],
                numberOfActions: 1,
            }),
            missionMap: map,
            objectRepository: squaddieRepo,
        })

        const movePath: SearchPath =
            SearchResultsService.getShortestPathToLocation(searchResults, 1, 1)

        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: squaddieRepo,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    missionMap: map,
                    searchPath: movePath,
                }),
            }),
            campaign: CampaignService.default(),
        })
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: "player_1",
                },
                action: {
                    isMovement: true,
                },
                effect: {
                    movement: {
                        startLocation: { q: 0, r: 0 },
                        endLocation: { q: 1, r: 1 },
                    },
                },
            })
        )

        const mover: BattleSquaddieMover = new BattleSquaddieMover()
        jest.spyOn(Date, "now").mockImplementation(() => 1)
        mover.update(gameEngineState, mockedP5GraphicsContext)
        expect(mover.hasCompleted(gameEngineState)).toBeFalsy()

        jest.spyOn(Date, "now").mockImplementation(() => 1 + TIME_TO_MOVE)
        mover.update(gameEngineState, mockedP5GraphicsContext)
        expect(mover.hasCompleted(gameEngineState)).toBeTruthy()
        mover.reset(gameEngineState)
        expect(mover.animationStartTime).toBeUndefined()
    })

    it("sends a message once the squaddie finishes moving", () => {
        MissionMapService.addSquaddie({
            missionMap: map,
            squaddieTemplateId: "player_1",
            battleSquaddieId: "player_1",
            coordinate: { q: 0, r: 0 },
        })

        const searchResults: SearchResult = PathfinderService.search({
            searchParameters: SearchParametersService.new({
                startLocations: [{ q: 0, r: 0 }],
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                canStopOnSquaddies: true,
                movementPerAction: 99,
                shapeGenerator: getResultOrThrowError(
                    GetTargetingShapeGenerator(TargetingShape.SNAKE)
                ),
                maximumDistanceMoved: undefined,
                minimumDistanceMoved: undefined,
                ignoreTerrainCost: false,
                canPassOverPits: false,
                canPassThroughWalls: false,
                stopLocations: [{ q: 1, r: 1 }],
                numberOfActions: 1,
            }),
            missionMap: map,
            objectRepository: squaddieRepo,
        })

        const movePath: SearchPath =
            SearchResultsService.getShortestPathToLocation(searchResults, 1, 1)

        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: squaddieRepo,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    missionMap: map,
                    searchPath: movePath,
                }),
            }),
            campaign: CampaignService.default(),
        })
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: "player_1",
                },
                action: {
                    isMovement: true,
                },
                effect: {
                    movement: {
                        startLocation: { q: 0, r: 0 },
                        endLocation: { q: 1, r: 1 },
                    },
                },
            })
        )

        const messageSpy: jest.SpyInstance = jest.spyOn(
            gameEngineState.messageBoard,
            "sendMessage"
        )

        const mover: BattleSquaddieMover = new BattleSquaddieMover()
        jest.spyOn(Date, "now").mockImplementation(() => 1)
        mover.update(gameEngineState, mockedP5GraphicsContext)

        jest.spyOn(Date, "now").mockImplementation(() => 1 + TIME_TO_MOVE)
        mover.update(gameEngineState, mockedP5GraphicsContext)
        mover.reset(gameEngineState)

        expect(messageSpy).toBeCalledWith({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
    })

    describe("reset actions based on squaddie", () => {
        const setupSquaddie = ({
            squaddieAffiliation,
        }: {
            squaddieAffiliation: SquaddieAffiliation
        }): BattleOrchestratorState => {
            const searchResults: SearchResult = PathfinderService.search({
                searchParameters: SearchParametersService.new({
                    startLocations: [{ q: 0, r: 0 }],
                    squaddieAffiliation: squaddieAffiliation,
                    canStopOnSquaddies: true,
                    movementPerAction: 999,
                    shapeGenerator: getResultOrThrowError(
                        GetTargetingShapeGenerator(TargetingShape.SNAKE)
                    ),
                    maximumDistanceMoved: undefined,
                    minimumDistanceMoved: 0,
                    ignoreTerrainCost: false,
                    canPassOverPits: false,
                    canPassThroughWalls: false,
                    stopLocations: [{ q: 1, r: 1 }],
                    numberOfActions: 1,
                }),
                missionMap: map,
                objectRepository: squaddieRepo,
            })

            const movePath: SearchPath =
                SearchResultsService.getShortestPathToLocation(
                    searchResults,
                    1,
                    1
                )

            return BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: map,
                    searchPath: movePath,
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 0,
                    },
                }),
            })
        }

        describe("when the squaddie currently acting runs out of actions and finishes moving", () => {
            let mover: BattleSquaddieMover
            let gameEngineState: GameEngineState

            beforeEach(() => {
                MissionMapService.addSquaddie({
                    missionMap: map,
                    squaddieTemplateId: "player_1",
                    battleSquaddieId: "player_1",
                    coordinate: { q: 0, r: 0 },
                })

                let mockResourceHandler = mocks.mockResourceHandler(
                    mockedP5GraphicsContext
                )
                mockResourceHandler.getResource = jest
                    .fn()
                    .mockReturnValue(makeResult(null))

                gameEngineState = GameEngineStateService.new({
                    battleOrchestratorState: setupSquaddie({
                        squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    }),
                    repository: squaddieRepo,
                    resourceHandler: mockResourceHandler,
                })
                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    BattleActionService.new({
                        actor: {
                            actorBattleSquaddieId: "player_1",
                        },
                        action: {
                            isMovement: true,
                        },
                        effect: {
                            movement: {
                                startLocation: { q: 0, r: 0 },
                                endLocation: { q: 1, r: 1 },
                            },
                        },
                    })
                )

                player1BattleSquaddie.squaddieTurn.remainingActionPoints = 0

                mover = new BattleSquaddieMover()
                jest.spyOn(Date, "now").mockImplementation(() => 1)
                mover.update(gameEngineState, mockedP5GraphicsContext)
                jest.spyOn(Date, "now").mockImplementation(
                    () => 1 + TIME_TO_MOVE
                )
                mover.update(gameEngineState, mockedP5GraphicsContext)
            })

            it("hides the HUD", () => {
                mover.reset(gameEngineState)
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState
                ).toBeUndefined()
            })
        })

        describe("squaddie has action points remaining after moving", () => {
            let mover: BattleSquaddieMover
            let gameEngineState: GameEngineState
            let dateSpy: jest.SpyInstance

            beforeEach(() => {
                MissionMapService.addSquaddie({
                    missionMap: map,
                    squaddieTemplateId: "player_1",
                    battleSquaddieId: "player_1",
                    coordinate: { q: 0, r: 0 },
                })

                let mockResourceHandler = mocks.mockResourceHandler(
                    mockedP5GraphicsContext
                )
                mockResourceHandler.getResource = jest
                    .fn()
                    .mockReturnValue(makeResult(null))
                gameEngineState = GameEngineStateService.new({
                    battleOrchestratorState: setupSquaddie({
                        squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    }),
                    resourceHandler: mockResourceHandler,
                    repository: squaddieRepo,
                    campaign: CampaignService.default(),
                })

                const battleAction: BattleAction = BattleActionService.new({
                    actor: { actorBattleSquaddieId: "player_1" },
                    action: { isMovement: true },
                    effect: {
                        movement: {
                            startLocation: { q: 0, r: 0 },
                            endLocation: { q: 0, r: 0 },
                        },
                    },
                })
                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    battleAction
                )

                const battleHUDListener = new BattleHUDListener(
                    "battleHUDListener"
                )
                battleHUDListener.receiveMessage({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: "player_1",
                    selectionMethod: {
                        mouse: MouseClickService.new({
                            x: 0,
                            y: 0,
                            button: MouseButton.ACCEPT,
                        }),
                    },
                })

                mover = new BattleSquaddieMover()
                dateSpy = jest.spyOn(Date, "now").mockImplementation(() => 1)
                mover.update(gameEngineState, mockedP5GraphicsContext)
                dateSpy = jest
                    .spyOn(Date, "now")
                    .mockImplementation(() => 1 + TIME_TO_MOVE)
                mover.update(gameEngineState, mockedP5GraphicsContext)
            })

            afterEach(() => {
                dateSpy.mockRestore()
            })

            it("should open the HUD if the squaddie turn has actions remaining", () => {
                mover.reset(gameEngineState)
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.showSummaryHUD
                ).toBeTruthy()
            })
        })
    })
})
