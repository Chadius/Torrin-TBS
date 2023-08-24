import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {MissionConditionDefeatAllEnemies} from "./missionConditionDefeatAllEnemies";
import {CanSquaddieActRightNow, DamageType} from "../../squaddie/squaddieService";
import {MissionConditionType} from "./missionCondition";

describe('Mission Condition: Defeat All Enemies', () => {
    let missionMap: MissionMap;
    let enemy1Static: BattleSquaddieStatic;
    let enemy1Dynamic: BattleSquaddieDynamic;
    let enemy2Static: BattleSquaddieStatic;
    let enemy2Dynamic: BattleSquaddieDynamic;
    let condition: MissionConditionDefeatAllEnemies;
    let state: BattleOrchestratorState;

    beforeEach(() => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 "]
            })
        });

        let squaddieRepository = new BattleSquaddieRepository();

        ({
            staticSquaddie: enemy1Static,
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
            staticSquaddie: enemy2Static,
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

        condition = new MissionConditionDefeatAllEnemies({squaddieRepository});

        state = new BattleOrchestratorState({
            missionMap,
            hexMap: missionMap.terrainTileMap,
            squaddieRepo: squaddieRepository,
        })
    });

    it('knows what type it is', () => {
        expect(condition.conditionType).toBe(MissionConditionType.DEFEAT_ALL_ENEMIES);
    });

    it('is not complete if enemies are alive and on the map', () => {
        missionMap.addSquaddie(enemy1Static.staticId, enemy1Dynamic.dynamicSquaddieId, new HexCoordinate({q: 0, r: 0}));
        missionMap.addSquaddie(enemy2Static.staticId, enemy2Dynamic.dynamicSquaddieId, new HexCoordinate({q: 0, r: 1}));
        enemy1Dynamic.inBattleAttributes.takeDamage(9001, DamageType.Unknown);
        const {
            isDead
        } = CanSquaddieActRightNow({staticSquaddie: enemy1Static, dynamicSquaddie: enemy1Dynamic})
        expect(isDead).toBeTruthy();
        expect(condition.shouldBeComplete(state)).toBeFalsy();
    });

    it('is complete if it was already marked complete', () => {
        condition.isComplete = true;
        missionMap.addSquaddie(enemy1Static.staticId, enemy1Dynamic.dynamicSquaddieId, new HexCoordinate({q: 0, r: 0}));
        expect(condition.shouldBeComplete(state)).toBeTruthy();
    });

    it('is complete if no enemies exist', () => {
        expect(condition.shouldBeComplete(state)).toBeTruthy();
    });

    it('is complete if enemies are dead', () => {
        missionMap.addSquaddie(enemy1Static.staticId, enemy1Dynamic.dynamicSquaddieId, new HexCoordinate({q: 0, r: 0}));
        enemy1Dynamic.inBattleAttributes.takeDamage(9001, DamageType.Unknown);
        const {
            isDead
        } = CanSquaddieActRightNow({staticSquaddie: enemy1Static, dynamicSquaddie: enemy1Dynamic})
        expect(isDead).toBeTruthy();
        expect(condition.shouldBeComplete(state)).toBeTruthy();
    });
});
