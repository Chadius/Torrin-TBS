import {PriorityQueue} from "../../utils/priorityQueue";
import {HexGridMovementCost, MovingCostByTerrainType} from "../hexGridMovementCost";
import {CreateNewNeighboringCoordinates} from "../hexGridDirection";
import {SearchParams} from "./searchParams";
import {SquaddieMovement} from "../../squaddie/movement";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {TileFoundDescription} from "./tileFoundDescription";
import {MissionMap} from "../../missionMap/missionMap";
import {
    getResultOrThrowError,
    isError,
    makeError,
    makeResult,
    ResultOrError,
    unwrapResultOrError
} from "../../utils/ResultOrError";
import {FriendlyAffiliationsByAffiliation, SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {HexCoordinate, HexCoordinateToKey} from "../hexCoordinate/hexCoordinate";
import {TargetingShapeGenerator} from "../../battle/targeting/targetingShapeGenerator";

import {GetSquaddieAtMapLocation} from "../../battle/orchestratorComponents/orchestratorUtils";
import {IsSquaddieAlive} from "../../squaddie/squaddieService";

class SearchState {
    tilesSearchCanStopAt: HexCoordinate[];
    tileLocationsAlreadyVisited: { [loc: string]: boolean };
    tileLocationsAlreadyConsideredForQueue: { [loc: string]: boolean };
    searchPathQueue: PriorityQueue;
    results: SearchResults;

    private _shapeGenerator: TargetingShapeGenerator;

    constructor(searchParams: SearchParams) {
        this.tilesSearchCanStopAt = [];
        this.tileLocationsAlreadyVisited = {};
        this.tileLocationsAlreadyConsideredForQueue = {};
        this.searchPathQueue = new PriorityQueue();
        this.results = new SearchResults({
            stopLocation: searchParams.stopLocation
        });
        this.shapeGenerator = searchParams.shapeGenerator;
    }

    get shapeGenerator(): TargetingShapeGenerator {
        return this._shapeGenerator;
    }

    set shapeGenerator(value: TargetingShapeGenerator) {
        this._shapeGenerator = value;
    }

    getTilesSearchCanStopAt(): HexCoordinate[] {
        return this.tilesSearchCanStopAt;
    }

    hasAlreadyStoppedOnTile(tileLocation: HexCoordinate): boolean {
        return !!this.tilesSearchCanStopAt.find(
            (tile) => tile.q === tileLocation.q && tile.r === tileLocation.r)
    }

    markLocationAsStopped(tileLocation: TileFoundDescription) {
        this.tilesSearchCanStopAt.push(new HexCoordinate({
                q: tileLocation.q,
                r: tileLocation.r,
            })
        );
    }

    markLocationAsVisited(mostRecentTileLocation: TileFoundDescription) {
        let mostRecentTileLocationKey: string = HexCoordinateToKey(mostRecentTileLocation.hexCoordinate);
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

    markLocationAsConsideredForQueue(location: HexCoordinate) {
        this.tileLocationsAlreadyConsideredForQueue[location.toStringKey()] = true;
    }

    initializeStartPath(startLocation: HexCoordinate) {
        const startingPath = new SearchPath();
        startingPath.add(new TileFoundDescription({
            hexCoordinate: new HexCoordinate({
                q: startLocation.q,
                r: startLocation.r,
            }),
            movementCost: 0,
        }), 0);
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
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({
                    q: tileInfo.q,
                    r: tileInfo.r,
                }),
                movementCost: head.getTotalMovementCost() + tileInfo.movementCost,
            }),
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
                staticSquaddie,
                dynamicSquaddie
            } = getResultOrThrowError(searchParams.squaddieRepository.getSquaddieByDynamicId(datum.dynamicSquaddieId));
            if (!IsSquaddieAlive({staticSquaddie, dynamicSquaddie})) {
                return;
            }
            const {
                mapLocation,
                staticSquaddieId,
            } = datum;

            if (this.hasAlreadyMarkedLocationAsVisited(mapLocation)) {
                this.results.reachableSquaddies.addSquaddie(staticSquaddieId, mapLocation);
                this.results.reachableSquaddies.addCoordinateCloseToSquaddie(staticSquaddieId, 0, mapLocation);
            }

            const adjacentLocations: HexCoordinate[] = CreateNewNeighboringCoordinates(mapLocation.q, mapLocation.r);
            this.getTilesSearchCanStopAt().forEach((description: HexCoordinate) => {
                adjacentLocations.forEach((location: HexCoordinate) => {
                    if (description.q === location.q && description.r === location.r) {
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
        if (searchParams.stopLocation === undefined) {
            return makeError(new Error("no stop location was given"));
        }
        return makeResult(this.searchMapForPaths(searchParams));
    }

    getAllReachableTiles(searchParams: SearchParams): ResultOrError<SearchResults, Error> {
        if (!searchParams.startLocation) {
            return makeError(new Error("no starting location provided"));
        }

        return makeResult(this.searchMapForPaths(searchParams));
    }

    getTilesInRange(searchParams: SearchParams, maximumDistance: number, sourceTiles: HexCoordinate[]): HexCoordinate[] {
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
            const searchParamsWithNewStartLocation = new SearchParams({
                ...searchParams.searchParamsOptions,
                numberOfActions: 1,
                squaddieMovement: new SquaddieMovement(
                    {
                        movementPerAction: maximumDistance,
                        traits: new TraitStatusStorage({
                            [Trait.PASS_THROUGH_WALLS]: searchParams.passThroughWalls,
                            [Trait.CROSS_OVER_PITS]: true,
                        }).filterCategory(TraitCategory.MOVEMENT)
                    }),
                startLocation: sourceTile
            })

            const reachableTiles: SearchResults = getResultOrThrowError(this.getAllReachableTiles(searchParamsWithNewStartLocation));

            reachableTiles.getReachableTiles().forEach((reachableTile) => {
                inRangeTilesByLocation[reachableTile.toStringKey()] = reachableTile;
            });
        });

        return Object.values(inRangeTilesByLocation);
    }

    findReachableSquaddies(searchParams: SearchParams): SearchResults {
        return getResultOrThrowError(this.getAllReachableTiles(searchParams));
    }

    private searchMapForPaths(searchParams: SearchParams): SearchResults {
        const workingSearchState: SearchState = new SearchState(searchParams);

        workingSearchState.initializeStartPath(new HexCoordinate({
            q: searchParams.startLocation.q,
            r: searchParams.startLocation.r,
        }));

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
                searchParams.missionMap
            );

            morePathsAdded = newAddedSearchPaths.length > 0;
            const continueToNextMovementAction: boolean = movementEndsOnTheseTiles.length > 0
                && !this.hasFoundStopLocation(searchParams, workingSearchState);

            if (continueToNextMovementAction) {
                numberOfMovementActions++;
                movementEndsOnTheseTiles.forEach(tile => workingSearchState.extendPathWithNewMovementAction(tile.hexCoordinate))
            }
        }
        workingSearchState.setAllReachableTiles();
        workingSearchState.recordReachableSquaddies(searchParams, searchParams.missionMap);
        return workingSearchState.results;
    }

    private hasRemainingMovementActions(searchParams: SearchParams, numberOfMovementActions: number) {
        return searchParams.numberOfActions === undefined
            || numberOfMovementActions <= searchParams.numberOfActions;
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

            const hexCostTerrainType: HexGridMovementCost = missionMap.getHexGridMovementAtLocation(head.getMostRecentTileLocation().hexCoordinate);

            let squaddieIsOccupyingTile: boolean = false;
            const squaddieAtTileDatum = missionMap.getSquaddieAtLocation(head.getMostRecentTileLocation().hexCoordinate);
            if (squaddieAtTileDatum.isValid()) {
                const {
                    staticSquaddie: occupyingSquaddieStatic,
                    dynamicSquaddie: occupyingSquaddieDynamic,
                } = getResultOrThrowError(searchParams.squaddieRepository.getSquaddieByDynamicId(squaddieAtTileDatum.dynamicSquaddieId));
                if (IsSquaddieAlive({
                    staticSquaddie: occupyingSquaddieStatic,
                    dynamicSquaddie: occupyingSquaddieDynamic,
                })) {
                    squaddieIsOccupyingTile = true;
                }
            }

            this.markLocationAsStoppable(head, searchParams, workingSearchState, hexCostTerrainType, squaddieIsOccupyingTile);
            let mostRecentTileLocation = head.getMostRecentTileLocation();
            workingSearchState.markLocationAsVisited(mostRecentTileLocation);

            if (
                searchParams.stopLocation !== undefined
                && head.getMostRecentTileLocation().q === searchParams.stopLocation.q
                && head.getMostRecentTileLocation().r === searchParams.stopLocation.r
            ) {
                arrivedAtTheStopLocation = true;
                continue;
            }

            if (this.isPathMoreThanMaximumDistance(head, searchParams)) {
                movementEndsOnTheseTiles.push(new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({
                        q: mostRecentTileLocation.q,
                        r: mostRecentTileLocation.r,
                    }),
                    movementCost: mostRecentTileLocation.movementCost,
                }));
                continue;
            }

            let neighboringLocations = this.createNewPathCandidates(mostRecentTileLocation.q, mostRecentTileLocation.r, workingSearchState.shapeGenerator);
            neighboringLocations = this.selectValidPathCandidates(
                neighboringLocations,
                searchParams,
                head,
                missionMap,
                workingSearchState,
            );
            if (neighboringLocations.length === 0 && this.canStopOnThisTile(head, searchParams, hexCostTerrainType, squaddieIsOccupyingTile)) {
                movementEndsOnTheseTiles.push(new TileFoundDescription({
                    hexCoordinate: new HexCoordinate({
                        q: mostRecentTileLocation.q,
                        r: mostRecentTileLocation.r,
                    }),
                    movementCost: mostRecentTileLocation.movementCost,
                }))
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
            && !workingSearchState.hasAlreadyStoppedOnTile(searchPath.getMostRecentTileLocation().hexCoordinate)
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
        neighboringLocations = this.filterNeighborsCheckingAffiliation(neighboringLocations, searchParams);
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
            workingSearchState.markLocationAsConsideredForQueue(
                new HexCoordinate({
                    q: neighbor[0],
                    r: neighbor[1],
                })
            ));
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
        const squaddieIsBlocking: boolean = !searchParams.canStopOnSquaddies && squaddieIsOccupyingTile;
        return !(
            [HexGridMovementCost.wall, HexGridMovementCost.pit].includes(
                hexCostTerrainType
            )
            || squaddieIsBlocking
        )
    }

    private createNewPathCandidates(q: number, r: number, shapeGenerator: TargetingShapeGenerator): [number, number][] {
        const neighbors: HexCoordinate[] = shapeGenerator.createNeighboringHexCoordinates(new HexCoordinate({coordinates: [q, r]}));
        return neighbors.map((coordinate: HexCoordinate) => {
            return [coordinate.q, coordinate.r]
        });
    }

    private filterNeighborsNotVisited(
        neighboringLocations: [number, number][],
        workingSearchState: SearchState,
    ): [number, number][] {
        return neighboringLocations.filter((neighbor) => {
            return !workingSearchState.hasAlreadyMarkedLocationAsVisited(new HexCoordinate({
                q: neighbor[0],
                r: neighbor[1],
            }));
        });
    }

    private filterNeighborsNotEnqueued(
        neighboringLocations: [number, number][],
        workingSearchState: SearchState,
    ): [number, number][] {
        return neighboringLocations.filter((neighbor) => {
            return !workingSearchState.hasAlreadyMarkedLocationAsEnqueued(new HexCoordinate({
                q: neighbor[0],
                r: neighbor[1],
            }));
        });
    }

    private filterNeighborsOnMap(missionMap: MissionMap, neighboringLocations: [number, number][]): [number, number][] {
        return neighboringLocations.filter((neighbor) => {
            return missionMap.areCoordinatesOnMap(new HexCoordinate({q: neighbor[0], r: neighbor[1]}))
        });
    }

    private filterNeighborsWithinMovementPerAction(
        neighboringLocations: [number, number][],
        searchParams: SearchParams,
        head: SearchPath,
        missionMap: MissionMap,
    ): [number, number][] {
        return neighboringLocations.filter((neighbor) => {
            const hexCostTerrainType: HexGridMovementCost = missionMap.getHexGridMovementAtLocation(new HexCoordinate({
                q: neighbor[0],
                r: neighbor[1]
            }));

            if (!searchParams.passThroughWalls && hexCostTerrainType === HexGridMovementCost.wall) {
                return false;
            }

            if (!searchParams.crossOverPits && hexCostTerrainType === HexGridMovementCost.pit) {
                return false;
            }

            if (searchParams.movementPerAction === undefined) {
                return true;
            }

            let movementCost = MovingCostByTerrainType[hexCostTerrainType];
            return head.getMovementCostSinceStartOfAction() + movementCost <= searchParams.movementPerAction;
        });
    }

    private filterNeighborsCheckingAffiliation(
        neighboringLocations: [number, number][],
        searchParams: SearchParams
    ): [number, number][] {
        if (!searchParams.hasSquaddieAffiliation()
            || !searchParams.squaddieRepository
        ) {
            return neighboringLocations;
        }

        const searcherAffiliation: SquaddieAffiliation = searchParams.squaddieAffiliation;
        const friendlyAffiliations: { [friendlyAffiliation in SquaddieAffiliation]?: boolean } = FriendlyAffiliationsByAffiliation[searcherAffiliation];
        return neighboringLocations.filter((neighbor) => {
            const {
                staticSquaddie,
                dynamicSquaddie,
            } = GetSquaddieAtMapLocation({
                mapLocation: new HexCoordinate({coordinates: neighbor}),
                map: searchParams.missionMap,
                squaddieRepository: searchParams.squaddieRepository,
            });

            if (!staticSquaddie) {
                return true;
            }

            if (!IsSquaddieAlive({staticSquaddie, dynamicSquaddie})) {
                return true;
            }

            return friendlyAffiliations[staticSquaddie.squaddieId.affiliation];
        });
    }

    private addNeighborNewPath(
        neighbor: [number, number],
        head: SearchPath,
        missionMap: MissionMap,
        workingSearchState: SearchState,
    ): SearchPath {
        const hexCostTerrainType: HexGridMovementCost = missionMap.getHexGridMovementAtLocation(new HexCoordinate({
            q: neighbor[0],
            r: neighbor[1]
        }));

        let movementCost = MovingCostByTerrainType[hexCostTerrainType];

        return workingSearchState.addNeighborSearchPathToQueue(
            new TileFoundDescription({
                hexCoordinate: new HexCoordinate({
                    q: neighbor[0],
                    r: neighbor[1],
                }),
                movementCost: movementCost
            }),
            head,
        );
    }

    private isPathAtLeastMinimumDistance(head: SearchPath, searchParams: SearchParams): boolean {
        if (searchParams.minimumDistanceMoved === undefined || searchParams.minimumDistanceMoved <= 0) {
            return true;
        }

        return head.getTotalDistance() >= searchParams.minimumDistanceMoved;
    }

    private isPathMoreThanMaximumDistance(head: SearchPath, searchParams: SearchParams): boolean {
        if (searchParams.maximumDistanceMoved === undefined) {
            return false;
        }
        return head.getTotalDistance() >= searchParams.maximumDistanceMoved;
    }

    private hasFoundStopLocation(searchParams: SearchParams, workingSearchState: SearchState,): boolean {
        if (searchParams.stopLocation === undefined) {
            return false;
        }
        return workingSearchState.hasFoundStopLocation();
    }
}
