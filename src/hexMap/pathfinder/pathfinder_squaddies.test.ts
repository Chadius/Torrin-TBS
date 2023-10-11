import {SquaddieId} from "../../squaddie/id";
import {SquaddieResource} from "../../squaddie/resource";
import {Pathfinder} from "./pathfinder";
import {SearchMovement, SearchParams, SearchParamsOptions, SearchSetup, SearchStopCondition} from "./searchParams";
import {TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";
import {getResultOrThrowError, ResultOrError} from "../../utils/ResultOrError";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {createMapAndPathfinder, validateTilesAreFound} from "./pathfinder_test_utils";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {HexCoordinate} from "../hexCoordinate/hexCoordinate";
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
        let pathfinder: Pathfinder;
        let baseSearchParamOptions: SearchParamsOptions;

        beforeEach(() => {
            const {
                missionMap: tempMissionMap,
                pathfinder: tempPathfinder,
            } = createMapAndPathfinder([
                "1 1 1 1 1 ",
            ]);

            missionMap = tempMissionMap;
            pathfinder = tempPathfinder;
        });

        const validateCanPassThroughFriendly = (searchResults: SearchResults) => {
            validateTilesAreFound(
                searchResults.getReachableTiles(),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                    new HexCoordinate({q: 0, r: 2,}),
                    new HexCoordinate({q: 0, r: 3,}),
                ],
                [
                    new HexCoordinate({q: 0, r: 1,}),
                ]
            );
        }

        const validateCannotPassThroughUnfriendly = (searchResults: SearchResults) => {
            validateTilesAreFound(
                searchResults.getReachableTiles(),
                [
                    new HexCoordinate({q: 0, r: 0,}),
                ],
                [
                    new HexCoordinate({q: 0, r: 1,}),
                    new HexCoordinate({q: 0, r: 2,}),
                    new HexCoordinate({q: 0, r: 3,}),
                ]
            );
        }

        const validateAffiliatePassingStatus = (
            pathfindingAffiliation: SquaddieAffiliation,
            blockingAffiliation: SquaddieAffiliation,
            canPassThrough: boolean
        ) => {
            const blockingSquaddie = new SquaddieId({
                name: "blocker",
                templateId: "blocker",
                resources: new SquaddieResource({mapIconResourceKey: "map_icon_blocker"}),
                traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT),
                affiliation: blockingAffiliation,
            });
            missionMap.addSquaddie(blockingSquaddie.templateId, "dynamic_0", new HexCoordinate({q: 0, r: 1}));
            let squaddieRepository = new BattleSquaddieRepository();
            CreateNewSquaddieAndAddToRepository({
                templateId: "blocker",
                battleId: "dynamic_0",
                name: "blocker",
                affiliation: blockingAffiliation,
                squaddieRepository
            });

            const searchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
                setup: new SearchSetup({
                    missionMap: missionMap,
                    startLocation: new HexCoordinate({q: 0, r: 0}),
                    affiliation: pathfindingAffiliation,
                    squaddieRepository,
                }),
                movement: new SearchMovement({
                    movementPerAction: 3,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActionPoints: 1,
                })
            })));
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
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 1 1 1 ",
        ]);

        missionMap.addSquaddie("player", "player_dynamic_0", new HexCoordinate({q: 0, r: 0}));
        missionMap.addSquaddie("enemy", "enemy_dynamic_0", new HexCoordinate({q: 0, r: 1}));
        missionMap.addSquaddie("ally", "ally_dynamic_0", new HexCoordinate({q: 0, r: 2}));
        missionMap.addSquaddie("none", "none_dynamic_0", new HexCoordinate({q: 0, r: 3}));

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


        const allTilesOnMap: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(new SearchParams({
            setup: new SearchSetup({
                missionMap: missionMap,
                startLocation: new HexCoordinate({q: 0, r: 0}),
                squaddieRepository,
            }),
            movement: new SearchMovement({
                movementPerAction: 10,
                canStopOnSquaddies: true,
                minimumDistanceMoved: 0,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActionPoints: 1,
            })
        })));

        validateTilesAreFound(
            allTilesOnMap.getReachableTiles(),
            [
                new HexCoordinate({q: 0, r: 0,}),
                new HexCoordinate({q: 0, r: 1,}),
                new HexCoordinate({q: 0, r: 2,}),
                new HexCoordinate({q: 0, r: 3,}),
                new HexCoordinate({q: 0, r: 4,}),
                new HexCoordinate({q: 0, r: 5,}),
            ],
            []
        );
    });

    it('will move around unfriendly squaddies', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 1 1 ",
            " 1 1 1 1 1 ",
        ]);

        missionMap.addSquaddie("enemy", "dynamic_0", new HexCoordinate({q: 0, r: 1}));

        let squaddieRepository = new BattleSquaddieRepository();

        CreateNewSquaddieAndAddToRepository({
            templateId: "enemy",
            battleId: "dynamic_0",
            name: "enemy",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository
        });

        const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
            setup: new SearchSetup({
                missionMap: missionMap,
                startLocation: new HexCoordinate({q: 0, r: 0}),
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository,
            }),
            movement: new SearchMovement({
                movementPerAction: 10,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActionPoints: 1,
                stopLocation: new HexCoordinate({q: 0, r: 2}),
            })
        }));

        let routeFound: SearchPath;
        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);
        const tilesTraveled: TileFoundDescription[] = routeFound.getTilesTraveled()
        expect(tilesTraveled).toHaveLength(4);
        expect(tilesTraveled[0]).toEqual(expect.objectContaining({
            q: 0,
            r: 0,
            movementCost: 0,
        }));
        expect(tilesTraveled[1]).toEqual(expect.objectContaining({
            q: 1,
            r: 0,
            movementCost: 1,
        }));
        expect(tilesTraveled[2]).toEqual(expect.objectContaining({
            q: 1,
            r: 1,
            movementCost: 2,
        }));
        expect(tilesTraveled[3]).toEqual(expect.objectContaining({
            q: 0,
            r: 2,
            movementCost: 3,
        }));
    });

    it('will move through dead squaddies', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 1 1 ",
            " 1 1 1 1 1 ",
        ]);

        missionMap.addSquaddie("enemy", "dynamic_0", new HexCoordinate({q: 0, r: 1}));

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

        const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
            setup: new SearchSetup({
                missionMap: missionMap,
                startLocation: new HexCoordinate({q: 0, r: 0}),
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository,
            }),
            movement: new SearchMovement({
                movementPerAction: 10,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                stopLocation: new HexCoordinate({q: 0, r: 2}),
            })
        }));

        let routeFound: SearchPath;
        let routeOrError = getResultOrThrowError(searchResults).getRouteToStopLocation();
        routeFound = getResultOrThrowError(routeOrError);
        const tilesTraveled: TileFoundDescription[] = routeFound.getTilesTraveled()
        expect(tilesTraveled).toHaveLength(3);
        expect(tilesTraveled[0]).toEqual(expect.objectContaining({
            q: 0,
            r: 0,
            movementCost: 0,
        }));
        expect(tilesTraveled[1]).toEqual(expect.objectContaining({
            q: 0,
            r: 1,
            movementCost: 1,
        }));
        expect(tilesTraveled[2]).toEqual(expect.objectContaining({
            q: 0,
            r: 2,
            movementCost: 2,
        }));
    });

    it('knows which squaddies it was adjacent to', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 1 1 1 1 1 1 1 ",
            " 1 1 1 1 1 ",
        ]);

        missionMap.addSquaddie("enemy_nearby", "enemy_nearby_dynamic_0", new HexCoordinate({q: 0, r: 2}));
        missionMap.addSquaddie("ally_flanking", "ally_flanking_dynamic_0", new HexCoordinate({q: 0, r: 3}));
        missionMap.addSquaddie("ally_at_the_edge", "ally_at_the_edge_dynamic_0", new HexCoordinate({q: 0, r: 4}));
        missionMap.addSquaddie("ally_far_away", "ally_far_away_dynamic_0", new HexCoordinate({q: 0, r: 8}));

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
            pathfinder.findReachableSquaddies(new SearchParams({
                setup: new SearchSetup({
                    missionMap: missionMap,
                    startLocation: new HexCoordinate({q: 0, r: 0}),
                    affiliation: SquaddieAffiliation.PLAYER,
                    squaddieRepository,
                }),
                movement: new SearchMovement({
                    movementPerAction: 2,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActionPoints: 2,
                })
            }));

        const reachableSquaddies = searchResults.getReachableSquaddies();

        const enemyNearby = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("enemy_nearby");
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual(new HexCoordinate({
            q: 0,
            r: 1
        }));
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual(new HexCoordinate({
            q: 1,
            r: 1
        }));
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual(new HexCoordinate({
            q: 1,
            r: 2
        }));
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual(new HexCoordinate({
            q: 0,
            r: 2
        })); // Cannot pass through enemy
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual(new HexCoordinate({
            q: 0,
            r: 3
        })); // Cannot stop on ally

        const allyFlankingNearby = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("ally_flanking");
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(0)).toContainEqual(new HexCoordinate({
            q: 0,
            r: 3
        })); // 0 distance can pass through ally
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual(new HexCoordinate({
            q: 1,
            r: 2
        }));
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual(new HexCoordinate({
            q: 1,
            r: 3
        }));
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual(new HexCoordinate({
            q: 0,
            r: 2
        })); // Cannot stop on enemy
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual(new HexCoordinate({
            q: 0,
            r: 4
        })); // Out of movement

        const allyAtTheEdge = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("ally_at_the_edge");
        expect(allyAtTheEdge.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual(new HexCoordinate({
            q: 1,
            r: 3
        }));
        expect(allyAtTheEdge.closestCoordinatesByDistance.getCoordinatesByDistance(0)).toStrictEqual([]); // Out of movement, cannot reach ally's location

        const allyFarAway = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("ally_far_away");
        expect(allyFarAway).toBeUndefined();

        const closestSquaddies = reachableSquaddies.getClosestSquaddies();
        expect(closestSquaddies).toStrictEqual({
            "enemy_nearby": new HexCoordinate({q: 0, r: 2}),
            "ally_flanking": new HexCoordinate({q: 0, r: 3}),
            "ally_at_the_edge": new HexCoordinate({q: 0, r: 4}),
        });
    });
});
