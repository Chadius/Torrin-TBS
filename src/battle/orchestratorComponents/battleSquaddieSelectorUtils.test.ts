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
import { BattleStateService } from "../orchestrator/battleState"
import { ActionEffectTemplateService } from "../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieTurnService } from "../../squaddie/turn"
import { TargetConstraintsService } from "../../action/targetConstraints"
import { ActionResourceCostService } from "../../action/actionResourceCost"
import { beforeEach, describe, expect, it } from "vitest"

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
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.TARGET_FOE]: true,
                    }),
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
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.TARGET_FOE]: true,
                    }),
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
                coordinate: { q: 0, r: 0 },
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
                        stopCoordinate: { q: 0, r: 1 },
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
                        stopCoordinate: { q: 0, r: 7 },
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

            expect(closestRoute.destination).toEqual({ q: 0, r: 2 })
            expect(closestRoute.currentNumberOfMoveActions).toEqual(1)
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
                coordinate: { q: 0, r: 0 },
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

            expect(closestRoute.destination).toEqual({ q: 0, r: 1 })
            expect(closestRoute.currentNumberOfMoveActions).toEqual(1)
        })
    })

    describe("Melee attacker knows they can move in range to attack a foe", () => {
        let playerActor: BattleSquaddie

        beforeEach(() => {
            ;({ battleSquaddie: playerActor } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    templateId: "playerActor",
                    battleId: "playerActor",
                    name: "playerActor",
                    affiliation: SquaddieAffiliation.PLAYER,
                    actionTemplateIds: [meleeAttack.id],
                }))
        })

        it("Melee attack can reach foe with 1 movement", () => {
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: enemyActor.battleSquaddieId,
                squaddieTemplateId: enemyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 3 },
            })

            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: enemyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toEqual({
                useThisActionTemplateId: meleeAttack.id,
                moveToThisLocation: {
                    q: 0,
                    r: 2,
                },
            })
        })
        it("Report undefined if 0 movement is needed", () => {
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: enemyActor.battleSquaddieId,
                squaddieTemplateId: enemyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 1 },
            })

            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: enemyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toBeUndefined()
        })
        it("Melee attack can reach foe with 2 movement", () => {
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: enemyActor.battleSquaddieId,
                squaddieTemplateId: enemyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 5 },
            })

            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: enemyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toEqual({
                useThisActionTemplateId: meleeAttack.id,
                moveToThisLocation: {
                    q: 0,
                    r: 4,
                },
            })
        })
        it("Melee attack cannot reach foe if squaddie spends their entire movement getting into range", () => {
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: enemyActor.battleSquaddieId,
                squaddieTemplateId: enemyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 7 },
            })

            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: enemyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toBeUndefined()
        })
        it("Melee attack that consumes many actions cannot reach foe if squaddie will not have enough actions to act", () => {
            const bigMeleeAttack = ActionTemplateService.new({
                id: "bigMeleeAttack",
                name: "bigMeleeAttack",
                resourceCost: ActionResourceCostService.new({
                    actionPoints: 3,
                }),
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 0,
                    maximumRange: 1,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.TARGET_FOE]: true,
                        }),
                    }),
                ],
            })
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                bigMeleeAttack
            )

            const { battleSquaddie: playerActorWithBigAttacks } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    templateId: "playerActorWithBigAttacks",
                    battleId: "playerActorWithBigAttacks",
                    name: "playerActorWithBigAttacks",
                    affiliation: SquaddieAffiliation.PLAYER,
                    actionTemplateIds: [bigMeleeAttack.id],
                })

            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActorWithBigAttacks.battleSquaddieId,
                squaddieTemplateId:
                    playerActorWithBigAttacks.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: enemyActor.battleSquaddieId,
                squaddieTemplateId: enemyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 5 },
            })

            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId:
                            playerActorWithBigAttacks.battleSquaddieId,
                        targetBattleSquaddieId: enemyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toBeUndefined()
        })
        it("will not recommend movement if the player does not have enough actions to move and act", () => {
            SquaddieTurnService.spendActionPoints(playerActor.squaddieTurn, 1)

            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: enemyActor.battleSquaddieId,
                squaddieTemplateId: enemyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 5 },
            })

            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: enemyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toBeUndefined()
        })
    })

    describe("Ranged attacks", () => {
        let playerActor: BattleSquaddie
        beforeEach(() => {
            ;({ battleSquaddie: playerActor } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    templateId: "playerActor",
                    battleId: "playerActor",
                    name: "playerActor",
                    affiliation: SquaddieAffiliation.PLAYER,
                    actionTemplateIds: [rangedAttack.id],
                }))
        })

        it("Will use ranged attacks at maximum range", () => {
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: enemyActor.battleSquaddieId,
                squaddieTemplateId: enemyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 7 },
            })

            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: enemyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toEqual({
                useThisActionTemplateId: rangedAttack.id,
                moveToThisLocation: {
                    q: 0,
                    r: 4,
                },
            })
        })

        it("will use ranged attacks even if the target is unreachable", () => {
            const missionMapBlockedByAPit: MissionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 - 1 "],
                }),
            })
            MissionMapService.addSquaddie({
                missionMap: missionMapBlockedByAPit,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap: missionMapBlockedByAPit,
                battleSquaddieId: enemyActor.battleSquaddieId,
                squaddieTemplateId: enemyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 3 },
            })
            gameEngineState.battleOrchestratorState.battleState.missionMap =
                missionMapBlockedByAPit
            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: enemyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toEqual({
                useThisActionTemplateId: rangedAttack.id,
                moveToThisLocation: {
                    q: 0,
                    r: 1,
                },
            })
        })
    })

    describe("Order of actions indicate attack preference", () => {
        beforeEach(() => {
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: enemyActor.battleSquaddieId,
                squaddieTemplateId: enemyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 5 },
            })
        })

        it("Will use ranged attack if it is listed first", () => {
            const { battleSquaddie: playerActor } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    templateId: "playerActor",
                    battleId: "playerActor",
                    name: "playerActor",
                    affiliation: SquaddieAffiliation.PLAYER,
                    actionTemplateIds: [rangedAttack.id, meleeAttack.id],
                })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: enemyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toEqual({
                useThisActionTemplateId: rangedAttack.id,
                moveToThisLocation: {
                    q: 0,
                    r: 2,
                },
            })
        })
        it("Will use melee attack if it is listed first", () => {
            const { battleSquaddie: playerActor } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    templateId: "playerActor",
                    battleId: "playerActor",
                    name: "playerActor",
                    affiliation: SquaddieAffiliation.PLAYER,
                    actionTemplateIds: [meleeAttack.id, rangedAttack.id],
                })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: enemyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toEqual({
                useThisActionTemplateId: meleeAttack.id,
                moveToThisLocation: {
                    q: 0,
                    r: 4,
                },
            })
        })
    })

    describe("moving towards allies", () => {
        let allyActor: BattleSquaddie
        let meleeHeal: ActionTemplate

        beforeEach(() => {
            ;({ battleSquaddie: allyActor } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    templateId: "allyActor",
                    battleId: "allyActor",
                    name: "allyActor",
                    affiliation: SquaddieAffiliation.ALLY,
                    actionTemplateIds: [],
                }))
            meleeHeal = ActionTemplateService.new({
                id: "meleeHeal",
                name: "meleeHeal",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 0,
                    maximumRange: 1,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.TARGET_ALLY]: true,
                        }),
                    }),
                ],
            })
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                meleeHeal
            )
        })

        it("Squaddie with target ally actions will move towards teammate and try to act", () => {
            const { battleSquaddie: playerActor } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    templateId: "playerActor",
                    battleId: "playerActor",
                    name: "playerActor",
                    affiliation: SquaddieAffiliation.PLAYER,
                    actionTemplateIds: [meleeHeal.id],
                })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: allyActor.battleSquaddieId,
                squaddieTemplateId: allyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 4 },
            })
            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: allyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toEqual({
                useThisActionTemplateId: meleeHeal.id,
                moveToThisLocation: {
                    q: 0,
                    r: 3,
                },
            })
        })
        it("Squaddie will use all actions to approach allies even if they will not have enough actions to act", () => {
            const { battleSquaddie: playerActor } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    templateId: "playerActor",
                    battleId: "playerActor",
                    name: "playerActor",
                    affiliation: SquaddieAffiliation.PLAYER,
                    actionTemplateIds: [meleeHeal.id],
                })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: playerActor.battleSquaddieId,
                squaddieTemplateId: playerActor.squaddieTemplateId,
                coordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap: map,
                battleSquaddieId: allyActor.battleSquaddieId,
                squaddieTemplateId: allyActor.squaddieTemplateId,
                coordinate: { q: 0, r: 7 },
            })
            const actionInfo =
                BattleSquaddieSelectorService.getBestActionAndCoordinateToActFrom(
                    {
                        gameEngineState,
                        actorBattleSquaddieId: playerActor.battleSquaddieId,
                        targetBattleSquaddieId: allyActor.battleSquaddieId,
                    }
                )
            expect(actionInfo).toEqual({
                useThisActionTemplateId: undefined,
                moveToThisLocation: {
                    q: 0,
                    r: 6,
                },
            })
        })
    })
})
