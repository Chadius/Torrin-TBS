import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieSelectorService } from "./battleSquaddieSelectorUtils"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../orchestrator/battleState"

describe("battleSquaddieSelectorUtils", () => {
    let objectRepository: ObjectRepository

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
    })

    describe("getClosestRouteForSquaddieToReachDestination", () => {
        let map: MissionMap
        let playerBattleSquaddie: BattleSquaddie
        let playerSquaddieTemplate: SquaddieTemplate
        let gameEngineState: GameEngineState

        beforeEach(() => {
            map = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 1 1 1 1 1 1 1 "],
                }),
            })
            ;({
                battleSquaddie: playerBattleSquaddie,
                squaddieTemplate: playerSquaddieTemplate,
            } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                objectRepository,
                templateId: "playerActor",
                battleId: "playerActor",
                name: "playerActor",
                affiliation: SquaddieAffiliation.PLAYER,
                actionTemplateIds: [],
            }))
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                squaddieTemplateId:
                    playerSquaddieTemplate.squaddieId.templateId,
                location: { q: 0, r: 0 },
            })
            gameEngineState = GameEngineStateService.new({
                repository: objectRepository,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionMap: map,
                        missionId: "missionId",
                        campaignId: "campaignId",
                    }),
                }),
            })
        })
        it("will tell the squaddie to stand in place if it is at the destination", () => {
            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopLocation: { q: 0, r: 0 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 0,
                        },
                    }
                )

            expect(closestRoute.destination).toEqual({ q: 0, r: 0 })
            expect(closestRoute.currentNumberOfMoveActions).toEqual(0)
        })
        it("will tell the squaddie to get as close to the destination as possible", () => {
            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopLocation: { q: 0, r: 1 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 1,
                        },
                    }
                )

            expect(closestRoute.destination).toEqual({ q: 0, r: 1 })
            expect(closestRoute.currentNumberOfMoveActions).toEqual(1)
        })
        it("will tell the squaddie to get close to the destination if possible", () => {
            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopLocation: { q: 0, r: 7 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 1,
                        },
                    }
                )

            expect(closestRoute.destination).toEqual({ q: 0, r: 6 })
            expect(closestRoute.currentNumberOfMoveActions).toEqual(3)
        })
        it("will not give a route if the destination is out of reach", () => {
            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopLocation: { q: 0, r: 8 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 1,
                        },
                    }
                )

            expect(closestRoute).toBeUndefined()
        })
        it("will not give a route if the squaddie does not have enough actions to reach", () => {
            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopLocation: { q: 0, r: 6 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 1,
                        },
                        actionPointsRemaining: 2,
                    }
                )

            expect(closestRoute).toBeUndefined()
        })
        it("will tell the squaddie to get the maximum distance away from the destination as possible", () => {
            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopLocation: { q: 0, r: 3 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 1,
                        },
                        preferMaximumRangeFromStopLocation: true,
                    }
                )

            expect(closestRoute.destination).toEqual({ q: 0, r: 2 })
            expect(closestRoute.currentNumberOfMoveActions).toEqual(1)
        })
    })
})
