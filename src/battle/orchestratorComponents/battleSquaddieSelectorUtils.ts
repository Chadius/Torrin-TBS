import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetNumberOfActions} from "../../squaddie/squaddieService";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {TileFoundDescription} from "../../hexMap/pathfinder/tileFoundDescription";
import {getHighlightedTileDescriptionByNumberOfMovementActions} from "../animation/mapHighlight";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {BattleEvent} from "../history/battleEvent";

export function createSearchPath(state: OrchestratorState, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, clickedHexCoordinate: HexCoordinate) {
    const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
    const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie})
    const searchResults: SearchResults = getResultOrThrowError(
        state.pathfinder.findPathToStopLocation(new SearchParams({
            missionMap: state.missionMap,
            squaddieMovement: staticSquaddie.movement,
            numberOfActions: normalActionsRemaining,
            startLocation: new HexCoordinate({
                q: datum.mapLocation.q,
                r: datum.mapLocation.r,
            }),
            stopLocation: new HexCoordinate({
                q: clickedHexCoordinate.q,
                r: clickedHexCoordinate.r
            }),
            squaddieAffiliation: staticSquaddie.squaddieId.affiliation,
            squaddieRepository: state.squaddieRepository,
            shapeGeneratorType: TargetingShape.Snake,
        }))
    );

    const closestRoute: SearchPath = getResultOrThrowError(searchResults.getRouteToStopLocation());

    const noDirectRouteToDestination = closestRoute === null;
    if (noDirectRouteToDestination) {
        state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.SELECTED_SQUADDIE);
        return;
    }

    state.squaddieMovePath = closestRoute;
    let routeSortedByNumberOfMovementActions: TileFoundDescription[][] = getResultOrThrowError(searchResults.getRouteToStopLocationSortedByNumberOfMovementActions());

    const routeTilesByDistance = getHighlightedTileDescriptionByNumberOfMovementActions(
        routeSortedByNumberOfMovementActions.map(
            tiles => tiles.map(
                tile => tile.hexCoordinate
            )
        )
    );
    state.hexMap.stopHighlightingTiles();
    state.hexMap.highlightTiles(routeTilesByDistance);

    state.battleSquaddieUIInput.changeSelectionState(BattleSquaddieUISelectionState.MOVING_SQUADDIE);
    state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
}

export function addMovementInstruction(state: OrchestratorState, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, destinationHexCoordinate: HexCoordinate) {
    if (!(state.squaddieCurrentlyActing && state.squaddieCurrentlyActing.instruction)) {
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        const dynamicSquaddieId = dynamicSquaddie.dynamicSquaddieId;

        state.squaddieCurrentlyActing = new SquaddieInstructionInProgress({
            instruction: new SquaddieInstruction({
                staticSquaddieId: staticSquaddie.squaddieId.staticId,
                dynamicSquaddieId,
                startingLocation: new HexCoordinate({
                    q: datum.mapLocation.q,
                    r: datum.mapLocation.r,
                }),
            }),
        });
    }

    state.squaddieCurrentlyActing.addConfirmedActivity(new SquaddieMovementActivity({
        destination: destinationHexCoordinate,
        numberOfActionsSpent: state.squaddieMovePath.getNumberOfMovementActions(),
    }));
    state.battleEventRecording.addEvent(new BattleEvent({
        currentSquaddieInstruction: state.squaddieCurrentlyActing,
    }));
}
