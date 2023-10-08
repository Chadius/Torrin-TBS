import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddie} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchMovement, SearchParams, SearchSetup, SearchStopCondition} from "../../hexMap/pathfinder/searchParams";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {TileFoundDescription} from "../../hexMap/pathfinder/tileFoundDescription";
import {getHighlightedTileDescriptionByNumberOfMovementActions} from "../animation/mapHighlight";
import {SquaddieMovementAction} from "../history/squaddieMovementAction";
import {BattleEvent} from "../history/battleEvent";
import {ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";
import {TintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

export function createSearchPath(state: BattleOrchestratorState, squaddietemplate: SquaddieTemplate, dynamicSquaddie: BattleSquaddie, clickedHexCoordinate: HexCoordinate) {
    const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
    const {actionPointsRemaining} = GetNumberOfActionPoints({squaddietemplate, dynamicSquaddie})
    const searchResults: SearchResults = getResultOrThrowError(
        state.pathfinder.findPathToStopLocation(new SearchParams({
            setup: new SearchSetup({
                missionMap: state.missionMap,
                startLocation: new HexCoordinate({
                    q: datum.mapLocation.q,
                    r: datum.mapLocation.r,
                }),
                affiliation: squaddietemplate.squaddieId.affiliation,
                squaddieRepository: state.squaddieRepository,

            }),
            movement: new SearchMovement({
                movementPerAction: squaddietemplate.movement.movementPerAction,
                passThroughWalls: squaddietemplate.movement.passThroughWalls,
                crossOverPits: squaddietemplate.movement.crossOverPits,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActionPoints: actionPointsRemaining,
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

export function AddMovementInstruction(state: BattleOrchestratorState, squaddietemplate: SquaddieTemplate, dynamicSquaddie: BattleSquaddie, destinationHexCoordinate: HexCoordinate) {
    MaybeCreateSquaddieInstruction(state, dynamicSquaddie, squaddietemplate);

    const moveAction = new SquaddieMovementAction({
        destination: destinationHexCoordinate,
        numberOfActionPointsSpent: state.squaddieMovePath.getNumberOfMovementActions(),
    });

    state.squaddieCurrentlyActing.addConfirmedAction(moveAction);
    state.battleEventRecording.addEvent(new BattleEvent({
        currentSquaddieInstruction: state.squaddieCurrentlyActing,
    }));
    return moveAction;
}

export function MaybeCreateSquaddieInstruction(state: BattleOrchestratorState, dynamicSquaddie: BattleSquaddie, squaddietemplate: SquaddieTemplate) {
    if (state.squaddieCurrentlyActing.isReadyForNewSquaddie) {
        const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
        const dynamicSquaddieId = dynamicSquaddie.dynamicSquaddieId;

        state.squaddieCurrentlyActing.reset();
        state.squaddieCurrentlyActing.addInitialState({
            squaddietemplateId: squaddietemplate.squaddieId.staticId,
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
        squaddietemplate: actingSquaddieStatic
    } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId));
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    TintSquaddieIfTurnIsComplete(actingSquaddieDynamic, actingSquaddieStatic);
}
