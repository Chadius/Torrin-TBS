import { GameEngineState } from "../../../gameEngine/gameEngine"
import { SquaddieService } from "../../../squaddie/squaddieService"
import {
    SearchResult,
    SearchResultsService,
} from "../../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../../hexMap/pathfinder/pathGeneration/pathfinder"
import { SearchParametersService } from "../../../hexMap/pathfinder/searchParams"
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
import { BattleActionService } from "../../history/battleAction/battleAction"
import { BattleSquaddieSelectorService } from "../../orchestratorComponents/battleSquaddieSelectorUtils"
import { SquaddieTurnService } from "../../../squaddie/turn"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import { LocationTraveled } from "../../../hexMap/pathfinder/locationTraveled"
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import { MissionMapService } from "../../../missionMap/missionMap"

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
        const squaddieDatum = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddie.battleSquaddieId
        )
        const { actionPointsRemaining } =
            SquaddieService.getNumberOfActionPoints({
                squaddieTemplate,
                battleSquaddie,
            })
        const searchResults: SearchResult = PathfinderService.search({
            searchParameters: SearchParametersService.new({
                startLocations: [squaddieDatum.mapLocation],
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                movementPerAction:
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).movementPerAction,
                canPassThroughWalls:
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).passThroughWalls,
                canPassOverPits: SquaddieService.getSquaddieMovementAttributes({
                    battleSquaddie,
                    squaddieTemplate,
                }).crossOverPits,
                ignoreTerrainCost:
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).ignoreTerrainCost,
                shapeGenerator: getResultOrThrowError(
                    GetTargetingShapeGenerator(TargetingShape.SNAKE)
                ),
                maximumDistanceMoved: undefined,
                minimumDistanceMoved: undefined,
                canStopOnSquaddies: true,
                stopLocations: [destination],
                numberOfActions: actionPointsRemaining,
            }),
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            objectRepository: gameEngineState.repository,
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
            gameEngineState: gameEngineState,
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate: destination,
        })
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            targetLocation: destination,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            targetLocation: destination,
        })
    },
    spendActionPointsMoving: ({
        gameEngineState,
        battleSquaddie,
        destination,
    }: {
        gameEngineState: GameEngineState
        battleSquaddie: BattleSquaddie
        destination: HexCoordinate
    }) => {
        return spendActionPointsMoving({
            gameEngineState: gameEngineState,
            battleSquaddie,
            destination,
        })
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
            MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                battleSquaddie.battleSquaddieId
            )

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: battleSquaddie.battleSquaddieId,
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

const spendActionPointsMoving = ({
    gameEngineState,
    battleSquaddie,
    destination,
}: {
    gameEngineState: GameEngineState
    battleSquaddie: BattleSquaddie
    destination: HexCoordinate
}) => {
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

    const movementStep: BattleActionDecisionStep =
        BattleActionDecisionStepService.new()
    BattleActionDecisionStepService.setActor({
        actionDecisionStep: movementStep,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
    })
    BattleActionDecisionStepService.addAction({
        actionDecisionStep: movementStep,
        movement: true,
    })
    BattleActionDecisionStepService.setConfirmedTarget({
        actionDecisionStep: movementStep,
        targetLocation: destination,
    })

    SquaddieTurnService.spendActionPoints(
        battleSquaddie.squaddieTurn,
        numberOfActionPointsSpentMoving
    )
}
