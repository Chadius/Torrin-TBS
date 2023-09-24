import {MissionMap} from "../../missionMap/missionMap";
import {SquaddieActivity} from "../../squaddie/activity";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {CreateNewNeighboringCoordinates} from "../../hexMap/hexGridDirection";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {FindValidTargets, TargetingResults} from "./targetingService";

import {HexCoordinate, NewHexCoordinateFromNumberPair} from "../../hexMap/hexCoordinate/hexCoordinate";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";

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

        squaddieRepo = new BattleSquaddieRepository();
        ({
            staticSquaddie: sirCamilStaticSquaddie,
            dynamicSquaddie: sirCamilDynamicSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Sir Camil",
            staticId: "Sir Camil",
            dynamicId: "Sir Camil 0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
        }));
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
            new HexCoordinate({q: 1, r: 1}),
        );

        const results: TargetingResults = FindValidTargets({
            map: battleMap,
            activity: longswordActivity,
            actingStaticSquaddie: sirCamilStaticSquaddie,
            actingDynamicSquaddie: sirCamilDynamicSquaddie,
            squaddieRepository: squaddieRepo,
        });

        expect(results.locationsInRange).toHaveLength(6);
        expect(results.locationsInRange).toStrictEqual(
            CreateNewNeighboringCoordinates(1, 1)
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

        const results: TargetingResults = FindValidTargets({
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

        squaddieRepo = new BattleSquaddieRepository();
        let {
            staticSquaddie: archerStaticSquaddie,
            dynamicSquaddie: archerDynamicSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Archer",
            staticId: "archer",
            dynamicId: "Archer 0",
            affiliation: SquaddieAffiliation.PLAYER,
            activities: [longbowActivity],
            squaddieRepository: squaddieRepo,
        });

        battleMap.addSquaddie(
            archerStaticSquaddie.squaddieId.staticId,
            archerDynamicSquaddie.dynamicSquaddieId,
            new HexCoordinate({q: 1, r: 1}),
        );

        const results: TargetingResults = FindValidTargets({
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
            new HexCoordinate({q: 1, r: 1}),
        );

        let {
            staticSquaddie: playerTeamStatic,
            dynamicSquaddie: playerTeamDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Player",
            staticId: "player",
            dynamicId: "Player 0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
        });

        battleMap.addSquaddie(
            playerTeamStatic.squaddieId.staticId,
            playerTeamDynamic.dynamicSquaddieId,
            new HexCoordinate({q: 1, r: 0}),
        );

        let {
            staticSquaddie: enemyTeamStatic,
            dynamicSquaddie: enemyTeamDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Enemy",
            staticId: "enemy",
            dynamicId: "enemy 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
        });

        battleMap.addSquaddie(
            enemyTeamStatic.squaddieId.staticId,
            enemyTeamDynamic.dynamicSquaddieId,
            new HexCoordinate({q: 2, r: 1}),
        );

        let {
            staticSquaddie: enemyFarAwayTeamStatic,
            dynamicSquaddie: enemyFarAwayTeamDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Enemy far away",
            staticId: "enemy far away",
            dynamicId: "enemy far away 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
        });

        battleMap.addSquaddie(
            enemyFarAwayTeamStatic.squaddieId.staticId,
            enemyFarAwayTeamDynamic.dynamicSquaddieId,
            new HexCoordinate({q: 0, r: 3}),
        );

        const results: TargetingResults = FindValidTargets({
            map: battleMap,
            activity: longswordActivity,
            actingStaticSquaddie: sirCamilStaticSquaddie,
            actingDynamicSquaddie: sirCamilDynamicSquaddie,
            squaddieRepository: squaddieRepo,
        });

        expect(results.dynamicSquaddieIdsInRange).toHaveLength(1);
        expect(results.dynamicSquaddieIdsInRange).toContain(enemyTeamDynamic.dynamicSquaddieId);
    });

    it('will ignore terrain costs when targeting', () => {
        let longbowActivity: SquaddieActivity = new SquaddieActivity({
            name: "longbow",
            id: "longbow",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 3,
        });

        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "2 2 2 2 ",
                ]
            })
        });

        battleMap.addSquaddie(
            sirCamilStaticSquaddie.squaddieId.staticId,
            sirCamilDynamicSquaddie.dynamicSquaddieId,
            new HexCoordinate({q: 0, r: 0}),
        );

        const results: TargetingResults = FindValidTargets({
            map: battleMap,
            activity: longbowActivity,
            actingStaticSquaddie: sirCamilStaticSquaddie,
            actingDynamicSquaddie: sirCamilDynamicSquaddie,
            squaddieRepository: squaddieRepo,
        });

        expect(results.locationsInRange).toHaveLength(3);
        expect(results.locationsInRange).toStrictEqual([
            new HexCoordinate({q: 0, r: 1}),
            new HexCoordinate({q: 0, r: 2}),
            new HexCoordinate({q: 0, r: 3}),
        ]);
    });
});
