import {NewDummySquaddieID, SquaddieId} from "../../squaddie/id";
import {NullSquaddieResource, SquaddieResource} from "../../squaddie/resource";
import {Pathfinder} from "./pathfinder";
import {SquaddieMovement} from "../../squaddie/movement";
import {SearchParams, SearchParamsOptions} from "./searchParams";
import {NullTraitStatusStorage, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";
import {getResultOrThrowError, ResultOrError} from "../../utils/ResultOrError";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {createMapAndPathfinder, createSquaddieMovements, validateTilesAreFound} from "./pathfinder_test_utils";

describe('pathfinder and squaddies', () => {
    let squaddieMovementOneMovementPerAction: SquaddieMovement;
    let squaddieMovementTwoMovementPerAction: SquaddieMovement;
    let squaddieMovementThreeMovementPerAction: SquaddieMovement;
    let squaddieMovementHighMovementPerAction: SquaddieMovement;

    beforeEach(() => {
        ({
            squaddieMovementOneMovementPerAction,
            squaddieMovementTwoMovementPerAction,
            squaddieMovementThreeMovementPerAction,
            squaddieMovementHighMovementPerAction
        } = createSquaddieMovements());
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

            baseSearchParamOptions = {
                missionMap: missionMap,
                squaddieMovement: squaddieMovementThreeMovementPerAction,
                numberOfActions: 1,
                startLocation: {q: 0, r: 0}
            };
        });

        const validateCanPassThroughFriendly = (searchResults: SearchResults) => {
            validateTilesAreFound(
                searchResults.allReachableTiles,
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
                searchResults.allReachableTiles,
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
            const blockingSquaddie = new SquaddieId({
                name: "blocker",
                staticId: "blocker",
                resources: new SquaddieResource({mapIconResourceKey: "map_icon_blocker"}),
                traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT),
                affiliation: blockingAffiliation,
            });
            missionMap.addStaticSquaddieByLocation(blockingSquaddie, {q: 0, r: 1});

            const searchResults: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
                ...baseSearchParamOptions,
                squaddieAffiliation: pathfindingAffiliation,
            }));
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

        missionMap.addStaticSquaddieByLocation(
            NewDummySquaddieID("player", SquaddieAffiliation.PLAYER),
            {q: 0, r: 0}
        );
        missionMap.addStaticSquaddieByLocation(
            NewDummySquaddieID("enemy", SquaddieAffiliation.ENEMY),
            {q: 0, r: 1}
        );
        missionMap.addStaticSquaddieByLocation(
            NewDummySquaddieID("ally", SquaddieAffiliation.ALLY),
            {q: 0, r: 2}
        );
        missionMap.addStaticSquaddieByLocation(
            NewDummySquaddieID("none", SquaddieAffiliation.NONE),
            {q: 0, r: 3}
        );

        const allTilesOnMap: SearchResults = pathfinder.getAllReachableTiles(new SearchParams({
            canStopOnSquaddies: true,
            minimumDistanceMoved: 0,
            missionMap,
            numberOfActions: 1,
            squaddieMovement: new SquaddieMovement({
                movementPerAction: 10,
                traits: NullTraitStatusStorage(),
            }),
            startLocation: {q: 0, r: 0},
            stopLocation: undefined
        }))

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
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 1 1 ",
            " 1 1 1 1 1 ",
        ]);

        missionMap.addStaticSquaddieByLocation(
            new SquaddieId({
                name: "enemy",
                staticId: "enemy",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.ENEMY
            }),
            {q: 0, r: 1}
        )

        const searchResults: ResultOrError<SearchResults, Error> = pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: missionMap,
            squaddieMovement: squaddieMovementHighMovementPerAction,
            startLocation: {q: 0, r: 0},
            stopLocation: {q: 0, r: 2},
            squaddieAffiliation: SquaddieAffiliation.PLAYER,
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

    it('knows which squaddies it was adjacent to', () => {
        const {
            missionMap,
            pathfinder,
        } = createMapAndPathfinder([
            "1 1 1 1 1 1 1 1 1 1 ",
            " 1 1 1 1 1 ",
        ]);

        missionMap.addStaticSquaddieByLocation(
            NewDummySquaddieID("enemy_nearby", SquaddieAffiliation.ENEMY),
            {q: 0, r: 2}
        );

        missionMap.addStaticSquaddieByLocation(
            NewDummySquaddieID("ally_flanking", SquaddieAffiliation.ALLY),
            {q: 0, r: 3}
        );

        missionMap.addStaticSquaddieByLocation(
            NewDummySquaddieID("ally_at_the_edge", SquaddieAffiliation.ALLY),
            {q: 0, r: 4}
        );

        missionMap.addStaticSquaddieByLocation(
            NewDummySquaddieID("ally_far_away", SquaddieAffiliation.ALLY),
            {q: 0, r: 8}
        );

        const searchResults: SearchResults =
            pathfinder.findReachableSquaddies(new SearchParams({
                missionMap: missionMap,
                squaddieMovement: squaddieMovementTwoMovementPerAction,
                numberOfActions: 2,
                startLocation: {q: 0, r: 0},
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
            }));

        const reachableSquaddies = searchResults.getReachableSquaddies();

        const enemyNearby = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("enemy_nearby");
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual({q: 0, r: 1});
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual({q: 1, r: 1});
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual({q: 1, r: 2});
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual({q: 0, r: 2}); // Cannot pass through enemy
        expect(enemyNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual({q: 0, r: 3}); // Cannot stop on ally

        const allyFlankingNearby = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("ally_flanking");
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(0)).toContainEqual({
            q: 0,
            r: 3
        }); // 0 distance can pass through ally
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
        }); // Cannot stop on enemy
        expect(allyFlankingNearby.closestCoordinatesByDistance.getCoordinatesByDistance(1)).not.toContainEqual({
            q: 0,
            r: 4
        }); // Out of movement

        const allyAtTheEdge = reachableSquaddies.getCoordinatesCloseToSquaddieByDistance("ally_at_the_edge");
        expect(allyAtTheEdge.closestCoordinatesByDistance.getCoordinatesByDistance(1)).toContainEqual({q: 1, r: 3});
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
