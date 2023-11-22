import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddie} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {SearchResults} from "../../hexMap/pathfinder/searchResults";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {SearchPath, SearchPathHelper} from "../../hexMap/pathfinder/searchPath";
import {TileFoundDescription} from "../../hexMap/pathfinder/tileFoundDescription";
import {getHighlightedTileDescriptionByNumberOfMovementActions} from "../animation/mapHighlight";
import {SquaddieMovementAction} from "../history/squaddieMovementAction";
import {ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";
import {TintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {RecordingHandler} from "../history/recording";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";

export function createSearchPath(state: BattleOrchestratorState, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, clickedHexCoordinate: HexCoordinate) {
    const datum = state.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
    const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
    const searchResults: SearchResults = getResultOrThrowError(
        Pathfinder.findPathToStopLocation(
            SearchParametersHelper.newUsingSearchSetupMovementStop(
                {
                    setup: {
                        startLocation: {
                            q: datum.mapLocation.q,
                            r: datum.mapLocation.r,
                        },
                        affiliation: squaddieTemplate.squaddieId.affiliation,
                    },
                    movement: {
                        movementPerAction: squaddieTemplate.attributes.movement.movementPerAction,
                        passThroughWalls: squaddieTemplate.attributes.movement.passThroughWalls,
                        crossOverPits: squaddieTemplate.attributes.movement.crossOverPits,
                        shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.Snake)),
                        maximumDistanceMoved: undefined,
                        minimumDistanceMoved: undefined,
                        canStopOnSquaddies: undefined,
                        ignoreTerrainPenalty: undefined,
                    },
                    stopCondition: {
                        numberOfActions: actionPointsRemaining,
                        stopLocation: {
                            q: clickedHexCoordinate.q,
                            r: clickedHexCoordinate.r
                        },
                    }
                }
            ),
            state.missionMap,
            state.squaddieRepository,
        )
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
    state.missionMap.terrainTileMap.stopHighlightingTiles();
    state.missionMap.terrainTileMap.highlightTiles(routeTilesByDistance);

    state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
}

export function AddMovementInstruction(state: BattleOrchestratorState, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, destinationHexCoordinate: HexCoordinate) {
    MaybeCreateSquaddieInstruction(state, battleSquaddie, squaddieTemplate);

    const moveAction = new SquaddieMovementAction({
        destination: destinationHexCoordinate,
        numberOfActionPointsSpent: SearchPathHelper.getNumberOfMovementActions(state.squaddieMovePath),
    });

    SquaddieInstructionInProgressHandler.addConfirmedAction(state.squaddieCurrentlyActing, moveAction);
    RecordingHandler.addEvent(state.battleEventRecording, {
        instruction: state.squaddieCurrentlyActing,
        results: undefined,
    });
    return moveAction;
}

export function MaybeCreateSquaddieInstruction(state: BattleOrchestratorState, battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate) {
    if (SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.squaddieCurrentlyActing)) {
        const datum = state.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const battleSquaddieId = battleSquaddie.battleSquaddieId;

        state.squaddieCurrentlyActing = {
            movingBattleSquaddieIds: [],
            squaddieActionsForThisRound: {
                squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
                battleSquaddieId,
                startingLocation: {
                    q: datum.mapLocation.q,
                    r: datum.mapLocation.r,
                },
                actions: [],
            },
            currentlySelectedAction: undefined,
        };


    }
}

export function MaybeEndSquaddieTurn(state: BattleOrchestratorState) {
    if (!state.squaddieCurrentlyActing) {
        return;
    }

    if (!SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)) {
        return;
    }

    const {
        battleSquaddie: actingBattleSquaddie,
        squaddieTemplate: actingSquaddieTemplate
    } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(
        SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)
    ));
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    TintSquaddieIfTurnIsComplete(state.squaddieRepository, actingBattleSquaddie, actingSquaddieTemplate);
}
