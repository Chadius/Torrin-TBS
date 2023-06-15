import {MissionMap} from "../../missionMap/missionMap";
import {SquaddieActivity} from "../../squaddie/activity";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {CreateNewPathCandidates} from "../../hexMap/hexGridDirection";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {NullArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieTurn} from "../../squaddie/turn";
import {findValidTargets, TargetingResults} from "./targetingService";
import {NewHexCoordinateFromNumberPair} from "../../hexMap/hexGrid";

describe('Targeting Service', () => {
    let longswordActivity: SquaddieActivity;
    let sirCamilStaticSquaddie: BattleSquaddieStatic;
    let sirCamilDynamicSquaddie: BattleSquaddieDynamic;
    let squaddieRepo: BattleSquaddieRepository;

    beforeEach(() => {
        longswordActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
        });

        sirCamilStaticSquaddie = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                name: "Sir Camil",
                staticId: "Sir Camil",
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            activities: [longswordActivity],
            attributes: NullArmyAttributes(),
        });

        sirCamilDynamicSquaddie = new BattleSquaddieDynamic({
            staticSquaddie: sirCamilStaticSquaddie,
            dynamicSquaddieId: "Sir Camil 0",
            squaddieTurn: new SquaddieTurn(),
        });

        squaddieRepo = new BattleSquaddieRepository();
        squaddieRepo.addSquaddie(sirCamilStaticSquaddie, sirCamilDynamicSquaddie);
    });

    it('will indicate which locations to highlight', () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                    "  1 1 1 ",
                ]
            })
        });

        battleMap.addSquaddie(
            sirCamilStaticSquaddie.squaddieId.staticId,
            sirCamilDynamicSquaddie.dynamicSquaddieId,
            {q: 1, r: 1},
        );

        const results: TargetingResults = findValidTargets({
            map: battleMap,
            activity: longswordActivity,
            actingStaticSquaddie: sirCamilStaticSquaddie,
            actingDynamicSquaddie: sirCamilDynamicSquaddie,
            squaddieRepository: squaddieRepo,
        });

        expect(results.locationsInRange).toHaveLength(6);
        expect(results.locationsInRange).toStrictEqual(
            CreateNewPathCandidates(1, 1).map(NewHexCoordinateFromNumberPair)
        );
    });

    it('will highlight nothing if the acting squaddie is not on the map', () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                    "  1 1 1 ",
                ]
            })
        });

        battleMap.addSquaddie(
            sirCamilStaticSquaddie.squaddieId.staticId,
            sirCamilDynamicSquaddie.dynamicSquaddieId,
        );

        const results: TargetingResults = findValidTargets({
            map: battleMap,
            activity: longswordActivity,
            actingStaticSquaddie: sirCamilStaticSquaddie,
            actingDynamicSquaddie: sirCamilDynamicSquaddie,
            squaddieRepository: squaddieRepo,
        });

        expect(results.locationsInRange).toHaveLength(0);
    });

    it('will respect walls and ranged attacks', () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 1 ",
                    " 1 1 x 1 ",
                    "  1 1 1 x ",
                ]
            })
        });

        let longbowActivity = new SquaddieActivity({
            name: "longbow",
            id: "longbow",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 2,
            maximumRange: 3,
        });

        let archerStaticSquaddie = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                name: "Archer",
                staticId: "archer",
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            activities: [longbowActivity],
            attributes: NullArmyAttributes(),
        });

        let archerDynamicSquaddie = new BattleSquaddieDynamic({
            staticSquaddie: archerStaticSquaddie,
            dynamicSquaddieId: "Archer 0",
            squaddieTurn: new SquaddieTurn(),
        });

        squaddieRepo = new BattleSquaddieRepository();
        squaddieRepo.addSquaddie(archerStaticSquaddie, archerDynamicSquaddie);

        battleMap.addSquaddie(
            archerStaticSquaddie.squaddieId.staticId,
            archerDynamicSquaddie.dynamicSquaddieId,
            {q: 1, r: 1},
        );

        const results: TargetingResults = findValidTargets({
            map: battleMap,
            activity: longbowActivity,
            actingStaticSquaddie: archerStaticSquaddie,
            actingDynamicSquaddie: archerDynamicSquaddie,
            squaddieRepository: squaddieRepo,
        });

        expect(results.locationsInRange).toHaveLength(4);
        expect(results.locationsInRange).toContainEqual(NewHexCoordinateFromNumberPair([0, 0]));
        expect(results.locationsInRange).toContainEqual(NewHexCoordinateFromNumberPair([0, 3]));
        expect(results.locationsInRange).toContainEqual(NewHexCoordinateFromNumberPair([1, 3]));
        expect(results.locationsInRange).toContainEqual(NewHexCoordinateFromNumberPair([2, 2]));
    });

    it('will highlight unfriendly squaddies if they are in range', () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 1 ",
                    " 1 1 x 1 ",
                    "  1 1 1 x ",
                ]
            })
        });

        battleMap.addSquaddie(
            sirCamilStaticSquaddie.squaddieId.staticId,
            sirCamilDynamicSquaddie.dynamicSquaddieId,
            {q: 1, r: 1},
        );

        let playerTeamStatic = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                name: "Player",
                staticId: "player",
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            activities: [],
            attributes: NullArmyAttributes(),
        });

        let playerTeamDynamic = new BattleSquaddieDynamic({
            staticSquaddie: playerTeamStatic,
            dynamicSquaddieId: "Player 0",
            squaddieTurn: new SquaddieTurn(),
        });

        squaddieRepo.addSquaddie(playerTeamStatic, playerTeamDynamic);

        battleMap.addSquaddie(
            playerTeamStatic.squaddieId.staticId,
            playerTeamDynamic.dynamicSquaddieId,
            {q: 1, r: 0},
        );

        let enemyTeamStatic = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                name: "Enemy",
                staticId: "enemy",
                affiliation: SquaddieAffiliation.ENEMY,
            }),
            activities: [],
            attributes: NullArmyAttributes(),
        });

        let enemyTeamDynamic = new BattleSquaddieDynamic({
            staticSquaddie: enemyTeamStatic,
            dynamicSquaddieId: "enemy 0",
            squaddieTurn: new SquaddieTurn(),
        });

        squaddieRepo.addSquaddie(enemyTeamStatic, enemyTeamDynamic);

        battleMap.addSquaddie(
            enemyTeamStatic.squaddieId.staticId,
            enemyTeamDynamic.dynamicSquaddieId,
            {q: 2, r: 1},
        );

        let enemyFarAwayTeamStatic = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                name: "Enemy far away",
                staticId: "enemy far away",
                affiliation: SquaddieAffiliation.ENEMY,
            }),
            activities: [],
            attributes: NullArmyAttributes(),
        });

        let enemyFarAwayTeamDynamic = new BattleSquaddieDynamic({
            staticSquaddie: enemyFarAwayTeamStatic,
            dynamicSquaddieId: "enemy far away 0",
            squaddieTurn: new SquaddieTurn(),
        });

        squaddieRepo.addSquaddie(enemyFarAwayTeamStatic, enemyFarAwayTeamDynamic);

        battleMap.addSquaddie(
            enemyFarAwayTeamStatic.squaddieId.staticId,
            enemyFarAwayTeamDynamic.dynamicSquaddieId,
            {q: 0, r: 3},
        );

        const results: TargetingResults = findValidTargets({
            map: battleMap,
            activity: longswordActivity,
            actingStaticSquaddie: sirCamilStaticSquaddie,
            actingDynamicSquaddie: sirCamilDynamicSquaddie,
            squaddieRepository: squaddieRepo,
        });

        expect(results.dynamicSquaddieIdsInRange).toHaveLength(1);
        expect(results.dynamicSquaddieIdsInRange).toContain(enemyTeamDynamic.dynamicSquaddieId);
    });
});
