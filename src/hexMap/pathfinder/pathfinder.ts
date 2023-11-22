import {HexGridMovementCost, MovingCostByTerrainType} from "../hexGridMovementCost";
import {SearchParameters, SearchParametersHelper} from "./searchParams";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";
import {getResultOrThrowError, makeError, makeResult, ResultOrError} from "../../utils/ResultOrError";
import {FriendlyAffiliationsByAffiliation, SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {HexCoordinate, HexCoordinateToKey} from "../hexCoordinate/hexCoordinate";
import {TargetingShapeGenerator} from "../../battle/targeting/targetingShapeGenerator";

import {GetSquaddieAtMapLocation} from "../../battle/orchestratorComponents/orchestratorUtils";
import {IsSquaddieAlive} from "../../squaddie/squaddieService";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {SearchState, SearchStateHelper} from "./searchState";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";


export const Pathfinder = {
    findPathToStopLocation(
        searchParams: SearchParameters,
        missionMap: MissionMap,
        squaddieRepository: BattleSquaddieRepository,
    ): ResultOrError<SearchResults, Error> {
        if (searchParams.stopLocation === undefined) {
            return makeError(new Error("no stop location was given"));
        }
        return makeResult(searchMapForPaths(
            searchParams,
            missionMap,
            squaddieRepository,
        ));
    },
    getAllReachableTiles(searchParams: SearchParameters, missionMap: MissionMap,
                         squaddieRepository: BattleSquaddieRepository): ResultOrError<SearchResults, Error> {
        return getAllReachableTiles(searchParams, missionMap,
            squaddieRepository,);
    },
    getTilesInRange(searchParams: SearchParameters, maximumDistance: number, sourceTiles: HexCoordinate[],
                    missionMap: MissionMap,
                    squaddieRepository: BattleSquaddieRepository,): HexCoordinate[] {
        const inRangeTilesByLocation: { [locationKey: string]: HexCoordinate } = {};
        if (
            sourceTiles.length < 1
            || searchParams.startLocation === undefined
        ) {
            return [];
        }

        if (maximumDistance < 1) {
            return [...sourceTiles];
        }

        sourceTiles.forEach((sourceTile) => {
            const searchParamsWithNewStartLocation = SearchParametersHelper.newUsingSearchSetupMovementStop({
                setup: {
                    startLocation: sourceTile,
                    affiliation: searchParams.squaddieAffiliation,
                },
                movement: {
                    movementPerAction: maximumDistance,
                    crossOverPits: true,
                    minimumDistanceMoved: searchParams.minimumDistanceMoved,
                    canStopOnSquaddies: searchParams.canStopOnSquaddies,
                    ignoreTerrainPenalty: searchParams.ignoreTerrainPenalty,
                    maximumDistanceMoved: searchParams.maximumDistanceMoved,
                    passThroughWalls: searchParams.passThroughWalls,
                    shapeGenerator: searchParams.shapeGenerator,
                },
                stopCondition: {
                    numberOfActions: 1,
                    stopLocation: searchParams.stopLocation,
                }
            });

            const reachableTiles: SearchResults = getResultOrThrowError(getAllReachableTiles(searchParamsWithNewStartLocation, missionMap,
                squaddieRepository,));
            reachableTiles.getReachableTiles().forEach((reachableTile) => {
                inRangeTilesByLocation[HexCoordinateToKey(reachableTile)] = reachableTile;
            });
        });

        return Object.values(inRangeTilesByLocation);
    },
    findReachableSquaddies(searchParams: SearchParameters, missionMap: MissionMap,
                           squaddieRepository: BattleSquaddieRepository): SearchResults {
        return getResultOrThrowError(getAllReachableTiles(searchParams, missionMap, squaddieRepository));
    },
}

const getAllReachableTiles = (searchParams: SearchParameters, missionMap: MissionMap,
                              squaddieRepository: BattleSquaddieRepository): ResultOrError<SearchResults, Error> => {
    if (!searchParams.startLocation) {
        return makeError(new Error("no starting location provided"));
    }

    return makeResult(searchMapForPaths(
        searchParams,
        missionMap,
        squaddieRepository,
    ));
};

const searchMapForPaths = (
    searchParams: SearchParameters,
    missionMap: MissionMap,
    squaddieRepository: BattleSquaddieRepository,
): SearchResults => {
    const workingSearchState: SearchState = SearchStateHelper.newFromSearchParameters(searchParams);

    SearchStateHelper.initializeStartPath(
        workingSearchState,
        {
            q: searchParams.startLocation.q,
            r: searchParams.startLocation.r,
        }
    );

    let numberOfMovementActions: number = 1;
    let morePathsAdded: boolean = true;

    while (
        hasRemainingMovementActions(searchParams, numberOfMovementActions)
        && !hasFoundStopLocation(searchParams, workingSearchState)
        && morePathsAdded
        ) {
        const {
            newAddedSearchPaths,
            movementEndsOnTheseTiles
        } = addLegalSearchPaths(
            searchParams,
            workingSearchState,
            missionMap,
            squaddieRepository,
        );

        morePathsAdded = newAddedSearchPaths.length > 0;
        const continueToNextMovementAction: boolean = movementEndsOnTheseTiles.length > 0
            && !hasFoundStopLocation(searchParams, workingSearchState);

        if (continueToNextMovementAction) {
            numberOfMovementActions++;
            movementEndsOnTheseTiles.forEach(tile =>
                SearchStateHelper.extendPathWithNewMovementAction(workingSearchState, tile.hexCoordinate))
        }
    }
    SearchStateHelper.setAllReachableTiles(workingSearchState);
    SearchStateHelper.recordReachableSquaddies(workingSearchState, squaddieRepository, missionMap);
    return workingSearchState.results;
};
const hasRemainingMovementActions = (searchParams: SearchParameters, numberOfMovementActions: number) => {
    return searchParams.numberOfActions === undefined
        || numberOfMovementActions <= searchParams.numberOfActions;
}
const addLegalSearchPaths = (
    searchParams: SearchParameters,
    workingSearchState: SearchState,
    missionMap: MissionMap,
    squaddieRepository: BattleSquaddieRepository,
): {
    newAddedSearchPaths: SearchPath[],
    movementEndsOnTheseTiles: TileFoundDescription[]
} => {
    const newAddedSearchPaths: SearchPath[] = [];
    const movementEndsOnTheseTiles: TileFoundDescription[] = [];

    let arrivedAtTheStopLocation: boolean = false;

    while (
        SearchStateHelper.hasMorePathsToSearch(workingSearchState)
        && !arrivedAtTheStopLocation
        ) {
        let head: SearchPath = SearchStateHelper.nextSearchPath(workingSearchState);

        const hexCostTerrainType: HexGridMovementCost = missionMap.getHexGridMovementAtLocation(head.getMostRecentTileLocation().hexCoordinate);

        let squaddieIsOccupyingTile: boolean = false;
        const squaddieAtTileDatum = missionMap.getSquaddieAtLocation(head.getMostRecentTileLocation().hexCoordinate);
        if (MissionMapSquaddieLocationHandler.isValid(squaddieAtTileDatum)) {
            const {
                squaddieTemplate: occupyingSquaddieTemplate,
                battleSquaddie: occupyingBattleSquaddie,
            } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(squaddieAtTileDatum.battleSquaddieId));
            if (IsSquaddieAlive({
                squaddieTemplate: occupyingSquaddieTemplate,
                battleSquaddie: occupyingBattleSquaddie,
            })) {
                squaddieIsOccupyingTile = true;
            }
        }

        markLocationAsStoppable(head, searchParams, workingSearchState, hexCostTerrainType, squaddieIsOccupyingTile);
        let mostRecentTileLocation = head.getMostRecentTileLocation();
        SearchStateHelper.markLocationAsVisited(workingSearchState, mostRecentTileLocation);

        if (
            searchParams.stopLocation !== undefined
            && head.getMostRecentTileLocation().hexCoordinate.q === searchParams.stopLocation.q
            && head.getMostRecentTileLocation().hexCoordinate.r === searchParams.stopLocation.r
        ) {
            arrivedAtTheStopLocation = true;
            continue;
        }

        if (isPathMoreThanMaximumDistance(head, searchParams)) {
            movementEndsOnTheseTiles.push({
                hexCoordinate: {
                    q: mostRecentTileLocation.hexCoordinate.q,
                    r: mostRecentTileLocation.hexCoordinate.r,
                },
                movementCost: mostRecentTileLocation.movementCost,
            });
            continue;
        }

        let neighboringLocations = createNewPathCandidates(mostRecentTileLocation.hexCoordinate.q, mostRecentTileLocation.hexCoordinate.r, workingSearchState.shapeGenerator);
        neighboringLocations = selectValidPathCandidates(
            neighboringLocations,
            searchParams,
            head,
            missionMap,
            workingSearchState,
            squaddieRepository,
        );
        if (neighboringLocations.length === 0 && canStopOnThisTile(head, searchParams, hexCostTerrainType, squaddieIsOccupyingTile)) {
            movementEndsOnTheseTiles.push({
                hexCoordinate: {
                    q: mostRecentTileLocation.hexCoordinate.q,
                    r: mostRecentTileLocation.hexCoordinate.r,
                },
                movementCost: mostRecentTileLocation.movementCost,
            })
        }
        newAddedSearchPaths.push(...createNewPathsUsingNeighbors(
                neighboringLocations,
                head,
                missionMap,
                workingSearchState,
                searchParams,
            )
        );
    }

    return {
        newAddedSearchPaths,
        movementEndsOnTheseTiles,
    }
}
const markLocationAsStoppable = (
    searchPath: SearchPath,
    searchParams: SearchParameters,
    workingSearchState: SearchState,
    hexCostTerrainType: HexGridMovementCost,
    squaddieIsOccupyingTile: boolean
) => {
    if (
        canStopOnThisTile(searchPath, searchParams, hexCostTerrainType, squaddieIsOccupyingTile)
        && !SearchStateHelper.hasAlreadyStoppedOnTile(workingSearchState, searchPath.getMostRecentTileLocation().hexCoordinate)
    ) {
        SearchStateHelper.markLocationAsStopped(workingSearchState, searchPath.getMostRecentTileLocation())
        SearchStateHelper.setLowestCostRoute(workingSearchState, searchPath);
    }
}
const canStopOnThisTile = (head: SearchPath, searchParams: SearchParameters, hexCostTerrainType: HexGridMovementCost, squaddieIsOccupyingTile: boolean) => {
    return squaddieCanStopMovingOnTile(searchParams, hexCostTerrainType, squaddieIsOccupyingTile)
        && isPathAtLeastMinimumDistance(head, searchParams);
}
const selectValidPathCandidates = (
    neighboringLocations: [number, number][],
    searchParams: SearchParameters,
    head: SearchPath,
    missionMap: MissionMap,
    workingSearchState: SearchState,
    squaddieRepository: BattleSquaddieRepository,
): [number, number][] => {
    neighboringLocations = filterNeighborsNotEnqueued(neighboringLocations, workingSearchState);
    neighboringLocations = filterNeighborsNotVisited(neighboringLocations, workingSearchState);
    neighboringLocations = filterNeighborsOnMap(missionMap, neighboringLocations);
    neighboringLocations = filterNeighborsCheckingAffiliation(neighboringLocations, searchParams, missionMap, squaddieRepository);
    return filterNeighborsWithinMovementPerAction(neighboringLocations, searchParams, head, missionMap);
}
const createNewPathsUsingNeighbors = (
    neighboringLocations: [number, number][],
    head: SearchPath,
    missionMap: MissionMap,
    workingSearchState: SearchState,
    searchParams: SearchParameters,
): SearchPath[] => {
    const newPaths: SearchPath[] = [];
    neighboringLocations.forEach((neighbor) =>
        SearchStateHelper.markLocationAsConsideredForQueue(
            workingSearchState,
            {
                q: neighbor[0],
                r: neighbor[1],
            }
        ));
    neighboringLocations.forEach((neighbor) => {
        const newPath: SearchPath = addNeighborNewPath(
            neighbor,
            head,
            missionMap,
            workingSearchState,
            searchParams,
        );
        newPaths.push(newPath);
    });
    return newPaths;
}

