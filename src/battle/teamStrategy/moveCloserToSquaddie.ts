import {
    TeamStrategyCalculator,
    TeamStrategyService,
} from "./teamStrategyCalculator"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParams"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    GetTargetingShapeGenerator,
    TargetingShape,
} from "../targeting/targetingShapeGenerator"
import { GetNumberOfActionPoints } from "../../squaddie/squaddieService"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { TeamStrategyOptions } from "./teamStrategy"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { MissionMapSquaddieLocation } from "../../missionMap/squaddieLocation"
import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { BattleSquaddie } from "../battleSquaddie"
import { ActionsThisRound } from "../history/actionsThisRound"
import { isValidValue } from "../../utils/validityCheck"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"

export class MoveCloserToSquaddie implements TeamStrategyCalculator {
    desiredBattleSquaddieId: string
    desiredAffiliation: SquaddieAffiliation

    constructor(options: TeamStrategyOptions) {
        this.desiredBattleSquaddieId = options.desiredBattleSquaddieId
        this.desiredAffiliation = options.desiredAffiliation
    }

    DetermineNextInstruction({
        team,
        missionMap,
        repository,
        actionsThisRound,
    }: {
        team: BattleSquaddieTeam
        missionMap: MissionMap
        repository: ObjectRepository
        actionsThisRound?: ActionsThisRound
    }): BattleActionDecisionStep[] {
        if (!this.desiredBattleSquaddieId && !this.desiredAffiliation) {
            throw new Error("Move Closer to Squaddie strategy has no target")
        }

        let battleSquaddieIdToAct =
            TeamStrategyService.getCurrentlyActingSquaddieWhoCanAct(
                team,
                actionsThisRound,
                repository
            )
        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined
        }
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieIdToAct
            )
        )

        const { mapLocation } = MissionMapService.getByBattleSquaddieId(
            missionMap,
            battleSquaddieIdToAct
        )
        const { actionPointsRemaining } = GetNumberOfActionPoints({
            squaddieTemplate,
            battleSquaddie,
        })
        const movementPerActionThisRound =
            squaddieTemplate.attributes.movement.movementPerAction

        const routesToAllSquaddies: SearchResult = getAllPossibleMovements({
            mapLocation,
            squaddieTemplate,
            movementPerActionThisRound,
            actionPointsRemaining,
            missionMap,
            repository,
        })

        const closestSquaddieInfo = getClosestSquaddieAndLocationToFollow({
            missionMap,
            routesToAllSquaddies: routesToAllSquaddies,
            desiredBattleSquaddieId: this.desiredBattleSquaddieId,
            desiredAffiliation: this.desiredAffiliation,
            repository,
            actingSquaddieBattleId: battleSquaddieIdToAct,
            numberOfActions: actionPointsRemaining,
            movementPerAction: movementPerActionThisRound,
        })

        if (closestSquaddieInfo === undefined) {
            return undefined
        }

        const { shortestRoute, distance } = closestSquaddieInfo
        if (distance < 2) {
            return undefined
        }

        const movementStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: movementStep,
            battleSquaddieId: battleSquaddieIdToAct,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: movementStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: movementStep,
            targetLocation: shortestRoute.destination,
        })

        return [movementStep]
    }
}

