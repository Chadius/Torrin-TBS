import { PathfinderService } from "../../../hexMap/pathfinder/pathGeneration/pathfinder"
import { SearchResultsService } from "../../../hexMap/pathfinder/searchResults/searchResult"
import { MovementCalculatorService } from "./movementCalculator"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
import { BattleSquaddie } from "../../battleSquaddie"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { ObjectRepositoryService } from "../../objectRepository"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../orchestrator/battleState"
import { SearchPathService } from "../../../hexMap/pathfinder/searchPath"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { MapGraphicsLayerHighlight } from "../../../hexMap/mapGraphicsLayer"
import { HighlightPulseBlueColor } from "../../../hexMap/hexDrawingUtils"
import { CampaignService } from "../../../campaign/campaign"
import { BattleActionQueueService } from "../../history/battleActionQueue"

describe("movement calculator", () => {
    let pathfinderSpy: jest.SpyInstance
    let gameEngineState: GameEngineState
    let battleSquaddie: BattleSquaddie
    let squaddieTemplate: SquaddieTemplate

    beforeEach(() => {
        const objectRepository = ObjectRepositoryService.new()
        const missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })

        ;({ battleSquaddie, squaddieTemplate } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                objectRepository,
                actionTemplateIds: [],
                affiliation: SquaddieAffiliation.PLAYER,
                name: "squaddie",
                battleId: "squaddie",
                templateId: "squaddie",
            }))

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            squaddieTemplateId: battleSquaddie.squaddieTemplateId,
            location: { q: 0, r: 0 },
        })

        gameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.new({
                    missionMap,
                    missionId: "test mission",
                    campaignId: "test campaign",
                }),
            }),
            campaign: CampaignService.default(),
        })
    })
    afterEach(() => {
        if (pathfinderSpy) {
            pathfinderSpy.mockRestore()
        }
    })

    describe("isMovementPossible", () => {
        it("is not possible if the pathfinder says it is not", () => {
            pathfinderSpy = jest
                .spyOn(PathfinderService, "search")
                .mockReturnValue(
                    SearchResultsService.new({
                        stopLocationsReached: [],
                        shortestPathByLocation: {},
                    })
                )

            const isMovementPossible: boolean =
                MovementCalculatorService.isMovementPossible({
                    gameEngineState,
                    battleSquaddie,
                    squaddieTemplate,
                    destination: { q: 0, r: 1 },
                })

            expect(isMovementPossible).toBeFalsy()
            expect(pathfinderSpy).toHaveBeenCalled()
        })

        it("is possible if the pathfinder says is not", () => {
            const validPathToDestination = SearchPathService.newSearchPath()
            SearchPathService.add(
                validPathToDestination,
                {
                    hexCoordinate: { q: 0, r: 0 },
                    cumulativeMovementCost: 0,
                },
                0
            )
            SearchPathService.add(
                validPathToDestination,
                {
                    hexCoordinate: { q: 0, r: 1 },
                    cumulativeMovementCost: 0,
                },
                1
            )

            pathfinderSpy = jest
                .spyOn(PathfinderService, "search")
                .mockReturnValue(
                    SearchResultsService.new({
                        stopLocationsReached: [],
                        shortestPathByLocation: {
                            0: {
                                1: validPathToDestination,
                            },
                        },
                    })
                )

            const isMovementPossible: boolean =
                MovementCalculatorService.isMovementPossible({
                    gameEngineState,
                    battleSquaddie,
                    squaddieTemplate,
                    destination: { q: 0, r: 1 },
                })

            expect(isMovementPossible).toBeTruthy()
            expect(pathfinderSpy).toHaveBeenCalled()
        })
    })

    describe("setBattleActionDecisionStepReadyToAnimate", () => {
        beforeEach(() => {
            MovementCalculatorService.setBattleActionDecisionStepReadyToAnimate(
                {
                    gameEngineState,
                    battleSquaddie,
                    squaddieTemplate,
                    destination: { q: 0, r: 1 },
                }
            )
        })
        it("sets up the action decision step", () => {
            const actionBuilderState =
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            expect(
                BattleActionDecisionStepService.getActor(actionBuilderState)
                    .battleSquaddieId
            ).toEqual(battleSquaddie.battleSquaddieId)
            expect(
                BattleActionDecisionStepService.getAction(actionBuilderState)
                    .movement
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getTarget(actionBuilderState)
                    .confirmed
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getTarget(actionBuilderState)
                    .targetLocation
            ).toEqual({ q: 0, r: 1 })
        })
        it("only highlights the moving path", () => {
            const highlights: MapGraphicsLayerHighlight[] =
                TerrainTileMapService.computeHighlightedTiles(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap.terrainTileMap
                )
            expect(highlights).toHaveLength(2)
            expect(highlights).toContainEqual({
                location: { q: 0, r: 0 },
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: "",
            })
            expect(highlights).toContainEqual({
                location: { q: 0, r: 1 },
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName:
                    gameEngineState.campaign.resources
                        .missionMapMovementIconResourceKeys.MOVE_1_ACTION,
            })
        })
    })

    it("queueBattleActionToMove adds a move action to the battle queue", () => {
        MovementCalculatorService.queueBattleActionToMove({
            gameEngineState,
            battleSquaddie,
            destination: { q: 0, r: 1 },
        })

        expect(
            BattleActionQueueService.length(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
            )
        ).toEqual(1)

        const movementAction = BattleActionQueueService.peek(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue
        )

        expect(movementAction.actor.actorBattleSquaddieId).toEqual(
            battleSquaddie.battleSquaddieId
        )
        expect(movementAction.action.isMovement).toBeTruthy()
        expect(movementAction.effect.movement.startLocation).toEqual({
            q: 0,
            r: 0,
        })
        expect(movementAction.effect.movement.endLocation).toEqual({
            q: 0,
            r: 1,
        })
    })
})
