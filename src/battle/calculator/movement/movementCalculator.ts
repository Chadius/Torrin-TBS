import { SquaddieService } from "../../../squaddie/squaddieService"
import { SearchResult } from "../../../hexMap/pathfinder/searchResults/searchResult"
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
import { MapSearchService } from "../../../hexMap/pathfinder/pathGeneration/mapSearch"
import { SearchLimitService } from "../../../hexMap/pathfinder/pathGeneration/searchLimit"
import { SearchPathAdapter } from "../../../search/searchPathAdapter/searchPathAdapter"
import { ObjectRepository } from "../../objectRepository"
import { CampaignResources } from "../../../campaign/campaignResources"
import { BattleState } from "../../battleState/battleState"

export const MovementCalculatorService = {
    isMovementPossible: ({
        battleSquaddie,
        squaddieTemplate,
        destination,
        missionMap,
        objectRepository,
    }: {
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        destination: HexCoordinate
        missionMap: MissionMap
        objectRepository: ObjectRepository
    }): boolean => {
        const squaddieDatum = MissionMapService.getByBattleSquaddieId(
            missionMap,
            battleSquaddie.battleSquaddieId
        )

        const movementActionPoints =
            SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                battleSquaddie.squaddieTurn
            )

        const searchResults: SearchResult =
            MapSearchService.calculatePathsToDestinations({
                missionMap,
                objectRepository,
                currentMapCoordinate: squaddieDatum.currentMapCoordinate,
                originMapCoordinate: squaddieDatum.originMapCoordinate,
                searchLimit: SearchLimitService.new({
                    baseSearchLimit: SearchLimitService.landBasedMovement(),
                    maximumMovementCost:
                        movementActionPoints *
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
        battleSquaddie,
        squaddieTemplate,
        destination,
        battleActionDecisionStep,
        missionMap,
        battleState,
        campaignResources,
        objectRepository,
    }: {
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        destination: HexCoordinate
        battleActionDecisionStep: BattleActionDecisionStep
        missionMap: MissionMap
        campaignResources: CampaignResources
        battleState: BattleState
        objectRepository: ObjectRepository
    }) => {
        BattleSquaddieSelectorService.createSearchPathAndHighlightMovementPath({
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate: destination,
            missionMap,
            objectRepository,
            campaignResources,
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
