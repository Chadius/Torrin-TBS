import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {MissionConditionDefeatAffiliation} from "./missionConditionDefeatAffiliation";
import {CanSquaddieActRightNow, DamageType} from "../../squaddie/squaddieService";
import {MissionConditionType} from "./missionCondition";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

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
            squaddietemplate: enemy1Static,
            dynamicSquaddie: enemy1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "enemy 1",
            staticId: "enemy 1",
            dynamicId: "enemy 1",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            attributes: new ArmyAttributes({
                maxHitPoints: 1
            })
        }));

        ({
            squaddietemplate: enemy2Static,
            dynamicSquaddie: enemy2Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "enemy 2",
            staticId: "enemy 2",
            dynamicId: "enemy 2",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            attributes: new ArmyAttributes({
                maxHitPoints: 1
            })
        }));

        conditionDefeatAllEnemies = new MissionConditionDefeatAffiliation({
            affiliation: SquaddieAffiliation.ENEMY,
        });

        ({
            squaddietemplate: player1Static,
            dynamicSquaddie: player1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "player 1",
            staticId: "player 1",
            dynamicId: "player 1",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
            attributes: new ArmyAttributes({
                maxHitPoints: 1
            })
        }));

        conditionDefeatAllPlayers = new MissionConditionDefeatAffiliation({
            affiliation: SquaddieAffiliation.PLAYER,
        });

        ({
            squaddietemplate: ally1Static,
            dynamicSquaddie: ally1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "ally 1",
            staticId: "ally 1",
            dynamicId: "ally 1",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository,
            attributes: new ArmyAttributes({
                maxHitPoints: 1
            })
        }));

        conditionDefeatAllAllies = new MissionConditionDefeatAffiliation({
            affiliation: SquaddieAffiliation.ALLY,
        });

        ({
            squaddietemplate: noAffiliation1Static,
            dynamicSquaddie: noAffiliation1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "no affiliation 1",
            staticId: "no affiliation 1",
            dynamicId: "no affiliation 1",
            affiliation: SquaddieAffiliation.NONE,
            squaddieRepository,
            attributes: new ArmyAttributes({
                maxHitPoints: 1
            })
        }));

        conditionDefeatAllNoAffiliation = new MissionConditionDefeatAffiliation({
            affiliation: SquaddieAffiliation.NONE,
        });

        state = new BattleOrchestratorState({
            missionMap,
            hexMap: missionMap.terrainTileMap,
            squaddieRepo: squaddieRepository,
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
        missionMap.addSquaddie(enemy1Static.staticId, enemy1Dynamic.dynamicSquaddieId, new HexCoordinate({q: 0, r: 0}));
        missionMap.addSquaddie(enemy2Static.staticId, enemy2Dynamic.dynamicSquaddieId, new HexCoordinate({q: 0, r: 1}));
        enemy1Dynamic.inBattleAttributes.takeDamage(9001, DamageType.Unknown);
        const {
            isDead
        } = CanSquaddieActRightNow({squaddietemplate: enemy1Static, dynamicSquaddie: enemy1Dynamic})
        expect(isDead).toBeTruthy();
        expect(conditionDefeatAllEnemies.shouldBeComplete(state)).toBeFalsy();
    });

    it('is complete if it was already marked complete', () => {
        conditionDefeatAllEnemies.isComplete = true;
        missionMap.addSquaddie(enemy1Static.staticId, enemy1Dynamic.dynamicSquaddieId, new HexCoordinate({q: 0, r: 0}));
        missionMap.addSquaddie(player1Static.staticId, player1Dynamic.dynamicSquaddieId, new HexCoordinate({
            q: 0,
            r: 1
        }));
        expect(conditionDefeatAllEnemies.shouldBeComplete(state)).toBeTruthy();
        expect(conditionDefeatAllPlayers.shouldBeComplete(state)).toBeFalsy();
    });

    it('is complete if no squaddies of the affiliation exist', () => {
        expect(conditionDefeatAllEnemies.shouldBeComplete(state)).toBeTruthy();
    });

    it('is complete if all squaddies of the given affiliation are dead', () => {
        missionMap.addSquaddie(enemy1Static.staticId, enemy1Dynamic.dynamicSquaddieId, new HexCoordinate({q: 0, r: 0}));
        missionMap.addSquaddie(player1Static.staticId, player1Dynamic.dynamicSquaddieId, new HexCoordinate({
            q: 0,
            r: 1
        }));
        enemy1Dynamic.inBattleAttributes.takeDamage(9001, DamageType.Unknown);
        const {
            isDead
        } = CanSquaddieActRightNow({squaddietemplate: enemy1Static, dynamicSquaddie: enemy1Dynamic})
        expect(isDead).toBeTruthy();
        expect(conditionDefeatAllEnemies.shouldBeComplete(state)).toBeTruthy();
        expect(conditionDefeatAllPlayers.shouldBeComplete(state)).toBeFalsy();
    });
});
