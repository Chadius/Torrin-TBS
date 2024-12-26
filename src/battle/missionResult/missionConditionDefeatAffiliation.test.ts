import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { DamageType, SquaddieService } from "../../squaddie/squaddieService"
import {
    MissionCondition,
    MissionConditionType,
    MissionShouldBeComplete,
} from "./missionCondition"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { SquaddieMovementService } from "../../squaddie/movement"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import { beforeEach, describe, expect, it } from "vitest"

describe("Mission Condition: Defeat All Squaddies of a given Affiliation", () => {
    let missionMap: MissionMap

    let player1Static: SquaddieTemplate
    let player1Dynamic: BattleSquaddie
    let conditionDefeatAllPlayers: MissionCondition

    let ally1Static: SquaddieTemplate
    let ally1Dynamic: BattleSquaddie
    let conditionDefeatAllAllies: MissionCondition

    let noAffiliation1Static: SquaddieTemplate
    let noAffiliation1Dynamic: BattleSquaddie
    let conditionDefeatAllNoAffiliation: MissionCondition

    let enemy1Static: SquaddieTemplate
    let enemy1Dynamic: BattleSquaddie
    let enemy2Static: SquaddieTemplate
    let enemy2Dynamic: BattleSquaddie
    let conditionDefeatAllEnemies: MissionCondition
    let state: GameEngineState
    let squaddieRepository = ObjectRepositoryService.new()

    beforeEach(() => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 "],
            }),
        })

        squaddieRepository = ObjectRepositoryService.new()
        ;({ squaddieTemplate: enemy1Static, battleSquaddie: enemy1Dynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "enemy 1",
                templateId: "enemy 1",
                battleId: "enemy 1",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: squaddieRepository,
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 1,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                }),
                actionTemplateIds: [],
            }))
        ;({ squaddieTemplate: enemy2Static, battleSquaddie: enemy2Dynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "enemy 2",
                templateId: "enemy 2",
                battleId: "enemy 2",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: squaddieRepository,
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 1,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                }),
                actionTemplateIds: [],
            }))

        conditionDefeatAllEnemies = {
            id: "defeat all enemies",
            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
        }
        ;({ squaddieTemplate: player1Static, battleSquaddie: player1Dynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "player 1",
                templateId: "player 1",
                battleId: "player 1",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: squaddieRepository,
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 1,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                }),
                actionTemplateIds: [],
            }))

        conditionDefeatAllPlayers = {
            id: "defeat all players",
            type: MissionConditionType.DEFEAT_ALL_PLAYERS,
        }
        ;({ squaddieTemplate: ally1Static, battleSquaddie: ally1Dynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "ally 1",
                templateId: "ally 1",
                battleId: "ally 1",
                affiliation: SquaddieAffiliation.ALLY,
                objectRepository: squaddieRepository,
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 1,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                }),
                actionTemplateIds: [],
            }))

        conditionDefeatAllAllies = {
            id: "defeat all allies",
            type: MissionConditionType.DEFEAT_ALL_ALLIES,
        }
        ;({
            squaddieTemplate: noAffiliation1Static,
            battleSquaddie: noAffiliation1Dynamic,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "no affiliation 1",
            templateId: "no affiliation 1",
            battleId: "no affiliation 1",
            affiliation: SquaddieAffiliation.NONE,
            objectRepository: squaddieRepository,
            attributes: ArmyAttributesService.new({
                maxHitPoints: 1,
                movement: SquaddieMovementService.new({
                    movementPerAction: 2,
                }),
            }),
            actionTemplateIds: [],
        }))

        conditionDefeatAllNoAffiliation = {
            id: "defeat all with no affiliation",
            type: MissionConditionType.DEFEAT_ALL_NO_AFFILIATIONS,
        }

        state = GameEngineStateService.new({
            repository: squaddieRepository,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap,
                    missionCompletionStatus: {
                        "player objective id": {
                            isComplete: undefined,
                            conditions: {
                                [conditionDefeatAllPlayers.id]: undefined,
                            },
                        },
                        "enemy objective id": {
                            isComplete: undefined,
                            conditions: {
                                [conditionDefeatAllEnemies.id]: undefined,
                            },
                        },
                        "ally objective id": {
                            isComplete: undefined,
                            conditions: {
                                [conditionDefeatAllAllies.id]: undefined,
                            },
                        },
                        "no affiliation objective id": {
                            isComplete: undefined,
                            conditions: {
                                [conditionDefeatAllNoAffiliation.id]: undefined,
                            },
                        },
                    },
                }),
            }),
        })
    })

    it("is not complete if squaddies of the given affiliation are alive and on the map", () => {
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: enemy1Dynamic.squaddieTemplateId,
            battleSquaddieId: enemy1Dynamic.battleSquaddieId,
            coordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: enemy2Dynamic.squaddieTemplateId,
            battleSquaddieId: enemy2Dynamic.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })
        InBattleAttributesService.takeDamage({
            inBattleAttributes: enemy1Dynamic.inBattleAttributes,
            damageToTake: 9001,
            damageType: DamageType.UNKNOWN,
        })
        const { isDead } = SquaddieService.canSquaddieActRightNow({
            squaddieTemplate: enemy1Static,
            battleSquaddie: enemy1Dynamic,
        })
        expect(isDead).toBeTruthy()
        expect(
            MissionShouldBeComplete(
                conditionDefeatAllEnemies,
                state,
                "enemy objective id"
            )
        ).toBeFalsy()
    })

    it("is complete if it was already marked complete", () => {
        state.battleOrchestratorState.battleState.missionCompletionStatus[
            "enemy objective id"
        ].conditions[conditionDefeatAllEnemies.id] = true
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: enemy1Dynamic.squaddieTemplateId,
            battleSquaddieId: enemy1Dynamic.battleSquaddieId,
            coordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: player1Dynamic.squaddieTemplateId,
            battleSquaddieId: player1Dynamic.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })
        expect(
            MissionShouldBeComplete(
                conditionDefeatAllEnemies,
                state,
                "enemy objective id"
            )
        ).toBeTruthy()
        expect(
            MissionShouldBeComplete(
                conditionDefeatAllPlayers,
                state,
                "enemy objective id"
            )
        ).toBeFalsy()
    })

    it("is complete if no squaddies of the affiliation exist", () => {
        expect(
            MissionShouldBeComplete(
                conditionDefeatAllEnemies,
                state,
                "enemy objective id"
            )
        ).toBeTruthy()
    })

    it("is complete if all squaddies of the given affiliation are dead", () => {
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: enemy1Dynamic.squaddieTemplateId,
            battleSquaddieId: enemy1Dynamic.battleSquaddieId,
            coordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: player1Dynamic.squaddieTemplateId,
            battleSquaddieId: player1Dynamic.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })
        InBattleAttributesService.takeDamage({
            inBattleAttributes: enemy1Dynamic.inBattleAttributes,
            damageToTake: 9001,
            damageType: DamageType.UNKNOWN,
        })
        const { isDead } = SquaddieService.canSquaddieActRightNow({
            squaddieTemplate: enemy1Static,
            battleSquaddie: enemy1Dynamic,
        })
        expect(isDead).toBeTruthy()
        expect(
            MissionShouldBeComplete(
                conditionDefeatAllEnemies,
                state,
                "enemy objective id"
            )
        ).toBeTruthy()
        expect(
            MissionShouldBeComplete(
                conditionDefeatAllPlayers,
                state,
                "player objective id"
            )
        ).toBeFalsy()
    })
})