const squaddieCanStopMovingOnTile = (searchParams: SearchParameters, hexCostTerrainType: HexGridMovementCost, squaddieIsOccupyingTile: boolean) => {
    const squaddieIsBlocking: boolean = !searchParams.canStopOnSquaddies && squaddieIsOccupyingTile;
    return !(
        [HexGridMovementCost.wall, HexGridMovementCost.pit].includes(
            hexCostTerrainType
        )
        || squaddieIsBlocking
    )
}
const createNewPathCandidates = (q: number, r: number, shapeGenerator: TargetingShapeGenerator): [number, number][] => {
    const neighbors: HexCoordinate[] = shapeGenerator.createNeighboringHexCoordinates({q, r});
    return neighbors.map((coordinate: HexCoordinate) => {
        return [coordinate.q, coordinate.r]
    });
}
const filterNeighborsNotVisited = (
    neighboringLocations: [number, number][],
    workingSearchState: SearchState,
): [number, number][] => {
    return neighboringLocations.filter((neighbor) => {
        return !SearchStateHelper.hasAlreadyMarkedLocationAsVisited(workingSearchState, {
            q: neighbor[0],
            r: neighbor[1],
        });
    });
}
const filterNeighborsNotEnqueued = (
    neighboringLocations: [number, number][],
    workingSearchState: SearchState,
): [number, number][] => {
    return neighboringLocations.filter((neighbor) => {
        return !SearchStateHelper.hasAlreadyMarkedLocationAsEnqueued(workingSearchState, {
            q: neighbor[0],
            r: neighbor[1],
        });
    });
}
const filterNeighborsOnMap = (missionMap: MissionMap, neighboringLocations: [number, number][]): [number, number][] => {
    return neighboringLocations.filter((neighbor) => {
        return missionMap.areCoordinatesOnMap({q: neighbor[0], r: neighbor[1]})
    });
}
const filterNeighborsWithinMovementPerAction = (
    neighboringLocations: [number, number][],
    searchParams: SearchParameters,
    head: SearchPath,
    missionMap: MissionMap,
): [number, number][] => {
    return neighboringLocations.filter((neighbor) => {
        const hexCostTerrainType: HexGridMovementCost = missionMap.getHexGridMovementAtLocation({
            q: neighbor[0],
            r: neighbor[1]
        });

        if (!searchParams.passThroughWalls && hexCostTerrainType === HexGridMovementCost.wall) {
            return false;
        }

        if (!searchParams.crossOverPits && hexCostTerrainType === HexGridMovementCost.pit) {
            return false;
        }

        if (searchParams.movementPerAction === undefined) {
            return true;
        }

        let movementCost = searchParams.ignoreTerrainPenalty
            ? 1
            : MovingCostByTerrainType[hexCostTerrainType];
        return head.getMovementCostSinceStartOfAction() + movementCost <= searchParams.movementPerAction;
    });
}
const filterNeighborsCheckingAffiliation = (
    neighboringLocations: [number, number][],
    searchParams: SearchParameters,
    missionMap: MissionMap,
    squaddieRepository: BattleSquaddieRepository,
): [number, number][] => {
    if (searchParams.squaddieAffiliation === SquaddieAffiliation.UNKNOWN
    ) {
        return neighboringLocations;
    }

    const searcherAffiliation: SquaddieAffiliation = searchParams.squaddieAffiliation;
    const friendlyAffiliations: { [friendlyAffiliation in SquaddieAffiliation]?: boolean } = FriendlyAffiliationsByAffiliation[searcherAffiliation];
    return neighboringLocations.filter((neighbor) => {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = GetSquaddieAtMapLocation({
            mapLocation: {q: neighbor[0], r: neighbor[1]},
            map: missionMap,
            squaddieRepository: squaddieRepository,
        });

        if (!squaddieTemplate) {
            return true;
        }

        if (!IsSquaddieAlive({squaddieTemplate, battleSquaddie})) {
            return true;
        }

        return friendlyAffiliations[squaddieTemplate.squaddieId.affiliation];
    });
}
const addNeighborNewPath = (
    neighbor: [number, number],
    head: SearchPath,
    missionMap: MissionMap,
    workingSearchState: SearchState,
    searchParams: SearchParameters,
): SearchPath => {
    const hexCostTerrainType: HexGridMovementCost = missionMap.getHexGridMovementAtLocation({
        q: neighbor[0],
        r: neighbor[1]
    });

    let movementCost = MovingCostByTerrainType[hexCostTerrainType];

    return SearchStateHelper.addNeighborSearchPathToQueue(
        workingSearchState,
        {
            hexCoordinate: {
                q: neighbor[0],
                r: neighbor[1],
            },
            movementCost: movementCost
        },
        head,
        searchParams,
    );
}

const isPathAtLeastMinimumDistance = (head: SearchPath, searchParams: SearchParameters): boolean => {
    if (searchParams.minimumDistanceMoved === undefined || searchParams.minimumDistanceMoved <= 0) {
        return true;
    }

    return head.getTotalDistance() >= searchParams.minimumDistanceMoved;
}

const isPathMoreThanMaximumDistance = (head: SearchPath, searchParams: SearchParameters): boolean => {
    if (searchParams.maximumDistanceMoved === undefined) {
        return false;
    }
    return head.getTotalDistance() >= searchParams.maximumDistanceMoved;
}

const hasFoundStopLocation = (searchParams: SearchParameters, workingSearchState: SearchState): boolean => {
    if (searchParams.stopLocation === undefined) {
        return false;
    }
    return SearchStateHelper.hasFoundStopLocation(workingSearchState);
}
