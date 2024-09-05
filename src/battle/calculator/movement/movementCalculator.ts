import { GameEngineState } from "../../../gameEngine/gameEngine"
import { SquaddieService } from "../../../squaddie/squaddieService"
import {
    SearchResult,
    SearchResultsService,
} from "../../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderHelper } from "../../../hexMap/pathfinder/pathGeneration/pathfinder"
import { SearchParametersHelper } from "../../../hexMap/pathfinder/searchParams"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import {
    GetTargetingShapeGenerator,
    TargetingShape,
} from "../../targeting/targetingShapeGenerator"
import { SearchPath } from "../../../hexMap/pathfinder/searchPath"
import { isValidValue } from "../../../utils/validityCheck"
import { BattleSquaddie } from "../../battleSquaddie"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import {
    BattleActionQueueService,
    BattleActionService,
} from "../../history/battleAction"
import { BattleSquaddieSelectorService } from "../../orchestratorComponents/battleSquaddieSelectorUtils"
import { SquaddieTurnService } from "../../../squaddie/turn"
import { ActionsThisRoundService } from "../../history/actionsThisRound"
import { MissionMapService } from "../../../missionMap/missionMap"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { RecordingService } from "../../history/recording"
import { BattleEventService } from "../../history/battleEvent"
import {
    ProcessedAction,
    ProcessedActionService,
} from "../../../action/processed/processedAction"
import { LocationTraveled } from "../../../hexMap/pathfinder/locationTraveled"
import { DecidedActionMovementEffectService } from "../../../action/decided/decidedActionMovementEffect"
import { DecidedActionService } from "../../../action/decided/decidedAction"
import { ProcessedActionMovementEffectService } from "../../../action/processed/processedActionMovementEffect"

export const MovementCalculatorService = {
    isMovementPossible: ({
        gameEngineState,
        battleSquaddie,
        squaddieTemplate,
        destination,
    }: {
        gameEngineState: GameEngineState
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        destination: HexCoordinate
    }): boolean => {
        const squaddieDatum =
            gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                battleSquaddie.battleSquaddieId
            )
        const { actionPointsRemaining } =
            SquaddieService.getNumberOfActionPoints({
                squaddieTemplate,
                battleSquaddie,
            })
        const searchResults: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [squaddieDatum.mapLocation],
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                movementPerAction:
                    squaddieTemplate.attributes.movement.movementPerAction,
                canPassThroughWalls:
                    squaddieTemplate.attributes.movement.passThroughWalls,
                canPassOverPits:
                    squaddieTemplate.attributes.movement.crossOverPits,
                shapeGenerator: getResultOrThrowError(
                    GetTargetingShapeGenerator(TargetingShape.SNAKE)
                ),
                maximumDistanceMoved: undefined,
                minimumDistanceMoved: undefined,
                canStopOnSquaddies: true,
                ignoreTerrainCost: false,
                stopLocations: [destination],
                numberOfActions: actionPointsRemaining,
            }),
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            repository: gameEngineState.repository,
        })

        const closestRoute: SearchPath =
            SearchResultsService.getShortestPathToLocation(
                searchResults,
                destination.q,
                destination.r
            )
        return isValidValue(closestRoute)
    },
    setBattleActionDecisionStepReadyToAnimate: ({
        gameEngineState,
        battleSquaddie,
        squaddieTemplate,
        destination,
    }: {
        gameEngineState: GameEngineState
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        destination: HexCoordinate
    }) => {
        BattleSquaddieSelectorService.createSearchPathAndHighlightMovementPath({
            state: gameEngineState,
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate: destination,
        })
        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            movement: true,
        })
        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            targetLocation: destination,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            targetLocation: destination,
        })
    },
    createMovementProcessedAction: ({
        gameEngineState,
        battleSquaddie,
        destination,
    }: {
        gameEngineState: GameEngineState
        battleSquaddie: BattleSquaddie
        destination: HexCoordinate
    }): ProcessedAction => {
        return createMovementProcessedAction({
            gameEngineState: gameEngineState,
            battleSquaddie,
            destination,
        })
    },
    addProcessedActionToHistory: ({
        gameEngineState,
        battleSquaddie,
        processedAction,
    }: {
        gameEngineState: GameEngineState
        battleSquaddie: BattleSquaddie
        processedAction: ProcessedAction
    }) => {
        ActionsThisRoundService.updateActionsThisRound({
            state: gameEngineState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation: MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                battleSquaddie.battleSquaddieId
            ).mapLocation,
            processedAction,
        })

        RecordingService.addEvent(
            gameEngineState.battleOrchestratorState.battleState.recording,
            BattleEventService.new({
                processedAction,
                results: undefined,
            })
        )
    },
    consumeSquaddieActions: ({
        battleSquaddie,
        processedAction,
    }: {
        processedAction: ProcessedAction
        battleSquaddie: BattleSquaddie
    }) => {
        SquaddieTurnService.spendActionPoints(
            battleSquaddie.squaddieTurn,
            processedAction.decidedAction.actionPointCost
        )
    },
    queueBattleActionToMove: ({
        gameEngineState,
        battleSquaddie,
        destination,
    }: {
        gameEngineState: GameEngineState
        battleSquaddie: BattleSquaddie
        destination: HexCoordinate
    }) => {
        const { mapLocation: startLocation } =
            gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                battleSquaddie.battleSquaddieId
            )

        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            BattleActionService.new({
                actor: {
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                },
                action: { isMovement: true },
                effect: {
                    movement: {
                        startLocation,
                        endLocation: destination,
                    },
                },
            })
        )
    },
}

const createMovementProcessedAction = ({
    gameEngineState,
    battleSquaddie,
    destination,
}: {
    gameEngineState: GameEngineState
    battleSquaddie: BattleSquaddie
    destination: HexCoordinate
}): ProcessedAction => {
    const locationsByMoveActions: {
        [movementActions: number]: LocationTraveled[]
    } = SquaddieService.searchPathLocationsByNumberOfMovementActions({
        searchPath:
            gameEngineState.battleOrchestratorState.battleState
                .squaddieMovePath,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository: gameEngineState.repository,
    })
    const numberOfActionPointsSpentMoving: number =
        Math.max(
            ...Object.keys(locationsByMoveActions).map((str) => Number(str))
        ) || 1

    const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
        template: undefined,
        destination: destination,
    })

    return ProcessedActionService.new({
        decidedAction: DecidedActionService.new({
            actionTemplateName: "Move",
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            actionPointCost: numberOfActionPointsSpentMoving,
            actionEffects: [decidedActionMovementEffect],
        }),
        processedActionEffects: [
            ProcessedActionMovementEffectService.new({
                decidedActionEffect: decidedActionMovementEffect,
            }),
        ],
    })
}
