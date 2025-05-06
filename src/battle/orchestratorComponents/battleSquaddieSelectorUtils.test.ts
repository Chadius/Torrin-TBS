import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
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
import { BattleStateService } from "../battleState/battleState"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../action/template/actionEffectTemplate"
import { TargetConstraintsService } from "../../action/targetConstraints"
import { beforeEach, describe, expect, it } from "vitest"
import { SearchPathAdapterService } from "../../search/searchPathAdapter/searchPathAdapter"
import { SquaddieService } from "../../squaddie/squaddieService"

describe("battleSquaddieSelectorUtils", () => {
    let objectRepository: ObjectRepository
    let enemyActor: BattleSquaddie

    let meleeAttack: ActionTemplate
    let rangedAttack: ActionTemplate

    let map: MissionMap
    let gameEngineState: GameEngineState

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        meleeAttack = ActionTemplateService.new({
            id: "meleeAttack",
            name: "meleeAttack",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(objectRepository, meleeAttack)

        rangedAttack = ActionTemplateService.new({
            id: "rangedAttack",
            name: "rangedAttack",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 2,
                maximumRange: 3,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            rangedAttack
        )
        ;({ battleSquaddie: enemyActor } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                objectRepository,
                templateId: "enemyActor",
                battleId: "enemyActor",
                name: "enemyActor",
                affiliation: SquaddieAffiliation.ENEMY,
                actionTemplateIds: [],
            }))

        map = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 1 "],
            }),
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

    describe("getClosestRouteForSquaddieToReachDestination", () => {
        let playerBattleSquaddie: BattleSquaddie
        let playerSquaddieTemplate: SquaddieTemplate

        beforeEach(() => {
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
                originMapCoordinate: { q: 0, r: 0 },
            })
        })
        it("will tell the squaddie to stand in place if it is at the destination", () => {
            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopCoordinate: { q: 0, r: 0 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 0,
                        },
                    }
                )

            expect(SearchPathAdapterService.getHead(closestRoute)).toEqual({
                q: 0,
                r: 0,
            })
            expect(
                SearchPathAdapterService.getNumberOfMoveActions({
                    path: closestRoute,
                    movementPerAction:
                        SquaddieService.getSquaddieMovementAttributes({
                            squaddieTemplate: playerSquaddieTemplate,
                            battleSquaddie: playerBattleSquaddie,
                        }).net.movementPerAction,
                })
            ).toEqual(0)
        })
        it("will tell the squaddie to get as close to the destination as possible", () => {
            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopCoordinate: { q: 0, r: 1 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 1,
                        },
                    }
                )

            expect(SearchPathAdapterService.getHead(closestRoute)).toEqual({
                q: 0,
                r: 1,
            })
            expect(
                SearchPathAdapterService.getNumberOfMoveActions({
                    path: closestRoute,
                    movementPerAction:
                        SquaddieService.getSquaddieMovementAttributes({
                            squaddieTemplate: playerSquaddieTemplate,
                            battleSquaddie: playerBattleSquaddie,
                        }).net.movementPerAction,
                })
            ).toEqual(1)
        })
        it("will tell the squaddie to get close to the destination if possible", () => {
            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopCoordinate: { q: 0, r: 7 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 1,
                        },
                    }
                )

            expect(SearchPathAdapterService.getHead(closestRoute)).toEqual({
                q: 0,
                r: 6,
            })
            expect(
                SearchPathAdapterService.getNumberOfMoveActions({
                    path: closestRoute,
                    movementPerAction:
                        SquaddieService.getSquaddieMovementAttributes({
                            squaddieTemplate: playerSquaddieTemplate,
                            battleSquaddie: playerBattleSquaddie,
                        }).net.movementPerAction,
                })
            ).toEqual(3)
        })
        it("will not give a route if the destination is out of reach", () => {
            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopCoordinate: { q: 0, r: 8 },
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
                        stopCoordinate: { q: 0, r: 6 },
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
                        stopCoordinate: { q: 0, r: 3 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 1,
                        },
                    }
                )

            expect(SearchPathAdapterService.getHead(closestRoute)).toEqual({
                q: 0,
                r: 2,
            })
            expect(
                SearchPathAdapterService.getNumberOfMoveActions({
                    path: closestRoute,
                    movementPerAction:
                        SquaddieService.getSquaddieMovementAttributes({
                            squaddieTemplate: playerSquaddieTemplate,
                            battleSquaddie: playerBattleSquaddie,
                        }).net.movementPerAction,
                })
            ).toEqual(1)
        })
        it("will give a route even if the destination is blocked by terrain", () => {
            const missionMapBlockedByAPit: MissionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 - 1 "],
                }),
            })
            MissionMapService.addSquaddie({
                missionMap: missionMapBlockedByAPit,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                squaddieTemplateId: playerBattleSquaddie.squaddieTemplateId,
                originMapCoordinate: { q: 0, r: 0 },
            })
            gameEngineState.battleOrchestratorState.battleState.missionMap =
                missionMapBlockedByAPit

            const closestRoute =
                BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                    {
                        gameEngineState,
                        battleSquaddie: playerBattleSquaddie,
                        squaddieTemplate: playerSquaddieTemplate,
                        stopCoordinate: { q: 0, r: 3 },
                        distanceRangeFromDestination: {
                            minimum: 0,
                            maximum: 2,
                        },
                    }
                )

            expect(SearchPathAdapterService.getHead(closestRoute)).toEqual({
                q: 0,
                r: 1,
            })
            expect(
                SearchPathAdapterService.getNumberOfMoveActions({
                    path: closestRoute,
                    movementPerAction:
                        SquaddieService.getSquaddieMovementAttributes({
                            squaddieTemplate: playerSquaddieTemplate,
                            battleSquaddie: playerBattleSquaddie,
                        }).net.movementPerAction,
                })
            ).toEqual(1)
        })
    })
})