const getClosestSquaddieAndLocationToFollow = ({
    missionMap,
    routesToAllSquaddies,
    desiredBattleSquaddieId,
    desiredAffiliation,
    repository,
    actingSquaddieBattleId,
    numberOfActions,
    movementPerAction,
}: {
    missionMap: MissionMap
    routesToAllSquaddies: SearchResult
    repository: ObjectRepository
    actingSquaddieBattleId: string
    numberOfActions: number
    movementPerAction: number
    desiredBattleSquaddieId?: string
    desiredAffiliation?: SquaddieAffiliation
}): {
    battleSquaddieId: string
    distance: number
    location: HexCoordinate
    shortestRoute: SearchPath
} => {
    const desiredBattleSquaddies = selectDesiredBattleSquaddies(
        repository,
        actingSquaddieBattleId,
        desiredBattleSquaddieId,
        desiredAffiliation
    )

    const { mapLocation: actorLocation } = missionMap.getSquaddieByBattleId(
        actingSquaddieBattleId
    )
    const { squaddieTemplate: actorSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            repository,
            actingSquaddieBattleId
        )
    )
    const maximumDistanceToConsider: number =
        movementPerAction > 0 && numberOfActions > 0
            ? movementPerAction * numberOfActions
            : TerrainTileMapService.getDimensions(missionMap.terrainTileMap)
                  .numberOfRows +
              TerrainTileMapService.getDimensions(missionMap.terrainTileMap)
                  .widthOfWidestRow

    function getShortestRoutesThatLeadToSquaddie(
        closestReachableLocationsFromTheCandidate: HexCoordinate[],
        candidateToChase: {
            battleSquaddieId: string
            battleSquaddie: BattleSquaddie
        },
        distanceFromActor: number,
        candidateLocation: HexCoordinate
    ): {
        battleSquaddieId: string
        distance: number
        location: HexCoordinate
        shortestRoute: SearchPath
    }[] {
        const routesThatEndCloseToCandidate: SearchResult =
            PathfinderService.search({
                searchParameters: SearchParametersService.new({
                    startLocations: [actorLocation],
                    squaddieAffiliation:
                        actorSquaddieTemplate.squaddieId.affiliation,
                    movementPerAction: movementPerAction,
                    canPassOverPits:
                        actorSquaddieTemplate.attributes.movement.crossOverPits,
                    canPassThroughWalls:
                        actorSquaddieTemplate.attributes.movement
                            .passThroughWalls,
                    shapeGenerator: getResultOrThrowError(
                        GetTargetingShapeGenerator(TargetingShape.SNAKE)
                    ),
                    canStopOnSquaddies: false,
                    numberOfActions: numberOfActions,
                    stopLocations: closestReachableLocationsFromTheCandidate,
                }),
                missionMap,
                repository,
            })

        return routesThatEndCloseToCandidate.stopLocationsReached
            .map((locationFromCandidate) => {
                const path = SearchResultsService.getShortestPathToLocation(
                    routesThatEndCloseToCandidate,
                    locationFromCandidate.q,
                    locationFromCandidate.r
                )
                if (
                    numberOfActions === undefined ||
                    path.currentNumberOfMoveActions < numberOfActions
                ) {
                    return {
                        battleSquaddieId: candidateToChase.battleSquaddieId,
                        distance: distanceFromActor,
                        location: candidateLocation,
                        shortestRoute: path,
                    }
                }
                return undefined
            })
            .filter((x) => x != undefined)
    }

    for (
        let distanceFromActor = 0;
        distanceFromActor < maximumDistanceToConsider;
        distanceFromActor++
    ) {
        const closestReachableLocationsFromTheActor: HexCoordinate[] =
            SearchResultsService.getClosestRoutesToLocationByDistance(
                routesToAllSquaddies,
                actorLocation,
                distanceFromActor
            )
        const closestSquaddies = getClosestSquaddiesToActor(
            desiredBattleSquaddies,
            missionMap,
            closestReachableLocationsFromTheActor
        )
        if (closestSquaddies.length < 1) {
            continue
        }

        const candidateToChase =
            closestSquaddies[
                Math.floor(Math.random() * closestSquaddies.length)
            ]
        const { mapLocation: candidateLocation }: MissionMapSquaddieLocation =
            missionMap.getSquaddieByBattleId(candidateToChase.battleSquaddieId)

        for (
            let distanceFromCandidate = 0;
            distanceFromCandidate < maximumDistanceToConsider;
            distanceFromCandidate++
        ) {
            const closestReachableLocationsFromTheCandidate: HexCoordinate[] =
                SearchResultsService.getClosestRoutesToLocationByDistance(
                    routesToAllSquaddies,
                    candidateLocation,
                    distanceFromCandidate
                )
            const shortestRoutesThatLeadToSquaddieAndInfo =
                getShortestRoutesThatLeadToSquaddie(
                    closestReachableLocationsFromTheCandidate,
                    candidateToChase,
                    distanceFromActor,
                    candidateLocation
                )
            if (shortestRoutesThatLeadToSquaddieAndInfo.length > 0) {
                return shortestRoutesThatLeadToSquaddieAndInfo.find(
                    (route) =>
                        route.shortestRoute.currentNumberOfMoveActions !== 0
                )
            }
        }
    }

    return undefined
}

const selectDesiredBattleSquaddies = (
    repository: ObjectRepository,
    actingSquaddieBattleId: string,
    desiredBattleSquaddieId: string,
    desiredAffiliation: SquaddieAffiliation
) =>
    ObjectRepositoryService.getBattleSquaddieIterator(repository).filter(
        (battleSquaddieIter) => {
            if (
                battleSquaddieIter.battleSquaddieId === actingSquaddieBattleId
            ) {
                return false
            }

            if (
                desiredBattleSquaddieId &&
                desiredBattleSquaddieId === battleSquaddieIter.battleSquaddieId
            ) {
                return true
            }

            const { squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    repository,
                    battleSquaddieIter.battleSquaddieId
                )
            )

            return (
                desiredAffiliation &&
                squaddieTemplate.squaddieId.affiliation === desiredAffiliation
            )
        }
    )

const getClosestSquaddiesToActor = (
    desiredBattleSquaddies: {
        battleSquaddieId: string
        battleSquaddie: BattleSquaddie
    }[],
    missionMap: MissionMap,
    closestReachableLocations: HexCoordinate[]
) =>
    desiredBattleSquaddies.filter((battleSquaddieIter) => {
        const { mapLocation: location } = missionMap.getSquaddieByBattleId(
            battleSquaddieIter.battleSquaddieId
        )
        if (location === undefined) {
            return false
        }
        return closestReachableLocations.some(
            (closestReachableLocation) =>
                closestReachableLocation.q === location.q &&
                closestReachableLocation.r === location.r
        )
    })

const getAllPossibleMovements = ({
    mapLocation,
    squaddieTemplate,
    movementPerActionThisRound,
    actionPointsRemaining,
    missionMap,
    repository,
}: {
    mapLocation: HexCoordinate
    squaddieTemplate: SquaddieTemplate
    movementPerActionThisRound: number
    actionPointsRemaining: number
    missionMap: MissionMap
    repository: ObjectRepository
}) => {
    return PathfinderService.search({
        searchParameters: SearchParametersService.new({
            startLocations: [mapLocation],
            squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
            movementPerAction: movementPerActionThisRound,
            canPassOverPits: squaddieTemplate.attributes.movement.crossOverPits,
            canPassThroughWalls:
                squaddieTemplate.attributes.movement.passThroughWalls,
            shapeGenerator: getResultOrThrowError(
                GetTargetingShapeGenerator(TargetingShape.SNAKE)
            ),
            canStopOnSquaddies: true,
            ignoreTerrainCost: false,
            numberOfActions: actionPointsRemaining,
        }),
        missionMap,
        repository,
    })
}
