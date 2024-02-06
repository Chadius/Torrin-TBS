import {BattleSquaddie} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetNumberOfActionPoints, SquaddieService} from "../../squaddie/squaddieService";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {ActionEffectMovementService} from "../../decision/TODODELETEMEactionEffectMovement";
import {OrchestratorUtilities, ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct} from "./orchestratorUtils";
import {DrawSquaddieUtilities} from "../animation/drawSquaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {
    TODODELETEMECurrentlySelectedSquaddieDecisionService
} from "../history/TODODELETEMECurrentlySelectedSquaddieDecision";
import {RecordingService} from "../history/recording";
import {ObjectRepositoryService} from "../objectRepository";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {MapHighlightHelper} from "../animation/mapHighlight";
import {LocationTraveled} from "../../hexMap/pathfinder/locationTraveled";
import {DecisionService} from "../../decision/TODODELETEMEdecision";
import {TODODELETEMESquaddieActionsForThisRoundService} from "../history/TODODELETEMESquaddieDecisionsDuringThisPhase";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {BattleEventService} from "../history/battleEvent";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurnService} from "../../squaddie/turn";
import {DecidedActionMovementEffectService} from "../../action/decided/decidedActionMovementEffect";
import {ProcessedActionService} from "../../action/processed/processedAction";
import {DecidedActionService} from "../../action/decided/decidedAction";
import {ProcessedActionMovementEffectService} from "../../action/processed/processedActionMovementEffect";

export const BattleSquaddieSelectorService = {
    createSearchPath: ({
                           state,
                           squaddieTemplate,
                           battleSquaddie,
                           clickedHexCoordinate,
                       }: {
                           state: GameEngineState,
                           squaddieTemplate: SquaddieTemplate,
                           battleSquaddie: BattleSquaddie,
                           clickedHexCoordinate: HexCoordinate,
                       }) => {
        return createSearchPath(state, squaddieTemplate, battleSquaddie, clickedHexCoordinate);
    },
    moveSquaddieAndCompleteInstruction: ({
                                             state,
                                             battleSquaddie,
                                             squaddieTemplate,
                                             clickedHexCoordinate,
                                         }: {
                                             state: GameEngineState,
                                             battleSquaddie: BattleSquaddie,
                                             squaddieTemplate: SquaddieTemplate,
                                             clickedHexCoordinate: HexCoordinate
                                         }) => {
        BattleSquaddieSelectorService.createSearchPath({
            state,
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate
        });
        const locationsByMoveActions: {
            [movementActions: number]: LocationTraveled[]
        } = SquaddieService.searchPathLocationsByNumberOfMovementActions({
            searchPath: state.battleOrchestratorState.battleState.squaddieMovePath,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            repository: state.repository,
        });
        const numberOfActionPointsSpentMoving: number = Math.max(...Object.keys(locationsByMoveActions).map(str => Number(str))) || 1;
        SquaddieTurnService.spendActionPoints(battleSquaddie.squaddieTurn, numberOfActionPointsSpentMoving);

        const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
            template: undefined,
            destination: clickedHexCoordinate,
        });
        const processedAction = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                actionTemplateName: "Move",
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                actionPointCost: numberOfActionPointsSpentMoving,
                actionEffects: [decidedActionMovementEffect],
            }),
            processedActionEffects: [
                ProcessedActionMovementEffectService.new({
                    decidedActionEffect: decidedActionMovementEffect,
                })
            ]
        });
        state.battleOrchestratorState.battleState.actionsThisRound.processedActions.push(processedAction);

        state.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(battleSquaddie.battleSquaddieId, decidedActionMovementEffect.destination);
    }
}

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

export function TODODELETEMEAddMovementInstruction(state: GameEngineState, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, destinationHexCoordinate: HexCoordinate) {
    TODODELETEMEMaybeCreateSquaddieInstruction(state, battleSquaddie, squaddieTemplate);

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
    TODODELETEMECurrentlySelectedSquaddieDecisionService.addConfirmedDecision(state.battleOrchestratorState.battleState.TODODELETEMEsquaddieCurrentlyActing, decision)

    RecordingService.addEvent(state.battleOrchestratorState.battleState.recording, BattleEventService.new({
            instruction: state.battleOrchestratorState.battleState.TODODELETEMEsquaddieCurrentlyActing,
            results: undefined,
        })
    );
    return moveAction;
}

export function TODODELETEMEMaybeCreateSquaddieInstruction(state: GameEngineState, battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate) {
    if (!OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)) {
        const datum = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
        const battleSquaddieId = battleSquaddie.battleSquaddieId;

        state.battleOrchestratorState.battleState.TODODELETEMEsquaddieCurrentlyActing = TODODELETEMECurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: TODODELETEMESquaddieActionsForThisRoundService.new({
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

export function TODODELETEMEMaybeEndSquaddieTurn(state: GameEngineState) {
    if (!state.battleOrchestratorState.battleState.TODODELETEMEsquaddieCurrentlyActing) {
        return;
    }

    if (!TODODELETEMECurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.TODODELETEMEsquaddieCurrentlyActing)) {
        return;
    }

    const {
        battleSquaddie: actingBattleSquaddie,
        squaddieTemplate: actingSquaddieTemplate
    } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository,
        TODODELETEMECurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.TODODELETEMEsquaddieCurrentlyActing)
    ));
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(actingBattleSquaddie, actingSquaddieTemplate, state.repository);
}
