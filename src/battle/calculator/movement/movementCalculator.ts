import { GameEngineState } from "../../../gameEngine/gameEngine"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { SearchResult } from "../../../hexMap/pathfinder/searchResults/searchResult"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
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
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import { MissionMapService } from "../../../missionMap/missionMap"
import { SearchResultAdapterService } from "../../../hexMap/pathfinder/searchResults/searchResultAdapter"
import { MapSearchService } from "../../../hexMap/pathfinder/pathGeneration/mapSearch"
import { SearchLimitService } from "../../../hexMap/pathfinder/pathGeneration/searchLimit"
import { SearchPathAdapter } from "../../../search/searchPathAdapter/searchPathAdapter"

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
        const { unallocatedActionPoints } =
            SquaddieService.getNumberOfActionPoints({
                squaddieTemplate,
                battleSquaddie,
            })

        const searchResults: SearchResult =
            MapSearchService.calculatePathsToDestinations({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
                startCoordinate: squaddieDatum.mapCoordinate,
                searchLimit: SearchLimitService.new({
                    baseSearchLimit: SearchLimitService.landBasedMovement(),
                    maximumMovementCost:
                        unallocatedActionPoints *
                        SquaddieService.getSquaddieMovementAttributes({
                            battleSquaddie,
                            squaddieTemplate,
                        }).net.movementPerAction,
                    squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    canStopOnSquaddies: true,
                    passThroughWalls:
                        SquaddieService.getSquaddieMovementAttributes({
                            battleSquaddie,
                            squaddieTemplate,
                        }).net.passThroughWalls,
                    crossOverPits:
                        SquaddieService.getSquaddieMovementAttributes({
                            battleSquaddie,
                            squaddieTemplate,
                        }).net.crossOverPits,
                    ignoreTerrainCost:
                        SquaddieService.getSquaddieMovementAttributes({
                            battleSquaddie,
                            squaddieTemplate,
                        }).net.ignoreTerrainCost,
                }),
                destinationCoordinates: [destination],
            })

        const closestRoute: SearchPathAdapter =
            SearchResultAdapterService.getShortestPathToCoordinate({
                searchResults: searchResults,
                mapCoordinate: destination,
            })
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
            targetCoordinate: destination,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            targetCoordinate: destination,
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
        const { mapCoordinate: startLocation } =
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
                        startCoordinate: startLocation,
                        endCoordinate: destination,
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
    const coordinatesByMoveActions: {
        [movementActions: number]: HexCoordinate[]
    } = SquaddieService.searchPathCoordinatesByNumberOfMovementActions({
        searchPath:
            gameEngineState.battleOrchestratorState.battleState
                .squaddieMovePath,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository: gameEngineState.repository,
    })
    const numberOfActionPointsSpentMoving: number =
        Math.max(
            ...Object.keys(coordinatesByMoveActions).map((str) => Number(str))
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
        targetCoordinate: destination,
    })

    SquaddieTurnService.spendActionPointsForMovement({
        squaddieTurn: battleSquaddie.squaddieTurn,
        actionPoints: numberOfActionPointsSpentMoving,
    })
}
