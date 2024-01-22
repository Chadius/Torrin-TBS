import {BattleSquaddie} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetNumberOfActionPoints, SquaddieService} from "../../squaddie/squaddieService";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {OrchestratorUtilities, ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";
import {DrawSquaddieUtilities} from "../animation/drawSquaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {RecordingService} from "../history/recording";
import {ObjectRepositoryService} from "../objectRepository";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {MapHighlightHelper} from "../animation/mapHighlight";
import {LocationTraveled} from "../../hexMap/pathfinder/locationTraveled";
import {DecisionService} from "../../decision/decision";
import {SquaddieActionsForThisRoundService} from "../history/squaddieDecisionsDuringThisPhase";
import {GameEngineState} from "../../gameEngine/gameEngine";

export function createSearchPath(state: GameEngineState, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, clickedHexCoordinate: HexCoordinate) {
    const datum = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
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
        missionMap: state.battleOrchestratorState.battleState.missionMap,
        repository: state.repository,
    });

    const closestRoute: SearchPath = SearchResultsHelper.getShortestPathToLocation(searchResults, clickedHexCoordinate.q, clickedHexCoordinate.r);

    const noDirectRouteToDestination = closestRoute === null;
    if (noDirectRouteToDestination) {
        return;
    }

    state.battleOrchestratorState.battleState.squaddieMovePath = closestRoute;

    const routeTilesByDistance = MapHighlightHelper.convertSearchPathToHighlightLocations({
        searchPath: closestRoute,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository: state.repository,
        campaignResources: state.campaign.resources,
    });
    state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
    state.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles(routeTilesByDistance);

    state.battleOrchestratorState.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
}

export function AddMovementInstruction(state: GameEngineState, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, destinationHexCoordinate: HexCoordinate) {
    MaybeCreateSquaddieInstruction(state, battleSquaddie, squaddieTemplate);

    const locationsByMoveActions: {
        [movementActions: number]: LocationTraveled[]
    } = SquaddieService.searchPathLocationsByNumberOfMovementActions({
        searchPath: state.battleOrchestratorState.battleState.squaddieMovePath,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository: state.repository,
    });
    const numberOfActionPointsSpentMoving: number = Math.max(...Object.keys(locationsByMoveActions).map(str => Number(str))) || 1;

    const moveAction = ActionEffectMovementService.new({
        destination: destinationHexCoordinate,
        numberOfActionPointsSpent: numberOfActionPointsSpentMoving,
    });

    const decision = DecisionService.new({
        actionEffects: [
            moveAction
        ]
    });
    CurrentlySelectedSquaddieDecisionService.addConfirmedDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, decision)

    RecordingService.addEvent(state.battleOrchestratorState.battleState.recording, {
        instruction: state.battleOrchestratorState.battleState.squaddieCurrentlyActing,
        results: undefined,
    });
    return moveAction;
}

export function MaybeCreateSquaddieInstruction(state: GameEngineState, battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate) {
    if (!OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)) {
        const datum = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const battleSquaddieId = battleSquaddie.battleSquaddieId;

        state.battleOrchestratorState.battleState.squaddieCurrentlyActing = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
                battleSquaddieId,
                startingLocation: {
                    q: datum.mapLocation.q,
                    r: datum.mapLocation.r,
                },
            }),
        });
    }
}

export function MaybeEndSquaddieTurn(state: GameEngineState) {
    if (!state.battleOrchestratorState.battleState.squaddieCurrentlyActing) {
        return;
    }

    if (!CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)) {
        return;
    }

    const {
        battleSquaddie: actingBattleSquaddie,
        squaddieTemplate: actingSquaddieTemplate
    } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository,
        CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
    ));
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(actingBattleSquaddie, actingSquaddieTemplate, state.repository);
}
