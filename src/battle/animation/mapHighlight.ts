import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {HighlightTileDescription} from "../../hexMap/terrainTileMap";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SquaddieService} from "../../squaddie/squaddieService";
import {MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS} from "../loading/missionLoader";
import {HighlightPulseBlueColor, HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {MissionMap} from "../../missionMap/missionMap";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {GetTargetingShapeGenerator} from "../targeting/targetingShapeGenerator";
import {isValidValue} from "../../utils/validityCheck";

export const MapHighlightHelper = {
    convertSearchPathToHighlightLocations: ({searchPath, repository, battleSquaddieId}: {
        searchPath: SearchPath;
        repository: ObjectRepository;
        battleSquaddieId: string
    }): HighlightTileDescription[] => {
        const locationsByNumberOfMovementActions = SquaddieService.searchPathLocationsByNumberOfMovementActions({
            repository,
            battleSquaddieId,
            searchPath
        });
        return Object.entries(locationsByNumberOfMovementActions).map(([numberOfMoveActionsStr, locations]) => {
            const numberOfMoveActions: number = Number(numberOfMoveActionsStr);
            let imageOverlayName = "";
            switch (numberOfMoveActions) {
                case 0:
                    imageOverlayName = "";
                    break;
                case 1:
                    imageOverlayName = MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[0];
                    break
                case 2:
                    imageOverlayName = MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[1];
                    break
                default:
                    imageOverlayName = MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[2];
                    break
            }
            return {
                tiles: locations.map(loc => {
                    return {q: loc.hexCoordinate.q, r: loc.hexCoordinate.r}
                }),
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: imageOverlayName,
            }
        });
    },
    highlightAllLocationsWithinSquaddieRange: ({
                                                   startLocation,
                                                   missionMap,
                                                   repository,
                                                   battleSquaddieId,
                                               }: {
        startLocation: { q: number; r: number };
        missionMap: MissionMap;
        repository: ObjectRepository;
        battleSquaddieId: string
    }): HighlightTileDescription[] => {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieId));

        const {actionPointsRemaining} = SquaddieService.getNumberOfActionPoints({battleSquaddie, squaddieTemplate});

        const reachableLocationSearch: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [startLocation],
                numberOfActions: actionPointsRemaining,
                movementPerAction: squaddieTemplate.attributes.movement.movementPerAction,
                canPassOverPits: squaddieTemplate.attributes.movement.crossOverPits,
                canPassThroughWalls: squaddieTemplate.attributes.movement.passThroughWalls,
                squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
                canStopOnSquaddies: false,
            }),
            missionMap,
            repository,
        });

        const movementRange = highlightAllLocationsWithinSquaddieMovementRange(repository, battleSquaddieId, startLocation, reachableLocationSearch, missionMap);
        const attackRange = addAttackRangeOntoMovementRange(repository, battleSquaddieId, reachableLocationSearch, missionMap);
        if (attackRange && attackRange.tiles.length > 0) {
            return [...movementRange, attackRange];
        }
        return [...movementRange];
    }
}

const highlightAllLocationsWithinSquaddieMovementRange = (repository: ObjectRepository, battleSquaddieId: string, startLocation: HexCoordinate, reachableLocationSearch: SearchResult, missionMap: MissionMap) => {
    const highlightedLocations: HighlightTileDescription[] = [
        {
            tiles: [
                {...startLocation},
            ],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName: "",
        },
        {
            tiles: [],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[0],
        },
        {
            tiles: [],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[1],
        },
        {
            tiles: [],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[2],
        },
    ];
    Object.entries(SearchResultsHelper.getLocationsByNumberOfMoveActions(reachableLocationSearch)).forEach(([moveActionsStr, locations]) => {
        const moveActions = Number(moveActionsStr);
        let highlightedLocationIndex: number = Math.min(moveActions, 3);
        const locationsBesidesStart = locations.filter(l => l.q !== startLocation.q || l.r !== startLocation.r)
        highlightedLocations[highlightedLocationIndex].tiles.push(...locationsBesidesStart);
    });

    return highlightedLocations.filter(description => description.tiles.length > 0);
};

const addAttackRangeOntoMovementRange = (repository: ObjectRepository, battleSquaddieId: string, reachableLocationSearch: SearchResult, missionMap: MissionMap): HighlightTileDescription => {
    const {
        squaddieTemplate,
        battleSquaddie
    } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieId));

    const {actionPointsRemaining} = SquaddieService.getNumberOfActionPoints({battleSquaddie, squaddieTemplate});

    const allLocationsSquaddieCanMoveTo: HexCoordinate[] = SearchResultsHelper.getStoppableLocations(reachableLocationSearch);

    const attackLocations: HexCoordinate[] = [];
    squaddieTemplate.actions.forEach(action => {
        allLocationsSquaddieCanMoveTo.forEach(coordinate => {
            const path: SearchPath = reachableLocationSearch.shortestPathByLocation[coordinate.q][coordinate.r];
            const numberOfMoveActionsToReachEndOfPath: number = isValidValue(path) ? path.currentNumberOfMoveActions : 0;
            if (numberOfMoveActionsToReachEndOfPath + action.actionPointCost > actionPointsRemaining) {
                return;
            }

            const actionRangeResults = PathfinderHelper.search({
                searchParameters: SearchParametersHelper.new({
                    startLocations: [coordinate],
                    canStopOnSquaddies: true,
                    canPassOverPits: true,
                    canPassThroughWalls: TraitStatusStorageHelper.getStatus(action.traits, Trait.PASS_THROUGH_WALLS),
                    minimumDistanceMoved: action.minimumRange,
                    maximumDistanceMoved: action.maximumRange,
                    squaddieAffiliation: SquaddieAffiliation.UNKNOWN,
                    ignoreTerrainCost: true,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(action.targetingShape)),
                }),
                missionMap,
                repository,
            })


            const uniqueLocations = SearchResultsHelper.getStoppableLocations(actionRangeResults).filter(location =>
                !attackLocations.some(attackLoc => attackLoc.q === location.q && attackLoc.r === location.r)
            ).filter(location =>
                !allLocationsSquaddieCanMoveTo.some(moveLoc => moveLoc.q === location.q && moveLoc.r === location.r)
            );
            attackLocations.push(...uniqueLocations);
        })
    });

    return {
        tiles: attackLocations,
        pulseColor: HighlightPulseRedColor,
        overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[3],
    };
};
