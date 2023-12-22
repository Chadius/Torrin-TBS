import {BattleSquaddie} from "../battleSquaddie";
import {MissionMap} from "../../missionMap/missionMap";
import {HighlightTileDescription, TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {HighlightPulseBlueColor, HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {ObjectRepository} from "../objectRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {CanPlayerControlSquaddieRightNow, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {FindValidTargets} from "../targeting/targetingService";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";

export const HighlightSquaddieReach = (battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, missionMap: MissionMap, hexMap: TerrainTileMap, squaddieRepository: ObjectRepository) => {
    const squaddieDatum = missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);

    let {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
    const {
        squaddieHasThePlayerControlledAffiliation,
    } = CanPlayerControlSquaddieRightNow({battleSquaddie, squaddieTemplate});
    if (!squaddieHasThePlayerControlledAffiliation) {
        actionPointsRemaining = 3;
    }

    const reachableTileSearchResults: SearchResult = PathfinderHelper.search({
        searchParameters: SearchParametersHelper.new({
            startLocations: [squaddieDatum.mapLocation],
            squaddieAffiliation:
            squaddieTemplate.squaddieId.affiliation,
            movementPerAction: squaddieTemplate.attributes.movement.movementPerAction,
            canPassThroughWalls: squaddieTemplate.attributes.movement.passThroughWalls,
            canPassOverPits: squaddieTemplate.attributes.movement.crossOverPits,
            canStopOnSquaddies: false,
            ignoreTerrainCost: false,
            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
            numberOfActions: actionPointsRemaining,
        }),
        missionMap,
        repository: squaddieRepository,
    })

    const movementTilesByNumberOfActions: {
        [moveActions: number]: HexCoordinate[]
    } = SearchResultsHelper.getLocationsByNumberOfMoveActions(reachableTileSearchResults)
    const sortedMovementActionPoints: number[] = Object.keys(movementTilesByNumberOfActions).map(str => Number(str));

    const tilesTraveledByNumberOfMovementActions: HexCoordinate[][] =
        Object.values(movementTilesByNumberOfActions).map(
            (coordinateList: [({
                q: number,
                r: number
            })]) => {
                return coordinateList.map(
                    (coordinate) => {
                        return {...coordinate}
                    })
            });

    tilesTraveledByNumberOfMovementActions.unshift([]);
    const highlightTileDescriptions = getHighlightedTileDescriptionByNumberOfMovementActions(tilesTraveledByNumberOfMovementActions);

    let actionTiles: HexCoordinate[] = [];
    const actionPoints = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie});

    squaddieTemplate.actions.forEach((action) => {
        sortedMovementActionPoints.forEach((movementActionsSpent: number) => {
            if (action.actionPointCost > actionPoints.actionPointsRemaining - movementActionsSpent) {
                return;
            }

            const targetingResults = FindValidTargets({
                map: missionMap,
                action: action,
                actingSquaddieTemplate: squaddieTemplate,
                actingBattleSquaddie: battleSquaddie,
                squaddieRepository,
                sourceTiles: tilesTraveledByNumberOfMovementActions[movementActionsSpent],
            })
            actionTiles.push(...targetingResults.locationsInRange);
        });
    });

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
