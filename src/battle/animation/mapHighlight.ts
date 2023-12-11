import {BattleSquaddie} from "../battleSquaddie";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {MissionMap} from "../../missionMap/missionMap";
import {HighlightTileDescription, TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {HighlightPulseBlueColor, HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {CanPlayerControlSquaddieRightNow, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {FindValidTargets} from "../targeting/targetingService";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

export const HighlightSquaddieReach = (battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, missionMap: MissionMap, hexMap: TerrainTileMap, squaddieRepository: BattleSquaddieRepository) => {
    const squaddieDatum = missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);

    let {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
    const {
        squaddieHasThePlayerControlledAffiliation,
    } = CanPlayerControlSquaddieRightNow({battleSquaddie, squaddieTemplate});
    if (!squaddieHasThePlayerControlledAffiliation) {
        actionPointsRemaining = 3;
    }

    const reachableTileSearchResults: SearchResults = getResultOrThrowError(
        Pathfinder.getAllReachableTiles(
            SearchParametersHelper.newUsingSearchSetupMovementStop({
                setup: {
                    startLocation: squaddieDatum.mapLocation,
                    affiliation:
                    squaddieTemplate.squaddieId.affiliation,
                },
                movement: {
                    movementPerAction: squaddieTemplate.attributes.movement.movementPerAction,
                    passThroughWalls: squaddieTemplate.attributes.movement.passThroughWalls,
                    crossOverPits: squaddieTemplate.attributes.movement.crossOverPits,
                    canStopOnSquaddies: false,
                    ignoreTerrainPenalty: false,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                },
                stopCondition: {
                    stopLocation: undefined,
                    numberOfActions:
                    actionPointsRemaining,
                },
            }),
            missionMap,
            squaddieRepository,
        )
    );

    const {
        reachableTiles: movementTilesByNumberOfActions,
        sortedMovementActionPoints
    } = reachableTileSearchResults.getReachableTilesByNumberOfMovementActions();

    const tilesTraveledByNumberOfMovementActions: HexCoordinate[][] =
        Object.values(movementTilesByNumberOfActions).map(
            (coordinateList: [({
                q: number,
                r: number
            } | undefined)]) => {
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
