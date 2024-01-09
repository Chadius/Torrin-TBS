import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {BattleOrchestratorState, BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {ObjectRepositoryService} from "../objectRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {DamageType, SquaddieService} from "../../squaddie/squaddieService";
import {MissionCondition, MissionConditionType, MissionShouldBeComplete} from "./missionCondition";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {InBattleAttributesHandler} from "../stats/inBattleAttributes";
import {BattleStateService} from "../orchestrator/battleState";

describe('Mission Condition: Defeat All Squaddies of a given Affiliation', () => {
    let missionMap: MissionMap;

    let player1Static: SquaddieTemplate;
    let player1Dynamic: BattleSquaddie;
    let conditionDefeatAllPlayers: MissionCondition;

    let ally1Static: SquaddieTemplate;
    let ally1Dynamic: BattleSquaddie;
    let conditionDefeatAllAllies: MissionCondition;

    let noAffiliation1Static: SquaddieTemplate;
    let noAffiliation1Dynamic: BattleSquaddie;
    let conditionDefeatAllNoAffiliation: MissionCondition;

    let enemy1Static: SquaddieTemplate;
    let enemy1Dynamic: BattleSquaddie;
    let enemy2Static: SquaddieTemplate;
    let enemy2Dynamic: BattleSquaddie;
    let conditionDefeatAllEnemies: MissionCondition;
    let state: BattleOrchestratorState;
    let squaddieRepository = ObjectRepositoryService.new();

    beforeEach(() => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 "]
            })
        });

        squaddieRepository = ObjectRepositoryService.new();

        ({
            squaddieTemplate: enemy1Static,
            battleSquaddie: enemy1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "enemy 1",
            templateId: "enemy 1",
            battleId: "enemy 1",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            attributes: {
                maxHitPoints: 1,
                movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                armorClass: 0,
            }
        }));

        ({
            squaddieTemplate: enemy2Static,
            battleSquaddie: enemy2Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "enemy 2",
            templateId: "enemy 2",
            battleId: "enemy 2",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            attributes: {
                maxHitPoints: 1,
                movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                armorClass: 0,
            }
        }));

        conditionDefeatAllEnemies = {
            id: "defeat all enemies",
            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
        };

        ({
            squaddieTemplate: player1Static,
            battleSquaddie: player1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "player 1",
            templateId: "player 1",
            battleId: "player 1",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
            attributes: {
                maxHitPoints: 1,
                movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                armorClass: 0,
            }
        }));

        conditionDefeatAllPlayers = {
            id: "defeat all players",
            type: MissionConditionType.DEFEAT_ALL_PLAYERS,
        };

        ({
            squaddieTemplate: ally1Static,
            battleSquaddie: ally1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "ally 1",
            templateId: "ally 1",
            battleId: "ally 1",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository,
            attributes: {
                maxHitPoints: 1,
                movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                armorClass: 0,
            }
        }));

        conditionDefeatAllAllies = {
            id: "defeat all allies",
            type: MissionConditionType.DEFEAT_ALL_ALLIES,
        };

        ({
            squaddieTemplate: noAffiliation1Static,
            battleSquaddie: noAffiliation1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "no affiliation 1",
            templateId: "no affiliation 1",
            battleId: "no affiliation 1",
            affiliation: SquaddieAffiliation.NONE,
            squaddieRepository,
            attributes: {
                maxHitPoints: 1,
                movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                armorClass: 0,
            }
        }));

        conditionDefeatAllNoAffiliation = {
            id: "defeat all with no affiliation",
            type: MissionConditionType.DEFEAT_ALL_NO_AFFILIATIONS,
        };

        state = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                missionMap,
                missionCompletionStatus: {
                    "player objective id": {
                        isComplete: undefined,
                        conditions: {
                            [conditionDefeatAllPlayers.id]: undefined,
                        }
                    },
                    "enemy objective id": {
                        isComplete: undefined,
                        conditions: {
                            [conditionDefeatAllEnemies.id]: undefined,
                        }
                    },
                    "ally objective id": {
                        isComplete: undefined,
                        conditions: {
                            [conditionDefeatAllAllies.id]: undefined,
                        }
                    },
                    "no affiliation objective id": {
                        isComplete: undefined,
                        conditions: {
                            [conditionDefeatAllNoAffiliation.id]: undefined,
                        }
                    },
                },
            }),
        })
    });

    it('is not complete if squaddies of the given affiliation are alive and on the map', () => {
        missionMap.addSquaddie(enemy1Static.squaddieId.templateId, enemy1Dynamic.battleSquaddieId, {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(enemy2Static.squaddieId.templateId, enemy2Dynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        InBattleAttributesHandler.takeDamage(
            enemy1Dynamic.inBattleAttributes,
            9001, DamageType.UNKNOWN
        );
        const {
            isDead
        } = SquaddieService.canSquaddieActRightNow({squaddieTemplate: enemy1Static, battleSquaddie: enemy1Dynamic})
        expect(isDead).toBeTruthy();
        expect(MissionShouldBeComplete(conditionDefeatAllEnemies, state, "enemy objective id")).toBeFalsy();
    });

    it('is complete if it was already marked complete', () => {
        state.battleState.missionCompletionStatus["enemy objective id"].conditions[conditionDefeatAllEnemies.id] = true;
        missionMap.addSquaddie(enemy1Static.squaddieId.templateId, enemy1Dynamic.battleSquaddieId, {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(player1Static.squaddieId.templateId, player1Dynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        expect(MissionShouldBeComplete(conditionDefeatAllEnemies, state, "enemy objective id")).toBeTruthy();
        expect(MissionShouldBeComplete(conditionDefeatAllPlayers, state, "enemy objective id")).toBeFalsy();
    });

    it('is complete if no squaddies of the affiliation exist', () => {
        expect(MissionShouldBeComplete(conditionDefeatAllEnemies, state, "enemy objective id")).toBeTruthy();
    });

    it('is complete if all squaddies of the given affiliation are dead', () => {
        missionMap.addSquaddie(enemy1Static.squaddieId.templateId, enemy1Dynamic.battleSquaddieId, {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(player1Static.squaddieId.templateId, player1Dynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        InBattleAttributesHandler.takeDamage(
            enemy1Dynamic.inBattleAttributes,
            9001, DamageType.UNKNOWN);
        const {
            isDead
        } = SquaddieService.canSquaddieActRightNow({squaddieTemplate: enemy1Static, battleSquaddie: enemy1Dynamic})
        expect(isDead).toBeTruthy();
        expect(MissionShouldBeComplete(conditionDefeatAllEnemies, state, "enemy objective id")).toBeTruthy();
        expect(MissionShouldBeComplete(conditionDefeatAllPlayers, state, "player objective id")).toBeFalsy();
    });
});
