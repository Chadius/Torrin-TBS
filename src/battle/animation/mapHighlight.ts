import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {MissionMap} from "../../missionMap/missionMap";
import {HighlightTileDescription, TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "../../hexMap/pathfinder/searchParams";
import {HighlightPulseBlueColor, HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {GetNumberOfActions} from "../../squaddie/squaddieService";

export const highlightSquaddieReach = (dynamicSquaddie: BattleSquaddieDynamic, staticSquaddie: BattleSquaddieStatic, pathfinder: Pathfinder, missionMap: MissionMap, hexMap: TerrainTileMap, squaddieRepository: BattleSquaddieRepository) => {
    const squaddieDatum = missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);

    const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie})

    const reachableTileSearchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(
        new SearchParams({
            setup: new SearchSetup({
                startLocation: squaddieDatum.mapLocation,
                missionMap: missionMap,
                affiliation: staticSquaddie.squaddieId.affiliation,
                squaddieRepository,
            }),
            movement: new SearchMovement({
                movementPerAction: staticSquaddie.movement.movementPerAction,
                passThroughWalls: staticSquaddie.movement.passThroughWalls,
                crossOverPits: staticSquaddie.movement.crossOverPits,
                canStopOnSquaddies: false,
                ignoreTerrainPenalty: false,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActions: normalActionsRemaining,
            })
        }))
    );
    const movementTiles: HexCoordinate[] = reachableTileSearchResults.getReachableTiles();
    const movementTilesByNumberOfActions: {
        [numberOfActions: number]: [{ q: number, r: number }?]
    } = reachableTileSearchResults.getReachableTilesByNumberOfMovementActions();

    const datum = missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);

    const squaddieHasActivities: boolean = staticSquaddie.activities.length > 0
    const actionTiles: HexCoordinate[] = squaddieHasActivities ?
        pathfinder.getTilesInRange(
            new SearchParams({
                setup: new SearchSetup({
                    startLocation: squaddieDatum.mapLocation,
                    missionMap: missionMap,
                    affiliation: staticSquaddie.squaddieId.affiliation,
                    squaddieRepository,
                }),
                movement: new SearchMovement({
                    minimumDistanceMoved: staticSquaddie.activities[0].minimumRange,
                    movementPerAction: staticSquaddie.movement.movementPerAction,
                    passThroughWalls: staticSquaddie.movement.passThroughWalls,
                    crossOverPits: staticSquaddie.movement.crossOverPits,
                    canStopOnSquaddies: true,
                    ignoreTerrainPenalty: false,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(staticSquaddie.activities[0].targetingShape)),
                }),
                stopCondition: new SearchStopCondition({
                    numberOfActions: normalActionsRemaining,
                })
            }),
            staticSquaddie.activities[0].maximumRange,
            movementTiles,
        )
        : [];

    const tilesTraveledByNumberOfMovementActions: HexCoordinate[][] =
        Object.values(movementTilesByNumberOfActions).map(
            (coordinateList: [({ q: number, r: number } | undefined)]) => {
                return coordinateList.map(
                    (coordinate) => {
                        return new HexCoordinate({...coordinate})
                    })
            });

    tilesTraveledByNumberOfMovementActions.unshift([]);
    const highlightTileDescriptions = getHighlightedTileDescriptionByNumberOfMovementActions(tilesTraveledByNumberOfMovementActions);

    if (actionTiles) {
        highlightTileDescriptions.push({
                tiles: actionTiles,
                pulseColor: HighlightPulseRedColor,
                overlayImageResourceName: "map icon attack 1 action",
            },
        )
    }
    hexMap.highlightTiles(highlightTileDescriptions);
}
export const getHighlightedTileDescriptionByNumberOfMovementActions = (routeSortedByNumberOfMovementActions: HexCoordinate[][]) => {
    const routeTilesByDistance: HighlightTileDescription[] =
        routeSortedByNumberOfMovementActions.map((tiles, numberOfMovementActions) => {
            let overlayImageResourceName: string;
            switch (numberOfMovementActions) {
                case 0:
                    break;
                case 1:
                    overlayImageResourceName = "map icon move 1 action";
                    break;
                case 2:
                    overlayImageResourceName = "map icon move 2 actions";
                    break;
                default:
                    overlayImageResourceName = "map icon move 3 actions";
                    break;
            }

            if (overlayImageResourceName) {
                return {
                    tiles,
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName,
                }
            }
            return {
                tiles,
                pulseColor: HighlightPulseBlueColor,
            }
        });
    return routeTilesByDistance;
}
