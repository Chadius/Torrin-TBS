import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {MissionMap} from "../../missionMap/missionMap";
import {HighlightTileDescription, TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {HighlightPulseBlueColor, HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";

export const highlightSquaddieReach = (dynamicSquaddie: BattleSquaddieDynamic, staticSquaddie: BattleSquaddieStatic, pathfinder: Pathfinder, missionMap: MissionMap, hexMap: TerrainTileMap, squaddieRepository: BattleSquaddieRepository) => {
    const squaddieDatum = missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);

    const reachableTileSearchResults: SearchResults = getResultOrThrowError(pathfinder.getAllReachableTiles(
        new SearchParams({
            missionMap: missionMap,
            startLocation: squaddieDatum.mapLocation,
            squaddieMovement: staticSquaddie.movement,
            squaddieAffiliation: staticSquaddie.squaddieId.affiliation,
            squaddieRepository,
            numberOfActions: dynamicSquaddie.squaddieTurn.getRemainingActions(),
        }))
    );
    const movementTiles: HexCoordinate[] = reachableTileSearchResults.getReachableTiles();
    const movementTilesByNumberOfActions: {
        [numberOfActions: number]: [{ q: number, r: number }?]
    } = reachableTileSearchResults.getReachableTilesByNumberOfMovementActions();

    const datum = missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);

    const actionTiles: HexCoordinate[] = pathfinder.getTilesInRange(new SearchParams({
            canStopOnSquaddies: true,
            missionMap: missionMap,
            minimumDistanceMoved: staticSquaddie.activities[0].minimumRange,
            startLocation: datum.mapLocation,
        }),
        staticSquaddie.activities[0].maximumRange,
        movementTiles,
    );

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
