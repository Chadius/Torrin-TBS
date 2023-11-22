import {Pathfinder} from "./pathfinder";
import {SearchParametersHelper} from "./searchParams";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {SearchPath, SearchPathHelper} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";
import {getResultOrThrowError, ResultOrError} from "../../utils/ResultOrError";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {createMap, validateTilesAreFound} from "./pathfinder_test_utils";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {GetTargetingShapeGenerator, TargetingShape} from "../../battle/targeting/targetingShapeGenerator";
import {DamageType, DealDamageToTheSquaddie} from "../../squaddie/squaddieService";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";

describe('pathfinder and squaddies', () => {
    let squaddieRepository: BattleSquaddieRepository;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
    });

    describe('squaddie affiliations can allow pass through', () => {
        let missionMap: MissionMap;

        beforeEach(() => {
            const {
                missionMap: tempMissionMap,
            } = createMap([
                "1 1 1 1 1 ",
            ]);

            missionMap = tempMissionMap;
        });

        const validateCanPassThroughFriendly = (searchResults: SearchResults) => {
            validateTilesAreFound(
                searchResults.getReachableTiles(),
                [
                    {q: 0, r: 0,},
                    {q: 0, r: 2,},
                    {q: 0, r: 3,},
                ],
                [
                    {q: 0, r: 1,},
                ]
            );
        }

        const validateCannotPassThroughUnfriendly = (searchResults: SearchResults) => {
            validateTilesAreFound(
                searchResults.getReachableTiles(),
                [
                    {q: 0, r: 0,},
                ],
                [
                    {q: 0, r: 1,},
                    {q: 0, r: 2,},
                    {q: 0, r: 3,},
                ]
            );
        }

        const validateAffiliatePassingStatus = (
            pathfindingAffiliation: SquaddieAffiliation,
            blockingAffiliation: SquaddieAffiliation,
            canPassThrough: boolean
        ) => {
            const blockingSquaddie = {
                name: "blocker",
                templateId: "blocker",
                resources: {mapIconResourceKey: "map_icon_blocker", actionSpritesByEmotion: {}},
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                affiliation: blockingAffiliation,
            };
            missionMap.addSquaddie(blockingSquaddie.templateId, "dynamic_0", {q: 0, r: 1});
            let squaddieRepository = new BattleSquaddieRepository();
            CreateNewSquaddieAndAddToRepository({
                templateId: "blocker",
                battleId: "dynamic_0",
                name: "blocker",
                affiliation: blockingAffiliation,
                squaddieRepository
            });

            const searchResults: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: {q: 0, r: 0},
                            affiliation: pathfindingAffiliation,
                        },
                        movement: {
                            movementPerAction: 3,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: false,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 1,
                        }
                    }
                ),
                missionMap,
                squaddieRepository,
            ));
            if (canPassThrough) {
                validateCanPassThroughFriendly(searchResults);
                return;
            }
            validateCannotPassThroughUnfriendly(searchResults);
        }

        it('player can pass through another player', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.PLAYER,
                true,
            );
        });

        it('player can pass through an ally', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.ALLY,
                true,
            );
        });

        it('player cannot pass through enemy', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.ENEMY,
                false,
            );
        });

        it('player cannot pass through no affiliation', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.NONE,
                false,
            );
        });

        it('enemy cannot pass through player', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.PLAYER,
                false,
            );
        });

        it('enemy cannot pass through an ally', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.ALLY,
                false,
            );
        });

        it('enemy can pass through enemy', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.ENEMY,
                true,
            );
        });

        it('enemy cannot pass through no affiliation', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.NONE,
                false,
            );
        });

        it('ally can pass through another player', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.PLAYER,
                true,
            );
        });

        it('ally can pass through another ally', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.ALLY,
                true,
            );
        });

        it('ally cannot pass through enemy', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.ENEMY,
                false,
            );
        });

        it('ally cannot pass through no affiliation', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.NONE,
                false,
            );
        });

        it('cannot pass through player without an affiliation', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.NONE,
                SquaddieAffiliation.PLAYER,
                false,
            );
        });

        it('cannot pass through enemy without an affiliation', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.NONE,
                SquaddieAffiliation.ENEMY,
                false,
            );
        });

        it('cannot pass through ally without an affiliation', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.NONE,
                SquaddieAffiliation.ENEMY,
                false,
            );
        });

        it('squaddies with no affiliation cannot pass through each other', () => {
            validateAffiliatePassingStatus(
                SquaddieAffiliation.NONE,
                SquaddieAffiliation.NONE,
                false,
            );
        });

    });

    it('should stop on squaddies if allowed', () => {
        const {
            missionMap,
        } = createMap([
            "1 1 1 1 1 1 ",
        ]);

        missionMap.addSquaddie("player", "player_dynamic_0", {q: 0, r: 0});
        missionMap.addSquaddie("enemy", "enemy_dynamic_0", {q: 0, r: 1});
        missionMap.addSquaddie("ally", "ally_dynamic_0", {q: 0, r: 2});
        missionMap.addSquaddie("none", "none_dynamic_0", {q: 0, r: 3});

        CreateNewSquaddieAndAddToRepository({
            templateId: "player",
            battleId: "player_dynamic_0",
            name: "player",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        });

        CreateNewSquaddieAndAddToRepository({
            templateId: "enemy",
            battleId: "enemy_dynamic_0",
            name: "enemy",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
        });

        CreateNewSquaddieAndAddToRepository({
            templateId: "ally",
            battleId: "ally_dynamic_0",
            name: "ally",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository,
        });

        CreateNewSquaddieAndAddToRepository({
            templateId: "none",
            battleId: "none_dynamic_0",
            name: "none",
            affiliation: SquaddieAffiliation.NONE,
            squaddieRepository,
        });


        const allTilesOnMap: SearchResults = getResultOrThrowError(Pathfinder.getAllReachableTiles(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: {q: 0, r: 0},
                        affiliation: SquaddieAffiliation.UNKNOWN,
                    },
                    movement: {
                        movementPerAction: 10,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                        maximumDistanceMoved: undefined,
                        minimumDistanceMoved: 0,
                        canStopOnSquaddies: true,
                        ignoreTerrainPenalty: false,
                        crossOverPits: false,
                        passThroughWalls: false,
                    },
                    stopCondition: {
                        stopLocation: undefined,
                        numberOfActions: 1,
                    }
                }
            ),
            missionMap,
            squaddieRepository,
        ));

        validateTilesAreFound(
            allTilesOnMap.getReachableTiles(),
            [
                {q: 0, r: 0,},
                {q: 0, r: 1,},
                {q: 0, r: 2,},
                {q: 0, r: 3,},
                {q: 0, r: 4,},
                {q: 0, r: 5,},
            ],
            []
        );
    });

    it('will move around unfriendly squaddies', () => {
        const {
            missionMap,

        } = createMap([
            "1 1 1 1 1 ",
            " 1 1 1 1 1 ",
        ]);

        missionMap.addSquaddie("enemy", "dynamic_0", {q: 0, r: 1});

        let squaddieRepository = new BattleSquaddieRepository();

        CreateNewSquaddieAndAddToRepository({
            templateId: "enemy",
            battleId: "dynamic_0",
            name: "enemy",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository
        });

        const searchResults: ResultOrError<SearchResults, Error> = Pathfinder.findPathToStopLocation(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: {q: 0, r: 0},
                        affiliation: SquaddieAffiliation.PLAYER,
                    },
                    movement: {
                        movementPerAction: 10,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                        maximumDistanceMoved: undefined,
                        minimumDistanceMoved: undefined,
                        canStopOnSquaddies: false,
                        ignoreTerrainPenalty: false,
                        crossOverPits: false,
                        passThroughWalls: false,
                    },
                    stopCondition: {
                        stopLocation: {q: 0, r: 2},
                        numberOfActions: 1,
                    }
                }
            ),
            missionMap,
            squaddieRepository
        );

        let routeFound: SearchPath;
        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);
        const tilesTraveled: TileFoundDescription[] = SearchPathHelper.getTilesTraveled(routeFound)
        expect(tilesTraveled).toHaveLength(4);
        expect(tilesTraveled[0]).toEqual(
            {
                hexCoordinate: {q: 0, r: 0},
                movementCost: 0
            }
        );
        expect(tilesTraveled[1]).toEqual(
            {
                hexCoordinate: {q: 1, r: 0},
                movementCost: 1
            }
        );
        expect(tilesTraveled[2]).toEqual(
            {
                hexCoordinate: {q: 1, r: 1},
                movementCost: 2
            }
        );
        expect(tilesTraveled[3]).toEqual(
            {
                hexCoordinate: {q: 0, r: 2},
                movementCost: 3
            }
        );
    });

    it('will move through dead squaddies', () => {
        const {
            missionMap,

        } = createMap([
            "1 1 1 1 1 ",
            " 1 1 1 1 1 ",
        ]);

        missionMap.addSquaddie("enemy", "dynamic_0", {q: 0, r: 1});

        let squaddieRepository = new BattleSquaddieRepository();

        const {battleSquaddie: enemyDynamic, squaddieTemplate: enemyStatic}
            = CreateNewSquaddieAndAddToRepository({
            templateId: "enemy",
            battleId: "dynamic_0",
            name: "enemy",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository
        });
        DealDamageToTheSquaddie({
            squaddieTemplate: enemyStatic,
            battleSquaddie: enemyDynamic,
            damage: enemyDynamic.inBattleAttributes.currentHitPoints,
            damageType: DamageType.Body,
        });

        const searchResults: ResultOrError<SearchResults, Error> = Pathfinder.findPathToStopLocation(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: {q: 0, r: 0},
                        affiliation: SquaddieAffiliation.PLAYER,
                    },
                    movement: {
                        movementPerAction: 10,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                        maximumDistanceMoved: undefined,
                        minimumDistanceMoved: undefined,
                        canStopOnSquaddies: false,
                        ignoreTerrainPenalty: false,
                        crossOverPits: false,
                        passThroughWalls: false,
                    },
                    stopCondition: {
                        stopLocation: {q: 0, r: 2},
                        numberOfActions: undefined,
                    }
                }
            ),
            missionMap,
            squaddieRepository,
        );

        let routeFound: SearchPath;
        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);
        const tilesTraveled: TileFoundDescription[] = SearchPathHelper.getTilesTraveled(routeFound);
        expect(tilesTraveled).toHaveLength(3);
        expect(tilesTraveled[0]).toEqual(
            {
                hexCoordinate: {q: 0, r: 0},
                movementCost: 0
            }
        );
        expect(tilesTraveled[1]).toEqual(
            {
                hexCoordinate: {q: 0, r: 1},
                movementCost: 1
            }
        );
        expect(tilesTraveled[2]).toEqual(
            {
                hexCoordinate: {q: 0, r: 2},
                movementCost: 2
            }
        );
    });

    it('knows which squaddies it was adjacent to', () => {
        const {
            missionMap,

        } = createMap([
            "1 1 1 1 1 1 1 1 1 1 ",
            " 1 1 1 1 1 ",
        ]);

        missionMap.addSquaddie("enemy_nearby", "enemy_nearby_dynamic_0", {q: 0, r: 2});
        missionMap.addSquaddie("ally_flanking", "ally_flanking_dynamic_0", {q: 0, r: 3});
        missionMap.addSquaddie("ally_at_the_edge", "ally_at_the_edge_dynamic_0", {q: 0, r: 4});
        missionMap.addSquaddie("ally_far_away", "ally_far_away_dynamic_0", {q: 0, r: 8});

        let squaddieRepository = new BattleSquaddieRepository();
        CreateNewSquaddieAndAddToRepository({
            templateId: "enemy_nearby",
            battleId: "enemy_nearby_dynamic_0",
            name: "enemy_nearby_enemy",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository
        });
        CreateNewSquaddieAndAddToRepository({
            templateId: "ally_flanking",
            battleId: "ally_flanking_dynamic_0",
            name: "ally_flanking_enemy",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository
        });
        CreateNewSquaddieAndAddToRepository({
            templateId: "ally_at_the_edge",
            battleId: "ally_at_the_edge_dynamic_0",
            name: "ally_at_the_edge_enemy",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository
        });
        CreateNewSquaddieAndAddToRepository({
            templateId: "ally_far_away",
            battleId: "ally_far_away_dynamic_0",
            name: "ally_far_away_enemy",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository
        });


        const searchResults: SearchResults =
            Pathfinder.findReachableSquaddies(
                SearchParametersHelper.newUsingSearchSetupMovementStop(
                    {
                        setup: {
                            startLocation: {q: 0, r: 0},
                            affiliation: SquaddieAffiliation.PLAYER,
                        },
                        movement: {
                            movementPerAction: 2,
                            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                            maximumDistanceMoved: undefined,
                            minimumDistanceMoved: undefined,
                            canStopOnSquaddies: false,
                            ignoreTerrainPenalty: false,
                            crossOverPits: false,
                            passThroughWalls: false,
                        },
                        stopCondition: {
                            stopLocation: undefined,
                            numberOfActions: 2,
                        }
                    }
                ),
                missionMap,
                squaddieRepository,
            );

        const reachableSquaddies = searchResults.getReachableSquaddies();

        const enemyNearby = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("enemy_nearby");
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual({
            q: 0,
            r: 1
        });
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual({
            q: 1,
            r: 1
        });
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual({
            q: 1,
            r: 2
        });
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual({
            q: 0,
            r: 2
        });
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual({
            q: 0,
            r: 3
        });

        const allyFlankingNearby = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("ally_flanking");
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(0)).toContainEqual({
            q: 0,
            r: 3
        });
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual({
            q: 1,
            r: 2
        });
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual({
            q: 1,
            r: 3
        });
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual({
            q: 0,
            r: 2
        });
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual({
            q: 0,
            r: 4
        });

        const allyAtTheEdge = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("ally_at_the_edge");
        expect(allyAtTheEdge.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual({
            q: 1,
            r: 3
        });
        expect(allyAtTheEdge.closestCoordinatesByDistance.getCoordinatesByDistance(0)).toStrictEqual([]); // Out of movement, cannot reach ally's location

        const allyFarAway = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("ally_far_away");
        expect(allyFarAway).toBeUndefined();

        const closestSquaddies = reachableSquaddies.getClosestSquaddies();
        expect(closestSquaddies).toStrictEqual({
            "enemy_nearby": {q: 0, r: 2},
            "ally_flanking": {q: 0, r: 3},
            "ally_at_the_edge": {q: 0, r: 4},
        });
    });
});
