import {
    TeamStrategyCalculator,
    TeamStrategyService,
} from "./teamStrategyCalculator"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParameters"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
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
import { isValidValue } from "../../utils/validityCheck"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { SquaddieService } from "../../squaddie/squaddieService"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"

export class MoveCloserToSquaddie implements TeamStrategyCalculator {
    desiredBattleSquaddieId: string
    desiredAffiliation: SquaddieAffiliation

    constructor(options: TeamStrategyOptions) {
        this.desiredBattleSquaddieId = options.desiredBattleSquaddieId
        this.desiredAffiliation = options.desiredAffiliation
    }

    DetermineNextInstruction({
        team,
        gameEngineState,
    }: {
        team: BattleSquaddieTeam
        gameEngineState: GameEngineState
    }): BattleActionDecisionStep[] {
        if (!this.desiredBattleSquaddieId && !this.desiredAffiliation) {
            throw new Error("Move Closer to Squaddie strategy has no target")
        }

        const previousActionsThisTurn =
            BattleActionRecorderService.peekAtAlreadyAnimatedQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        let battleSquaddieIdToAct =
            TeamStrategyService.getCurrentlyActingSquaddieWhoCanAct({
                team,
                battleSquaddieId:
                    previousActionsThisTurn?.actor.actorBattleSquaddieId,
                objectRepository: gameEngineState.repository,
            })

        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined
        }
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieIdToAct
            )
        )

        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddieIdToAct
        )
        const { actionPointsRemaining } =
            SquaddieService.getNumberOfActionPoints({
                squaddieTemplate,
                battleSquaddie,
            })
        const movementPerActionThisRound =
            SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.movementPerAction

        const routesToAllSquaddies: SearchResult = getAllPossibleMovements({
            mapCoordinate,
            squaddieTemplate,
            movementPerActionThisRound,
            actionPointsRemaining,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            objectRepository: gameEngineState.repository,
        })

        const closestSquaddieInfo = getClosestSquaddieAndLocationToFollow({
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            routesToAllSquaddies: routesToAllSquaddies,
            desiredBattleSquaddieId: this.desiredBattleSquaddieId,
            desiredAffiliation: this.desiredAffiliation,
            objectRepository: gameEngineState.repository,
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
    objectRepository,
    actingSquaddieBattleId,
    numberOfActions,
    movementPerAction,
}: {
    missionMap: MissionMap
    routesToAllSquaddies: SearchResult
    objectRepository: ObjectRepository
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
        objectRepository,
        actingSquaddieBattleId,
        desiredBattleSquaddieId,
        desiredAffiliation
    )

    const { mapCoordinate: actorLocation } =
        MissionMapService.getByBattleSquaddieId(
            missionMap,
            actingSquaddieBattleId
        )
    const {
        squaddieTemplate: actorSquaddieTemplate,
        battleSquaddie: actorBattleSquaddie,
    } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
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

    const getShortestRoutesThatLeadToSquaddie = (
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
    }[] => {
        const routesThatEndCloseToCandidate: SearchResult =
            PathfinderService.search({
                searchParameters: SearchParametersService.new({
                    pathGenerators: {
                        startCoordinates: [actorLocation],
                    },
                    pathSizeConstraints: {
                        movementPerAction: movementPerAction,
                        numberOfActions: numberOfActions,
                    },
                    pathContinueConstraints: {
                        squaddieAffiliation: {
                            searchingSquaddieAffiliation:
                                actorSquaddieTemplate.squaddieId.affiliation,
                        },
                        canPassOverPits:
                            SquaddieService.getSquaddieMovementAttributes({
                                battleSquaddie: actorBattleSquaddie,
                                squaddieTemplate: actorSquaddieTemplate,
                            }).net.crossOverPits,
                        canPassThroughWalls:
                            SquaddieService.getSquaddieMovementAttributes({
                                battleSquaddie: actorBattleSquaddie,
                                squaddieTemplate: actorSquaddieTemplate,
                            }).net.passThroughWalls,
                    },
                    pathStopConstraints: {
                        canStopOnSquaddies: false,
                    },
                    goal: {
                        stopCoordinates:
                            closestReachableLocationsFromTheCandidate,
                    },
                }),
                missionMap,
                objectRepository: objectRepository,
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
        const { mapCoordinate: candidateLocation }: MissionMapSquaddieLocation =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
                candidateToChase.battleSquaddieId
            )

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
        const { mapCoordinate: location } =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
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
    mapCoordinate,
    squaddieTemplate,
    movementPerActionThisRound,
    actionPointsRemaining,
    missionMap,
    objectRepository,
}: {
    mapCoordinate: HexCoordinate
    squaddieTemplate: SquaddieTemplate
    movementPerActionThisRound: number
    actionPointsRemaining: number
    missionMap: MissionMap
    objectRepository: ObjectRepository
}) => {
    return PathfinderService.search({
        searchParameters: SearchParametersService.new({
            pathGenerators: {
                startCoordinates: [mapCoordinate],
            },
            pathSizeConstraints: {
                movementPerAction: movementPerActionThisRound,
                numberOfActions: actionPointsRemaining,
            },
            pathContinueConstraints: {
                squaddieAffiliation: {
                    searchingSquaddieAffiliation:
                        squaddieTemplate.squaddieId.affiliation,
                },
                canPassOverPits:
                    squaddieTemplate.attributes.movement.crossOverPits,
                canPassThroughWalls:
                    squaddieTemplate.attributes.movement.passThroughWalls,
                ignoreTerrainCost: false,
            },
            pathStopConstraints: {
                canStopOnSquaddies: true,
            },
            goal: {},
        }),
        missionMap,
        objectRepository: objectRepository,
    })
}
