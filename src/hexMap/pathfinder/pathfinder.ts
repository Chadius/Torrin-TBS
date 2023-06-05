import {HexCoordinate, HexCoordinateToKey} from "../hexGrid";
import {PriorityQueue} from "../../utils/priorityQueue";
import {HexGridMovementCost, MovingCostByTerrainType} from "../hexGridMovementCost";
import {CreateNewPathCandidates} from "../hexGridDirection";
import {SearchParams} from "./searchParams";
import {SquaddieMovement} from "../../squaddie/movement";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap, MissionMapSquaddieDatum} from "../../missionMap/missionMap";
import {
    getResultOrThrowError,
    isError,
    makeError,
    makeResult,
    ResultOrError,
    unwrapResultOrError
} from "../../utils/ResultOrError";
import {FriendlyAffiliationsByAffiliation, SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";

class SearchState {
    tilesSearchCanStopAt: TileFoundDescription[];
    tileLocationsAlreadyVisited: { [loc: string]: boolean };
    tileLocationsAlreadyConsideredForQueue: { [loc: string]: boolean };
    searchPathQueue: PriorityQueue;
    results: SearchResults;

    constructor(searchParams: SearchParams) {
        this.tilesSearchCanStopAt = [];
        this.tileLocationsAlreadyVisited = {};
        this.tileLocationsAlreadyConsideredForQueue = {};
        this.searchPathQueue = new PriorityQueue();
        this.results = new SearchResults({
            stopLocation: searchParams.getStopLocation()
        });
    }

    getTilesSearchCanStopAt(): TileFoundDescription[] {
        return this.tilesSearchCanStopAt;
    }

    hasAlreadyStoppedOnTile(tileLocation: HexCoordinate): boolean {
        return !!this.tilesSearchCanStopAt.find(
            (tile) => tile.q === tileLocation.q && tile.r === tileLocation.r)
    }

    markLocationAsStopped(tileLocation: TileFoundDescription) {
        this.tilesSearchCanStopAt.push({
            q: tileLocation.q,
            r: tileLocation.r,
            movementCost: tileLocation.movementCost,
        });
    }

    markLocationAsVisited(mostRecentTileLocation: TileFoundDescription) {
        let mostRecentTileLocationKey: string = HexCoordinateToKey(mostRecentTileLocation);
        this.tileLocationsAlreadyVisited[mostRecentTileLocationKey] = true;
    }

    hasAlreadyMarkedLocationAsVisited(location: HexCoordinate): boolean {
        let locationKey: string = HexCoordinateToKey(location);
        return this.tileLocationsAlreadyVisited[locationKey] === true;
    }

    hasAlreadyMarkedLocationAsEnqueued(location: HexCoordinate): boolean {
        let locationKey: string = HexCoordinateToKey(location);
        return this.tileLocationsAlreadyConsideredForQueue[locationKey] === true;
    }

    markLocationAsConsideredForQueue(mostRecentTileLocation: TileFoundDescription) {
        let mostRecentTileLocationKey: string = HexCoordinateToKey(mostRecentTileLocation);
        this.tileLocationsAlreadyConsideredForQueue[mostRecentTileLocationKey] = true;
    }

    initializeStartPath(startLocation: HexCoordinate) {
        const startingPath = new SearchPath();
        startingPath.add({
            q: startLocation.q,
            r: startLocation.r,
            movementCost: 0,
        }, 0)
        startingPath.startNewMovementAction();
        this.searchPathQueue.enqueue(startingPath);
    }

    extendPathWithNewMovementAction(tile: HexCoordinate) {
        const existingRoute = this.results.getLowestCostRoute(tile.q, tile.r);
        const extendedPath = new SearchPath(existingRoute);
        extendedPath.startNewMovementAction();
        this.searchPathQueue.enqueue(extendedPath);
    }

    hasMorePathsToSearch(): boolean {
        return !this.searchPathQueue.isEmpty();
    }

    nextSearchPath(): SearchPath {
        let nextPath: SearchPath = this.searchPathQueue.dequeue() as SearchPath;
        if (nextPath === undefined) {
            throw new Error(`Search Path Queue is empty, cannot find another`)
        }
        return nextPath;
    }

    addNeighborSearchPathToQueue(tileInfo: TileFoundDescription, head: SearchPath): SearchPath {
        const neighborPath = new SearchPath(head);
        neighborPath.add(
            {
                q: tileInfo.q,
                r: tileInfo.r,
                movementCost: head.getTotalMovementCost() + tileInfo.movementCost,
            },
            tileInfo.movementCost
        );
        this.searchPathQueue.enqueue(neighborPath);
        return neighborPath;
    }

    setAllReachableTiles() {
        this.results.setAllReachableTiles(this.getTilesSearchCanStopAt());
    }

    hasFoundStopLocation(): boolean {
        const routeOrError = this.results.getRouteToStopLocation();
        if (isError(routeOrError)) {
            return false;
        }
        const routeToStopLocation: SearchPath = unwrapResultOrError(routeOrError);
        return routeToStopLocation !== null;
    }

    setLowestCostRoute(searchPath: SearchPath) {
        this.results.setLowestCostRoute(searchPath);
    }

    recordReachableSquaddies(searchParams: SearchParams, missionMap: MissionMap) {
        missionMap.getAllSquaddieData().forEach((datum) => {
            const {
                mapLocation,
                staticSquaddieId,
            } = datum;

            if (this.hasAlreadyMarkedLocationAsVisited(mapLocation)) {
                this.results.reachableSquaddies.addSquaddie(staticSquaddieId, mapLocation);
                this.results.reachableSquaddies.addCoordinateCloseToSquaddie(staticSquaddieId, 0, mapLocation);
            }

            const adjacentLocations: [number, number][] = CreateNewPathCandidates(mapLocation.q, mapLocation.r);
            this.getTilesSearchCanStopAt().forEach((description: TileFoundDescription) => {
                adjacentLocations.forEach((location: [number, number]) => {
                    if (description.q === location[0] && description.r === location[1]) {
                        this.results.reachableSquaddies.addSquaddie(staticSquaddieId, mapLocation);
                        this.results.reachableSquaddies.addCoordinateCloseToSquaddie(staticSquaddieId, 1, description);
                    }
                });
            });
        });
    }
}

export class Pathfinder {

    constructor() {
    }

    findPathToStopLocation(searchParams: SearchParams): ResultOrError<SearchResults, Error> {
        if (searchParams.getStopLocation() === undefined) {
            return makeError(new Error("no stop location was given"));
        }
        return makeResult(this.searchMapForPaths(searchParams));
    }

    getAllReachableTiles(searchParams: SearchParams): SearchResults {
        return this.searchMapForPaths(searchParams);
    }

    getTilesInRange(searchParams: SearchParams, maximumDistance: number, sourceTiles: HexCoordinate[]): TileFoundDescription[] {
        if (maximumDistance < 1) {
            return sourceTiles.map((tile) => {
                return {...tile, movementCost: 0}
            })
        }

        const inRangeTilesByLocation: { [locationKey: string]: TileFoundDescription } = {};

        sourceTiles.forEach((sourceTile) => {
            const searchParamsWithNewStartLocation = new SearchParams({
                ...searchParams.getSearchParamsOptions(),
                numberOfActions: 1,
                squaddieMovement: new SquaddieMovement(
                    {
                        movementPerAction: maximumDistance,
                        traits: new TraitStatusStorage({
                            [Trait.PASS_THROUGH_WALLS]: searchParams.getSearchParamsOptions().squaddieMovement.passThroughWalls,
                            [Trait.CROSS_OVER_PITS]: true,
                        }).filterCategory(TraitCategory.MOVEMENT)
                    }),
                startLocation: sourceTile
            })

            const reachableTiles: SearchResults = this.getAllReachableTiles(searchParamsWithNewStartLocation);

            reachableTiles.allReachableTiles.forEach((reachableTile) => {
                let locationKey: string = HexCoordinateToKey(reachableTile);
                inRangeTilesByLocation[locationKey] = reachableTile;
            });
        });

        return Object.values(inRangeTilesByLocation);
    }

    findReachableSquaddies(searchParams: SearchParams): SearchResults {
        return this.getAllReachableTiles(searchParams);
    }

    private searchMapForPaths(searchParams: SearchParams): SearchResults {
        const workingSearchState: SearchState = new SearchState(searchParams);

        workingSearchState.initializeStartPath({
            q: searchParams.getStartLocation().q,
            r: searchParams.getStartLocation().r,
        });

        let numberOfMovementActions: number = 1;
        let morePathsAdded: boolean = true;

        while (
            this.hasRemainingMovementActions(searchParams, numberOfMovementActions)
            && !this.hasFoundStopLocation(searchParams, workingSearchState)
            && morePathsAdded
            ) {
            const {
                newAddedSearchPaths,
                movementEndsOnTheseTiles
            } = this.addLegalSearchPaths(
                searchParams,
                workingSearchState,
                searchParams.setup.missionMap
            );

            morePathsAdded = newAddedSearchPaths.length > 0;
            const continueToNextMovementAction: boolean = movementEndsOnTheseTiles.length > 0
                && !this.hasFoundStopLocation(searchParams, workingSearchState);

            if (continueToNextMovementAction) {
                numberOfMovementActions++;
                movementEndsOnTheseTiles.forEach(tile => workingSearchState.extendPathWithNewMovementAction(tile))
            }
        }
        workingSearchState.setAllReachableTiles();
        workingSearchState.recordReachableSquaddies(searchParams, searchParams.getMissionMap());
        return workingSearchState.results;
    }

    private hasRemainingMovementActions(searchParams: SearchParams, numberOfMovementActions: number) {
        return searchParams.getNumberOfActions() === undefined
            || numberOfMovementActions <= searchParams.getNumberOfActions();
    }

    private addLegalSearchPaths(
        searchParams: SearchParams,
        workingSearchState: SearchState,
        missionMap: MissionMap,
    ): {
        newAddedSearchPaths: SearchPath[],
        movementEndsOnTheseTiles: TileFoundDescription[]
    } {
        const newAddedSearchPaths: SearchPath[] = [];
        const movementEndsOnTheseTiles: TileFoundDescription[] = [];

        let arrivedAtTheStopLocation: boolean = false;

        while (
            workingSearchState.hasMorePathsToSearch()
            && !arrivedAtTheStopLocation
            ) {
            let head: SearchPath = workingSearchState.nextSearchPath();

            const hexCostTerrainType: HexGridMovementCost = missionMap.getHexGridMovementAtLocation(head.getMostRecentTileLocation());
            const squaddieIsOccupyingTile: boolean = missionMap.getSquaddieAtLocation(head.getMostRecentTileLocation()).isValid();

            this.markLocationAsStoppable(head, searchParams, workingSearchState, hexCostTerrainType, squaddieIsOccupyingTile);
            let mostRecentTileLocation = head.getMostRecentTileLocation();
            workingSearchState.markLocationAsVisited(mostRecentTileLocation);

            if (
                searchParams.getStopLocation() !== undefined
                && head.getMostRecentTileLocation().q === searchParams.getStopLocation().q
                && head.getMostRecentTileLocation().r === searchParams.getStopLocation().r
            ) {
                arrivedAtTheStopLocation = true;
                continue;
            }

            if (this.isPathMoreThanMaximumDistance(head, searchParams)) {
                movementEndsOnTheseTiles.push({
                    q: mostRecentTileLocation.q,
                    r: mostRecentTileLocation.r,
                    movementCost: mostRecentTileLocation.movementCost,
                });
                continue;
            }

            let neighboringLocations = this.createNewPathCandidates(mostRecentTileLocation.q, mostRecentTileLocation.r);
            neighboringLocations = this.selectValidPathCandidates(
                neighboringLocations,
                searchParams,
                head,
                missionMap,
                workingSearchState,
            );
            if (neighboringLocations.length === 0 && this.canStopOnThisTile(head, searchParams, hexCostTerrainType, squaddieIsOccupyingTile)) {
                movementEndsOnTheseTiles.push({
                    q: mostRecentTileLocation.q,
                    r: mostRecentTileLocation.r,
                    movementCost: mostRecentTileLocation.movementCost,
                })
            }
            newAddedSearchPaths.push(...this.createNewPathsUsingNeighbors(
                    neighboringLocations,
                    head,
                    missionMap,
                    workingSearchState,
                )
            );
        }

        return {
            newAddedSearchPaths,
            movementEndsOnTheseTiles,
        }
    }

    private markLocationAsStoppable(
        searchPath: SearchPath,
        searchParams: SearchParams,
        workingSearchState: SearchState,
        hexCostTerrainType: HexGridMovementCost,
        squaddieIsOccupyingTile: boolean
    ) {
        if (
            this.canStopOnThisTile(searchPath, searchParams, hexCostTerrainType, squaddieIsOccupyingTile)
            && !workingSearchState.hasAlreadyStoppedOnTile(searchPath.getMostRecentTileLocation())
        ) {
            workingSearchState.markLocationAsStopped(searchPath.getMostRecentTileLocation())
            workingSearchState.setLowestCostRoute(searchPath);
        }
    }

    private canStopOnThisTile(head: SearchPath, searchParams: SearchParams, hexCostTerrainType: HexGridMovementCost, squaddieIsOccupyingTile: boolean) {
        return this.squaddieCanStopMovingOnTile(searchParams, hexCostTerrainType, squaddieIsOccupyingTile)
            && this.isPathAtLeastMinimumDistance(head, searchParams);
    }

    private selectValidPathCandidates(
        neighboringLocations: [number, number][],
        searchParams: SearchParams,
        head: SearchPath,
        missionMap: MissionMap,
        workingSearchState: SearchState,
    ): [number, number][] {
        neighboringLocations = this.filterNeighborsNotEnqueued(neighboringLocations, workingSearchState);
        neighboringLocations = this.filterNeighborsNotVisited(neighboringLocations, workingSearchState);
        neighboringLocations = this.filterNeighborsOnMap(missionMap, neighboringLocations);
        neighboringLocations = this.filterNeighborsCheckingAffiliation(neighboringLocations, missionMap, searchParams);
        return this.filterNeighborsWithinMovementPerAction(neighboringLocations, searchParams, head, missionMap);
    }

    private createNewPathsUsingNeighbors(
        neighboringLocations: [number, number][],
        head: SearchPath,
        missionMap: MissionMap,
        workingSearchState: SearchState,
    ): SearchPath[] {
        const newPaths: SearchPath[] = [];
        neighboringLocations.forEach((neighbor) =>
            workingSearchState.markLocationAsConsideredForQueue({
                q: neighbor[0],
                r: neighbor[1],
                movementCost: 0,
            })
        );
        neighboringLocations.forEach((neighbor) => {
            const newPath: SearchPath = this.addNeighborNewPath(
                neighbor,
                head,
                missionMap,
                workingSearchState,
            );
            newPaths.push(newPath);
        });
        return newPaths;
    }

    private squaddieCanStopMovingOnTile(searchParams: SearchParams, hexCostTerrainType: HexGridMovementCost, squaddieIsOccupyingTile: boolean) {
        const squaddieIsBlocking: boolean = !searchParams.getCanStopOnSquaddies() && squaddieIsOccupyingTile;
        return !(
            [HexGridMovementCost.wall, HexGridMovementCost.pit].includes(
                hexCostTerrainType
            )
            || squaddieIsBlocking
        )
    }

    private createNewPathCandidates(q: number, r: number): [number, number][] {
        return CreateNewPathCandidates(q, r)
    }

    private filterNeighborsNotVisited(
        neighboringLocations: [number, number][],
        workingSearchState: SearchState,
    ): [number, number][] {
        return neighboringLocations.filter((neighbor) => {
            return !workingSearchState.hasAlreadyMarkedLocationAsVisited({
                q: neighbor[0],
                r: neighbor[1],
            });
        });
    }

    private filterNeighborsNotEnqueued(
        neighboringLocations: [number, number][],
        workingSearchState: SearchState,
    ): [number, number][] {
        return neighboringLocations.filter((neighbor) => {
            return !workingSearchState.hasAlreadyMarkedLocationAsEnqueued({
                q: neighbor[0],
                r: neighbor[1],
            });
        });
    }

    private filterNeighborsOnMap(missionMap: MissionMap, neighboringLocations: [number, number][]): [number, number][] {
        return neighboringLocations.filter((neighbor) => {
            return missionMap.areCoordinatesOnMap({q: neighbor[0], r: neighbor[1]})
        });
    }

    private filterNeighborsWithinMovementPerAction(
        neighboringLocations: [number, number][],
        searchParams: SearchParams,
        head: SearchPath,
        missionMap: MissionMap,
    ): [number, number][] {
        return neighboringLocations.filter((neighbor) => {
            const hexCostTerrainType: HexGridMovementCost = missionMap.getHexGridMovementAtLocation({
                q: neighbor[0],
                r: neighbor[1]
            });

            if (!searchParams.getPassThroughWalls() && hexCostTerrainType === HexGridMovementCost.wall) {
                return false;
            }

            if (!searchParams.getCrossOverPits() && hexCostTerrainType === HexGridMovementCost.pit) {
                return false;
            }

            if (searchParams.getMovementPerAction() === undefined) {
                return true;
            }

            let movementCost = MovingCostByTerrainType[hexCostTerrainType];
            return head.getMovementCostSinceStartOfAction() + movementCost <= searchParams.getMovementPerAction();
        });
    }

    private filterNeighborsCheckingAffiliation(
        neighboringLocations: [number, number][],
        missionMap: MissionMap,
        searchParams: SearchParams
    ): [number, number][] {
        if (!searchParams.hasSquaddieAffiliation()
            || !searchParams.getSquaddieRepository()
        ) {
            return neighboringLocations;
        }

        const searcherAffiliation: SquaddieAffiliation = searchParams.getSquaddieAffiliation();
        const friendlyAffiliations: { [friendlyAffiliation in SquaddieAffiliation]?: boolean } = FriendlyAffiliationsByAffiliation[searcherAffiliation];
        return neighboringLocations.filter((neighbor) => {
            const squaddieInfo: MissionMapSquaddieDatum = missionMap.getSquaddieAtLocation({
                q: neighbor[0],
                r: neighbor[1],
            });
            if (!squaddieInfo.isValid()) {
                return true;
            }
            const {
                staticSquaddie
            } = getResultOrThrowError(searchParams.getSquaddieRepository().getSquaddieByDynamicID(squaddieInfo.dynamicSquaddieId));
            return friendlyAffiliations[staticSquaddie.squaddieId.affiliation];
        });
    }

    private addNeighborNewPath(
        neighbor: [number, number],
        head: SearchPath,
        missionMap: MissionMap,
        workingSearchState: SearchState,
    ): SearchPath {
        const hexCostTerrainType: HexGridMovementCost = missionMap.getHexGridMovementAtLocation({
            q: neighbor[0],
            r: neighbor[1]
        });

        let movementCost = MovingCostByTerrainType[hexCostTerrainType];

        return workingSearchState.addNeighborSearchPathToQueue(
            {
                q: neighbor[0],
                r: neighbor[1],
                movementCost: movementCost
            },
            head,
        );
    }

    private isPathAtLeastMinimumDistance(head: SearchPath, searchParams: SearchParams): boolean {
        if (searchParams.getMinimumDistanceMoved() === undefined || searchParams.getMinimumDistanceMoved() <= 0) {
            return true;
        }

        return head.getTotalDistance() >= searchParams.getMinimumDistanceMoved();
    }

    private isPathMoreThanMaximumDistance(head: SearchPath, searchParams: SearchParams): boolean {
        if (searchParams.getMaximumDistanceMoved() === undefined) {
            return false;
        }
        return head.getTotalDistance() >= searchParams.getMaximumDistanceMoved();
    }

    private hasFoundStopLocation(searchParams: SearchParams, workingSearchState: SearchState,): boolean {
        if (searchParams.getStopLocation() === undefined) {
            return false;
        }
        return workingSearchState.hasFoundStopLocation();
    }
}
