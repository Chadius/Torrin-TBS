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
import { SearchParametersService } from "../../hexMap/pathfinder/searchParameters"
import { TIME_TO_MOVE } from "../animation/squaddieMoveAnimationUtils"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattleStateService } from "../battleState/battleState"
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
import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { BattlePhase } from "./battlePhaseTracker"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { BattleActionService } from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"

describe("BattleSquaddieMover", () => {
    let objectRepository: ObjectRepository
    let player1Static: SquaddieTemplate
    let player1BattleSquaddie: BattleSquaddie
    let enemy1Static: SquaddieTemplate
    let enemy1Dynamic: BattleSquaddie
    let map: MissionMap
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let getImageUISpy: MockInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        objectRepository = ObjectRepositoryService.new()
        getImageUISpy = vi
            .spyOn(ObjectRepositoryService, "getImageUIByBattleSquaddieId")
            .mockReturnValue(undefined)
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
            objectRepository: objectRepository,
            actionTemplateIds: [],
        }))
        ;({ squaddieTemplate: enemy1Static, battleSquaddie: enemy1Dynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Enemy1",
                templateId: "enemy_1",
                battleId: "enemy_1",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: objectRepository,
                actionTemplateIds: [],
            }))
    })

    afterEach(() => {
        getImageUISpy.mockRestore()
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
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathStopConstraints: {
                    canStopOnSquaddies: true,
                },
                pathSizeConstraints: {
                    movementPerAction: 99,
                    numberOfActions: 1,
                },
                pathContinueConstraints: {
                    squaddieAffiliation: {
                        searchingSquaddieAffiliation:
                            SquaddieAffiliation.PLAYER,
                    },
                    ignoreTerrainCost: false,
                    canPassOverPits: false,
                    canPassThroughWalls: false,
                },
                goal: {
                    stopCoordinates: [{ q: 1, r: 1 }],
                },
            }),
            missionMap: map,
            objectRepository: objectRepository,
        })

        const movePath: SearchPath =
            SearchResultsService.getShortestPathToCoordinate(searchResults, {
                q: 1,
                r: 1,
            })

        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
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
                        startCoordinate: { q: 0, r: 0 },
                        endCoordinate: { q: 1, r: 1 },
                    },
                },
            })
        )

        const mover: BattleSquaddieMover = new BattleSquaddieMover()
        vi.spyOn(Date, "now").mockImplementation(() => 1)
        mover.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(mover.hasCompleted(gameEngineState)).toBeFalsy()

        vi.spyOn(Date, "now").mockImplementation(() => 1 + TIME_TO_MOVE)
        mover.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
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
                pathGenerators: {
                    startCoordinates: [{ q: 0, r: 0 }],
                },
                pathStopConstraints: {
                    canStopOnSquaddies: true,
                },
                pathSizeConstraints: {
                    movementPerAction: 99,
                    numberOfActions: 1,
                },
                pathContinueConstraints: {
                    squaddieAffiliation: {
                        searchingSquaddieAffiliation:
                            SquaddieAffiliation.PLAYER,
                    },
                    ignoreTerrainCost: false,
                    canPassOverPits: false,
                    canPassThroughWalls: false,
                },
                goal: {
                    stopCoordinates: [{ q: 1, r: 1 }],
                },
            }),
            missionMap: map,
            objectRepository: objectRepository,
        })

        const movePath: SearchPath =
            SearchResultsService.getShortestPathToCoordinate(searchResults, {
                q: 1,
                r: 1,
            })

        const gameEngineState: GameEngineState = GameEngineStateService.new({
            repository: objectRepository,
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
                        startCoordinate: { q: 0, r: 0 },
                        endCoordinate: { q: 1, r: 1 },
                    },
                },
            })
        )

        const messageSpy: MockInstance = vi.spyOn(
            gameEngineState.messageBoard,
            "sendMessage"
        )

        const mover: BattleSquaddieMover = new BattleSquaddieMover()
        vi.spyOn(Date, "now").mockImplementation(() => 1)
        mover.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })

        vi.spyOn(Date, "now").mockImplementation(() => 1 + TIME_TO_MOVE)
        mover.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
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
                    pathGenerators: {
                        startCoordinates: [{ q: 0, r: 0 }],
                    },
                    pathStopConstraints: {
                        canStopOnSquaddies: true,
                    },
                    pathSizeConstraints: {
                        movementPerAction: 999,
                        numberOfActions: 1,
                        minimumDistanceMoved: 0,
                    },
                    pathContinueConstraints: {
                        squaddieAffiliation: {
                            searchingSquaddieAffiliation: squaddieAffiliation,
                        },
                        ignoreTerrainCost: false,
                        canPassOverPits: false,
                        canPassThroughWalls: false,
                    },
                    goal: {
                        stopCoordinates: [{ q: 1, r: 1 }],
                    },
                }),
                missionMap: map,
                objectRepository: objectRepository,
            })

            const movePath: SearchPath =
                SearchResultsService.getShortestPathToCoordinate(
                    searchResults,
                    {
                        q: 1,
                        r: 1,
                    }
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
                mockResourceHandler.getResource = vi
                    .fn()
                    .mockReturnValue({ width: 32, height: 32 })

                gameEngineState = GameEngineStateService.new({
                    battleOrchestratorState: setupSquaddie({
                        squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    }),
                    repository: objectRepository,
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
                                startCoordinate: { q: 0, r: 0 },
                                endCoordinate: { q: 1, r: 1 },
                            },
                        },
                    })
                )

                player1BattleSquaddie.squaddieTurn.remainingActionPoints = 0

                mover = new BattleSquaddieMover()
                vi.spyOn(Date, "now").mockImplementation(() => 1)
                mover.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler,
                })
                vi.spyOn(Date, "now").mockImplementation(() => 1 + TIME_TO_MOVE)
                mover.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler,
                })
            })

            it("hides the HUD", () => {
                mover.reset(gameEngineState)
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState
                ).toBeUndefined()
            })
        })
    })
})
