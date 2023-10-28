import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionConditionDefeatAffiliation} from "./missionConditionDefeatAffiliation";
import {CanSquaddieActRightNow, DamageType} from "../../squaddie/squaddieService";
import {MissionConditionType} from "./missionCondition";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {InBattleAttributesHandler} from "../stats/inBattleAttributes";

describe('Mission Condition: Defeat All Squaddies of a given Affiliation', () => {
    let missionMap: MissionMap;

    let player1Static: SquaddieTemplate;
    let player1Dynamic: BattleSquaddie;
    let conditionDefeatAllPlayers: MissionConditionDefeatAffiliation;

    let ally1Static: SquaddieTemplate;
    let ally1Dynamic: BattleSquaddie;
    let conditionDefeatAllAllies: MissionConditionDefeatAffiliation;

    let noAffiliation1Static: SquaddieTemplate;
    let noAffiliation1Dynamic: BattleSquaddie;
    let conditionDefeatAllNoAffiliation: MissionConditionDefeatAffiliation;

    let enemy1Static: SquaddieTemplate;
    let enemy1Dynamic: BattleSquaddie;
    let enemy2Static: SquaddieTemplate;
    let enemy2Dynamic: BattleSquaddie;
    let conditionDefeatAllEnemies: MissionConditionDefeatAffiliation;
    let state: BattleOrchestratorState;
    let squaddieRepository = new BattleSquaddieRepository();

    beforeEach(() => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 "]
            })
        });

        squaddieRepository = new BattleSquaddieRepository();

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

        conditionDefeatAllEnemies = new MissionConditionDefeatAffiliation({
            affiliation: SquaddieAffiliation.ENEMY,
        });

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

        conditionDefeatAllPlayers = new MissionConditionDefeatAffiliation({
            affiliation: SquaddieAffiliation.PLAYER,
        });

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

        conditionDefeatAllAllies = new MissionConditionDefeatAffiliation({
            affiliation: SquaddieAffiliation.ALLY,
        });

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

        conditionDefeatAllNoAffiliation = new MissionConditionDefeatAffiliation({
            affiliation: SquaddieAffiliation.NONE,
        });

        state = new BattleOrchestratorState({
            missionMap,
            hexMap: missionMap.terrainTileMap,
            squaddieRepository: squaddieRepository,
        })
    });

    it('knows what type it is', () => {
        expect(conditionDefeatAllEnemies.conditionType).toBe(MissionConditionType.DEFEAT_ALL_ENEMIES);
        expect(conditionDefeatAllPlayers.conditionType).toBe(MissionConditionType.DEFEAT_ALL_PLAYERS);
        expect(conditionDefeatAllAllies.conditionType).toBe(MissionConditionType.DEFEAT_ALL_ALLIES);
        expect(conditionDefeatAllNoAffiliation.conditionType).toBe(MissionConditionType.DEFEAT_ALL_NO_AFFILIATIONS);
    });

    it('throws an error if it is made with an unknown affiliation', () => {
        const shouldThrowErrorUnknown = () => {
            return new MissionConditionDefeatAffiliation({
                affiliation: SquaddieAffiliation.UNKNOWN,
            });
        }

        expect(() => {
            shouldThrowErrorUnknown()
        }).toThrow(Error);
        expect(() => {
            shouldThrowErrorUnknown()
        }).toThrow("No mission condition type exists for defeat all UNKNOWN");
    });

    it('is not complete if squaddies of the given affiliation are alive and on the map', () => {
        missionMap.addSquaddie(enemy1Static.templateId, enemy1Dynamic.battleSquaddieId, {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(enemy2Static.templateId, enemy2Dynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        InBattleAttributesHandler.takeDamage(
            enemy1Dynamic.inBattleAttributes,
            9001, DamageType.Unknown
        );
        const {
            isDead
        } = CanSquaddieActRightNow({squaddieTemplate: enemy1Static, battleSquaddie: enemy1Dynamic})
        expect(isDead).toBeTruthy();
        expect(conditionDefeatAllEnemies.shouldBeComplete(state)).toBeFalsy();
    });

    it('is complete if it was already marked complete', () => {
        conditionDefeatAllEnemies.isComplete = true;
        missionMap.addSquaddie(enemy1Static.templateId, enemy1Dynamic.battleSquaddieId, {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(player1Static.templateId, player1Dynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        expect(conditionDefeatAllEnemies.shouldBeComplete(state)).toBeTruthy();
        expect(conditionDefeatAllPlayers.shouldBeComplete(state)).toBeFalsy();
    });

    it('is complete if no squaddies of the affiliation exist', () => {
        expect(conditionDefeatAllEnemies.shouldBeComplete(state)).toBeTruthy();
    });

    it('is complete if all squaddies of the given affiliation are dead', () => {
        missionMap.addSquaddie(enemy1Static.templateId, enemy1Dynamic.battleSquaddieId, {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(player1Static.templateId, player1Dynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        InBattleAttributesHandler.takeDamage(
            enemy1Dynamic.inBattleAttributes,
            9001, DamageType.Unknown);
        const {
            isDead
        } = CanSquaddieActRightNow({squaddieTemplate: enemy1Static, battleSquaddie: enemy1Dynamic})
        expect(isDead).toBeTruthy();
        expect(conditionDefeatAllEnemies.shouldBeComplete(state)).toBeTruthy();
        expect(conditionDefeatAllPlayers.shouldBeComplete(state)).toBeFalsy();
    });
});
