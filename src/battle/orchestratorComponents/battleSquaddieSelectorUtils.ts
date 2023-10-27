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

export function createSearchPath(state: BattleOrchestratorState, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, clickedHexCoordinate: HexCoordinate) {
    const datum = state.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
    const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
    const searchResults: SearchResults = getResultOrThrowError(
        state.pathfinder.findPathToStopLocation(new SearchParams({
            setup: new SearchSetup({
                missionMap: state.missionMap,
                startLocation: {
                    q: datum.mapLocation.q,
                    r: datum.mapLocation.r,
                },
                affiliation: squaddieTemplate.squaddieId.affiliation,
                squaddieRepository: state.squaddieRepository,

            }),
            movement: new SearchMovement({
                movementPerAction: squaddieTemplate.movement.movementPerAction,
                passThroughWalls: squaddieTemplate.movement.passThroughWalls,
                crossOverPits: squaddieTemplate.movement.crossOverPits,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
            }),
            stopCondition: new SearchStopCondition({
                numberOfActionPoints: actionPointsRemaining,
                stopLocation: {
                    q: clickedHexCoordinate.q,
                    r: clickedHexCoordinate.r
                },
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

export function AddMovementInstruction(state: BattleOrchestratorState, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, destinationHexCoordinate: HexCoordinate) {
    MaybeCreateSquaddieInstruction(state, battleSquaddie, squaddieTemplate);

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

export function MaybeCreateSquaddieInstruction(state: BattleOrchestratorState, battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate) {
    if (state.squaddieCurrentlyActing.isReadyForNewSquaddie) {
        const datum = state.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const battleSquaddieId = battleSquaddie.battleSquaddieId;

        state.squaddieCurrentlyActing.reset();
        state.squaddieCurrentlyActing.addInitialState({
            squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
            battleSquaddieId,
            startingLocation: {
                q: datum.mapLocation.q,
                r: datum.mapLocation.r,
            },
        })
    }
}

export function MaybeEndSquaddieTurn(state: BattleOrchestratorState) {
    if (!state.squaddieCurrentlyActing) {
        return;
    }

    if (!state.squaddieCurrentlyActing.battleSquaddieId) {
        return;
    }

    const {
        battleSquaddie: actingBattleSquaddie,
        squaddieTemplate: actingSquaddieTemplate
    } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(state.squaddieCurrentlyActing.battleSquaddieId));
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    TintSquaddieIfTurnIsComplete(actingBattleSquaddie, actingSquaddieTemplate);
}
