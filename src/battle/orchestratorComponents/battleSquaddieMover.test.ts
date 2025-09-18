import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie } from "../battleSquaddie"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../orchestrator/battleOrchestratorState"
import { BattleSquaddieMover } from "./battleSquaddieMover"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { TIME_TO_MOVE } from "../animation/squaddieMoveAnimationUtils"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattleStateService } from "../battleState/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { SearchResult } from "../../hexMap/pathfinder/searchResults/searchResult"
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
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { GraphicsConfig } from "../../utils/graphics/graphicsConfig"
import { SearchResultAdapterService } from "../../hexMap/pathfinder/searchResults/searchResultAdapter"
import { MapSearchService } from "../../hexMap/pathfinder/pathGeneration/mapSearch"
import { SearchLimitService } from "../../hexMap/pathfinder/pathGeneration/searchLimit"
import { SquaddieTurnService } from "../../squaddie/turn"

describe("BattleSquaddieMover", () => {
    let objectRepository: ObjectRepository
    let player1Static: SquaddieTemplate
    let player1BattleSquaddie: BattleSquaddie
    let enemy1SquaddieTemplate: SquaddieTemplate
    let enemy1BattleSquaddie: BattleSquaddie
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
        ;({
            squaddieTemplate: enemy1SquaddieTemplate,
            battleSquaddie: enemy1BattleSquaddie,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
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

    it("is complete once enough time passes and the player squaddie finishes moving", () => {
        const gameEngineState = moveSquaddieAndGetGameEngineState({
            missionMap: map,
            objectRepository: objectRepository,
            startCoordinate: { q: 0, r: 0 },
            endCoordinate: { q: 1, r: 1 },
            battleSquaddieId: player1BattleSquaddie.battleSquaddieId,
            squaddieTemplateId: player1Static.squaddieId.templateId,
        })

        const mover: BattleSquaddieMover = new BattleSquaddieMover()
        vi.spyOn(Date, "now").mockImplementation(() => 1)
        mover.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler!,
        })
        expect(mover.hasCompleted(gameEngineState)).toBeFalsy()

        vi.spyOn(Date, "now").mockImplementation(() => 1 + TIME_TO_MOVE)
        mover.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler!,
        })
        expect(mover.hasCompleted(gameEngineState)).toBeTruthy()
        mover.reset(gameEngineState)
        expect(mover.animationStartTime).toBeUndefined()
    })

    it("is complete immediately if the squaddie is not player controlled and its entire path is offscreen", () => {
        const gameEngineState = moveSquaddieAndGetGameEngineState({
            missionMap: map,
            objectRepository: objectRepository,
            startCoordinate: { q: 0, r: 0 },
            endCoordinate: { q: 1, r: 1 },
            battleSquaddieId: enemy1BattleSquaddie.battleSquaddieId,
            squaddieTemplateId: enemy1SquaddieTemplate.squaddieId.templateId,
        })

        const onScreenSpy = vi
            .spyOn(GraphicsConfig, "isMapCoordinateOnScreen")
            .mockReturnValue(false)

        const mover: BattleSquaddieMover = new BattleSquaddieMover()
        mover.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler!,
        })
        expect(mover.hasCompleted(gameEngineState)).toBeTruthy()
        expect(onScreenSpy).toHaveBeenCalled()
        onScreenSpy.mockRestore()
    })

    it("sends a message once the squaddie finishes moving", () => {
        const gameEngineState = moveSquaddieAndGetGameEngineState({
            missionMap: map,
            objectRepository: objectRepository,
            startCoordinate: { q: 0, r: 0 },
            endCoordinate: { q: 1, r: 1 },
            battleSquaddieId: player1BattleSquaddie.battleSquaddieId,
            squaddieTemplateId: player1Static.squaddieId.templateId,
        })

        const messageSpy: MockInstance = vi.spyOn(
            gameEngineState.messageBoard,
            "sendMessage"
        )

        const mover: BattleSquaddieMover = new BattleSquaddieMover()
        vi.spyOn(Date, "now").mockImplementation(() => 1)
        mover.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler!,
        })

        vi.spyOn(Date, "now").mockImplementation(() => 1 + TIME_TO_MOVE)
        mover.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler!,
        })
        mover.reset(gameEngineState)

        expect(messageSpy).toBeCalledWith({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler!,
        })
    })

    describe("reset actions based on squaddie", () => {
        const setupSquaddie = ({
            squaddieAffiliation,
        }: {
            squaddieAffiliation: TSquaddieAffiliation
        }): BattleOrchestratorState => {
            const searchResults: SearchResult =
                MapSearchService.calculatePathsToDestinations({
                    missionMap: map,
                    objectRepository: objectRepository,
                    destinationCoordinates: [{ q: 1, r: 1 }],
                    originMapCoordinate: { q: 0, r: 0 },
                    currentMapCoordinate: { q: 0, r: 0 },
                    searchLimit: SearchLimitService.new({
                        baseSearchLimit: SearchLimitService.landBasedMovement(),
                        canStopOnSquaddies: true,
                        maximumMovementCost: 999,
                        squaddieAffiliation,
                        ignoreTerrainCost: false,
                        crossOverPits: false,
                        passThroughWalls: false,
                    }),
                })

            const movePath =
                SearchResultAdapterService.getShortestPathToCoordinate({
                    searchResults: searchResults,
                    mapCoordinate: {
                        q: 1,
                        r: 1,
                    },
                })

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
                    originMapCoordinate: { q: 0, r: 0 },
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

                SquaddieTurnService.endTurn(player1BattleSquaddie.squaddieTurn)

                mover = new BattleSquaddieMover()
                vi.spyOn(Date, "now").mockImplementation(() => 1)
                mover.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
                })
                vi.spyOn(Date, "now").mockImplementation(() => 1 + TIME_TO_MOVE)
                mover.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                    resourceHandler: gameEngineState.resourceHandler!,
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

const moveSquaddieAndGetGameEngineState = ({
    missionMap,
    objectRepository,
    startCoordinate,
    endCoordinate,
    squaddieTemplateId,
    battleSquaddieId,
}: {
    missionMap: MissionMap
    objectRepository: ObjectRepository
    startCoordinate: HexCoordinate
    endCoordinate: HexCoordinate
    battleSquaddieId: string
    squaddieTemplateId: string
}) => {
    MissionMapService.addSquaddie({
        missionMap: missionMap,
        squaddieTemplateId,
        battleSquaddieId,
        originMapCoordinate: startCoordinate,
    })

    const searchResults: SearchResult =
        MapSearchService.calculatePathsToDestinations({
            missionMap,
            objectRepository: objectRepository,
            destinationCoordinates: [endCoordinate],
            originMapCoordinate: startCoordinate,
            currentMapCoordinate: startCoordinate,
            searchLimit: SearchLimitService.new({
                baseSearchLimit: SearchLimitService.landBasedMovement(),
                canStopOnSquaddies: true,
                maximumMovementCost: 99,
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                ignoreTerrainCost: false,
                crossOverPits: false,
                passThroughWalls: false,
            }),
        })

    const movePath = SearchResultAdapterService.getShortestPathToCoordinate({
        searchResults: searchResults,
        mapCoordinate: endCoordinate,
    })

    const gameEngineState: GameEngineState = GameEngineStateService.new({
        repository: objectRepository,
        resourceHandler: undefined,
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                campaignId: "test campaign",
                missionId: "test mission",
                missionMap: missionMap,
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
                actorBattleSquaddieId: battleSquaddieId,
            },
            action: {
                isMovement: true,
            },
            effect: {
                movement: {
                    startCoordinate,
                    endCoordinate,
                },
            },
        })
    )
    return gameEngineState
}
