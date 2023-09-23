import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetNumberOfActions} from "../../squaddie/squaddieService";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "../../hexMap/pathfinder/searchParams";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {TileFoundDescription} from "../../hexMap/pathfinder/tileFoundDescription";
import {getHighlightedTileDescriptionByNumberOfMovementActions} from "../animation/mapHighlight";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {BattleEvent} from "../history/battleEvent";
import {ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";
import {TintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";

export function createSearchPath(state: BattleOrchestratorState, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, clickedHexCoordinate: HexCoordinate) {
    const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
    const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie})
    const searchResults: SearchResults = getResultOrThrowError(
        state.pathfinder.findPathToStopLocation(new SearchParams({
            setup: new SearchSetup({
                missionMap: state.missionMap,
                startLocation: new HexCoordinate({
                    q: datum.mapLocation.q,
                    r: datum.mapLocation.r,
                }),
                affiliation: staticSquaddie.squaddieId.affiliation,
                squaddieRepository: state.squaddieRepository,

            }),
            movement: new SearchMovement({
                movementPerAction: staticSquaddie.movement.movementPerAction,
                passThroughWalls: staticSquaddie.movement.passThroughWalls,
                crossOverPits: staticSquaddie.movement.crossOverPits,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActions: normalActionsRemaining,
                stopLocation: new HexCoordinate({
                    q: clickedHexCoordinate.q,
                    r: clickedHexCoordinate.r
                }),
            }),
        }))
    );

    const closestRoute: SearchPath = getResultOrThrowError(searchResults.getRouteToStopLocation());

    const noDirectRouteToDestination = closestRoute === null;
    if (noDirectRouteToDestination) {
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

    state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
}

export function AddMovementInstruction(state: BattleOrchestratorState, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, destinationHexCoordinate: HexCoordinate) {
    MaybeCreateSquaddieInstruction(state, dynamicSquaddie, staticSquaddie);

    const moveActivity = new SquaddieMovementActivity({
        destination: destinationHexCoordinate,
        numberOfActionsSpent: state.squaddieMovePath.getNumberOfMovementActions(),
    });

    state.squaddieCurrentlyActing.addConfirmedActivity(moveActivity);
    state.battleEventRecording.addEvent(new BattleEvent({
        currentSquaddieInstruction: state.squaddieCurrentlyActing,
    }));
    return moveActivity;
}

export function MaybeCreateSquaddieInstruction(state: BattleOrchestratorState, dynamicSquaddie: BattleSquaddieDynamic, staticSquaddie: BattleSquaddieStatic) {
    if (state.squaddieCurrentlyActing.isReadyForNewSquaddie) {
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        const dynamicSquaddieId = dynamicSquaddie.dynamicSquaddieId;

        state.squaddieCurrentlyActing.reset();
        state.squaddieCurrentlyActing.addInitialState({
            staticSquaddieId: staticSquaddie.squaddieId.staticId,
            dynamicSquaddieId,
            startingLocation: new HexCoordinate({
                q: datum.mapLocation.q,
                r: datum.mapLocation.r,
            }),
        })
    }
}

export function MaybeEndSquaddieTurn(state: BattleOrchestratorState) {
    if (!state.squaddieCurrentlyActing) {
        return;
    }

    if (!state.squaddieCurrentlyActing.dynamicSquaddieId) {
        return;
    }

    const {
        dynamicSquaddie: actingSquaddieDynamic,
        staticSquaddie: actingSquaddieStatic
    } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId));
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    TintSquaddieIfTurnIsComplete(actingSquaddieDynamic, actingSquaddieStatic);
}
