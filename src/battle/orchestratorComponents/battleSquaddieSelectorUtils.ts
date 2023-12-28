import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddie} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetNumberOfActionPoints, SquaddieService} from "../../squaddie/squaddieService";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {SquaddieMovementActionDataService} from "../history/squaddieMovementAction";
import {ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";
import {TintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {RecordingHandler} from "../history/recording";
import {ObjectRepositoryHelper} from "../objectRepository";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {MapHighlightHelper} from "../animation/mapHighlight";
import {LocationTraveled} from "../../hexMap/pathfinder/locationTraveled";

export function createSearchPath(state: BattleOrchestratorState, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, clickedHexCoordinate: HexCoordinate) {
    const datum = state.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
    const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
    const searchResults: SearchResult = PathfinderHelper.search({
        searchParameters: SearchParametersHelper.new({
            startLocations: [{
                q: datum.mapLocation.q,
                r: datum.mapLocation.r,
            }],
            movementPerAction: squaddieTemplate.attributes.movement.movementPerAction,
            canPassThroughWalls: squaddieTemplate.attributes.movement.passThroughWalls,
            canPassOverPits: squaddieTemplate.attributes.movement.crossOverPits,
            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
            maximumDistanceMoved: undefined,
            minimumDistanceMoved: undefined,
            canStopOnSquaddies: undefined,
            ignoreTerrainCost: undefined,
            stopLocations: [clickedHexCoordinate],
            numberOfActions: actionPointsRemaining,
        }),
        missionMap: state.battleState.missionMap,
        repository: state.squaddieRepository,
    });

    const closestRoute: SearchPath = SearchResultsHelper.getShortestPathToLocation(searchResults, clickedHexCoordinate.q, clickedHexCoordinate.r);

    const noDirectRouteToDestination = closestRoute === null;
    if (noDirectRouteToDestination) {
        return;
    }

    state.battleState.squaddieMovePath = closestRoute;

    const routeTilesByDistance = MapHighlightHelper.convertSearchPathToHighlightLocations({
        searchPath: closestRoute,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository: state.squaddieRepository,
    })
    state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
    state.battleState.missionMap.terrainTileMap.highlightTiles(routeTilesByDistance);

    state.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
}

export function AddMovementInstruction(state: BattleOrchestratorState, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, destinationHexCoordinate: HexCoordinate) {
    MaybeCreateSquaddieInstruction(state, battleSquaddie, squaddieTemplate);

    const locationsByMoveActions: {
        [movementActions: number]: LocationTraveled[]
    } = SquaddieService.searchPathLocationsByNumberOfMovementActions({
        searchPath: state.battleState.squaddieMovePath,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository: state.squaddieRepository,
    });
    const numberOfActionPointsSpentMoving: number = Math.max(...Object.keys(locationsByMoveActions).map(str => Number(str))) || 1;

    const moveAction = SquaddieMovementActionDataService.new({
        destination: destinationHexCoordinate,
        numberOfActionPointsSpent: numberOfActionPointsSpentMoving,
    });

    SquaddieInstructionInProgressHandler.addConfirmedAction(state.battleState.squaddieCurrentlyActing, moveAction);
    RecordingHandler.addEvent(state.battleState.recording, {
        instruction: state.battleState.squaddieCurrentlyActing,
        results: undefined,
    });
    return moveAction;
}

export function MaybeCreateSquaddieInstruction(state: BattleOrchestratorState, battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate) {
    if (SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleState.squaddieCurrentlyActing)) {
        const datum = state.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const battleSquaddieId = battleSquaddie.battleSquaddieId;

        state.battleState.squaddieCurrentlyActing = {
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
    if (!state.battleState.squaddieCurrentlyActing) {
        return;
    }

    if (!SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)) {
        return;
    }

    const {
        battleSquaddie: actingBattleSquaddie,
        squaddieTemplate: actingSquaddieTemplate
    } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(state.squaddieRepository,
        SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
    ));
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    TintSquaddieIfTurnIsComplete(state.squaddieRepository, actingBattleSquaddie, actingSquaddieTemplate);
}
