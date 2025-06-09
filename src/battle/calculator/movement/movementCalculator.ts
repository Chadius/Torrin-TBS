import { SquaddieService } from "../../../squaddie/squaddieService"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { isValidValue } from "../../../utils/objectValidityCheck"
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
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../../history/battleAction/battleActionRecorder"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { SearchResultAdapterService } from "../../../hexMap/pathfinder/searchResults/searchResultAdapter"
import { SearchLimitService } from "../../../hexMap/pathfinder/pathGeneration/searchLimit"
import { SearchPathAdapter } from "../../../search/searchPathAdapter/searchPathAdapter"
import { ObjectRepository } from "../../objectRepository"
import { BattleState } from "../../battleState/battleState"
import {
    SearchResultsCache,
    SearchResultsCacheService,
} from "../../../hexMap/pathfinder/searchResults/searchResultsCache"

export const MovementCalculatorService = {
    isMovementPossible: ({
        battleSquaddie,
        squaddieTemplate,
        destination,
        missionMap,
        squaddieAllMovementCache,
    }: {
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        destination: HexCoordinate
        missionMap: MissionMap
        squaddieAllMovementCache: SearchResultsCache
    }): boolean => {
        const squaddieDatum = MissionMapService.getByBattleSquaddieId(
            missionMap,
            battleSquaddie.battleSquaddieId
        )

        const movementActionPoints =
            SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                battleSquaddie.squaddieTurn
            )

        const searchLimit = SearchLimitService.new({
            baseSearchLimit: SearchLimitService.landBasedMovement(),
            maximumMovementCost:
                movementActionPoints *
                SquaddieService.getSquaddieMovementAttributes({
                    battleSquaddie,
                    squaddieTemplate,
                }).net.movementPerAction,
            squaddieAffiliation: SquaddieAffiliation.PLAYER,
            canStopOnSquaddies: true,
            passThroughWalls: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.passThroughWalls,
            crossOverPits: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.crossOverPits,
            ignoreTerrainCost: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.ignoreTerrainCost,
        })
        const searchResults =
            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache: squaddieAllMovementCache,
                searchLimit,
                currentMapCoordinate: squaddieDatum.currentMapCoordinate,
                originMapCoordinate: squaddieDatum.originMapCoordinate,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })

        const closestRoute: SearchPathAdapter =
            SearchResultAdapterService.getShortestPathToCoordinate({
                searchResults: searchResults,
                mapCoordinate: destination,
            })
        return isValidValue(closestRoute)
    },
    setBattleActionDecisionStepReadyToAnimate: ({
        battleSquaddie,
        squaddieTemplate,
        destination,
        battleActionDecisionStep,
        missionMap,
        battleState,
        objectRepository,
    }: {
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        destination: HexCoordinate
        battleActionDecisionStep: BattleActionDecisionStep
        missionMap: MissionMap
        battleState: BattleState
        objectRepository: ObjectRepository
    }) => {
        BattleSquaddieSelectorService.createSearchPathAndHighlightMovementPath({
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate: destination,
            missionMap,
            objectRepository,
            battleState,
        })

        BattleActionDecisionStepService.reset(battleActionDecisionStep)
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: battleActionDecisionStep,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: battleActionDecisionStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep: battleActionDecisionStep,
            targetCoordinate: destination,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: battleActionDecisionStep,
            targetCoordinate: destination,
        })
    },
    spendActionPointsOnRefundableMovement: ({
        searchPath,
        battleSquaddie,
        objectRepository,
    }: {
        battleSquaddie: BattleSquaddie
        searchPath: SearchPathAdapter
        objectRepository: ObjectRepository
    }) => {
        return spendActionPointsOnRefundableMovement({
            searchPath,
            objectRepository,
            battleSquaddie,
        })
    },
    queueBattleActionToMove: ({
        battleSquaddie,
        destination,
        missionMap,
        battleActionRecorder,
    }: {
        battleSquaddie: BattleSquaddie
        destination: HexCoordinate
        missionMap: MissionMap
        battleActionRecorder: BattleActionRecorder
    }) => {
        const { currentMapCoordinate: startLocation } =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
                battleSquaddie.battleSquaddieId
            )

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleActionRecorder,
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

const spendActionPointsOnRefundableMovement = ({
    battleSquaddie,
    searchPath,
    objectRepository,
}: {
    battleSquaddie: BattleSquaddie
    searchPath: SearchPathAdapter
    objectRepository: ObjectRepository
}) => {
    const coordinatesByMoveActions: {
        [movementActions: number]: HexCoordinate[]
    } = SquaddieService.searchPathCoordinatesByNumberOfMovementActions({
        searchPath,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository: objectRepository,
    })
    const numberOfActionPointsSpentMoving: number = Math.max(
        ...Object.keys(coordinatesByMoveActions).map((str) => Number(str))
    )

    SquaddieTurnService.setMovementActionPointsSpentButCanBeRefunded({
        squaddieTurn: battleSquaddie.squaddieTurn,
        actionPoints: numberOfActionPointsSpentMoving,
    })
}
