import {
    TeamStrategyCalculator,
    TeamStrategyService,
} from "./teamStrategyCalculator"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { TeamStrategyOptions } from "./teamStrategy"
import { SearchResult } from "../../hexMap/pathfinder/searchResults/searchResult"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
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
import { SearchResultAdapterService } from "../../hexMap/pathfinder/searchResults/searchResultAdapter"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../search/searchPathAdapter/searchPathAdapter"
import { MapSearchService } from "../../hexMap/pathfinder/pathGeneration/mapSearch"
import { SearchLimitService } from "../../hexMap/pathfinder/pathGeneration/searchLimit"
import { HexGridService } from "../../hexMap/hexGridDirection"

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
        let battleSquaddieIdToAct = getBattleSquaddieIdToAct({
            gameEngineState: gameEngineState,
            team: team,
        })

        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined
        }
        const {
            battleSquaddie,
            squaddieTemplate,
            mapCoordinate,
            actionPointsRemaining,
            movementPerActionThisRound,
        } = getMovementInformationAboutBattleSquaddie({
            gameEngineState: gameEngineState,
            battleSquaddieIdToAct: battleSquaddieIdToAct,
        })

        const possibleMovementsForThisSquaddie: SearchResult =
            getPossibleMovementsForThisSquaddie({
                mapCoordinate,
                squaddieTemplate,
                battleSquaddie,
                movementPerActionThisRound,
                actionPointsRemaining,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
            })

        const closestSquaddieInfo = getClosestSquaddieAndLocationToFollow({
            actor: {
                mapCoordinate,
                battleSquaddieId: battleSquaddieIdToAct,
                battleSquaddie,
                squaddieTemplate,
                numberOfActions: actionPointsRemaining,
                movementPerAction: movementPerActionThisRound,
                possibleMovementsForThisSquaddie:
                    possibleMovementsForThisSquaddie,
            },
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            desiredBattleSquaddieId: this.desiredBattleSquaddieId,
            desiredAffiliation: this.desiredAffiliation,
            objectRepository: gameEngineState.repository,
        })

        if (closestSquaddieInfo === undefined) {
            return undefined
        }

        const { shortestRoute, distanceFromActor } = closestSquaddieInfo
        if (distanceFromActor < 2) {
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
            targetCoordinate: SearchPathAdapterService.getHead(shortestRoute),
        })

        return [movementStep]
    }
}

const getClosestSquaddieAndLocationToFollow = ({
    missionMap,
    desiredBattleSquaddieId,
    desiredAffiliation,
    objectRepository,
    actor,
}: {
    actor: {
        mapCoordinate: HexCoordinate
        battleSquaddieId: string
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        numberOfActions: number
        movementPerAction: number
        possibleMovementsForThisSquaddie: SearchResult
    }
    missionMap: MissionMap
    objectRepository: ObjectRepository
    desiredBattleSquaddieId?: string
    desiredAffiliation?: SquaddieAffiliation
}): {
    distanceFromActor: number
    shortestRoute: SearchPathAdapter
} => {
    const desiredBattleSquaddies = selectDesiredBattleSquaddies(
        objectRepository,
        actor.battleSquaddieId,
        desiredBattleSquaddieId,
        desiredAffiliation
    )

    const maximumDistanceToConsider: number =
        actor.movementPerAction > 0 && actor.numberOfActions > 0
            ? actor.movementPerAction * actor.numberOfActions
            : TerrainTileMapService.getDimensions(missionMap.terrainTileMap)
                  .numberOfRows +
              TerrainTileMapService.getDimensions(missionMap.terrainTileMap)
                  .widthOfWidestRow

    const squaddieToFollowAndRoute: {
        distanceFromActor: number
        shortestRoute: SearchPathAdapter
    } = desiredBattleSquaddies.reduce(
        (currentDistanceAndRoute, targetBattleSquaddieInfo) => {
            if (currentDistanceAndRoute.shortestRoute) {
                return currentDistanceAndRoute
            }

            const closestRoute =
                getClosestRouteToThisSquaddieThatSpendsTheLeastNumberOfActionPoints(
                    {
                        missionMap: missionMap,
                        targetBattleSquaddieId:
                            targetBattleSquaddieInfo.battleSquaddieId,
                        maximumDistanceToConsider: maximumDistanceToConsider,
                        actor: actor,
                    }
                )

            return closestRoute ?? currentDistanceAndRoute
        },
        {
            distanceFromActor: undefined,
            shortestRoute: undefined,
        }
    )

    if (squaddieToFollowAndRoute.shortestRoute) return squaddieToFollowAndRoute
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

            const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    repository,
                    battleSquaddieIter.battleSquaddieId
                )
            )

            if (
                !SquaddieService.isSquaddieAlive({
                    squaddieTemplate,
                    battleSquaddie,
                })
            )
                return false

            if (
                desiredBattleSquaddieId &&
                desiredBattleSquaddieId === battleSquaddieIter.battleSquaddieId
            ) {
                return true
            }

            return (
                desiredAffiliation &&
                squaddieTemplate.squaddieId.affiliation === desiredAffiliation
            )
        }
    )

const getPossibleMovementsForThisSquaddie = ({
    mapCoordinate,
    battleSquaddie,
    squaddieTemplate,
    movementPerActionThisRound,
    actionPointsRemaining,
    missionMap,
    objectRepository,
}: {
    mapCoordinate: HexCoordinate
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
    movementPerActionThisRound: number
    actionPointsRemaining: number
    missionMap: MissionMap
    objectRepository: ObjectRepository
}) =>
    MapSearchService.calculateAllPossiblePathsFromStartingCoordinate({
        missionMap,
        objectRepository,
        startCoordinate: mapCoordinate,
        searchLimit: SearchLimitService.new({
            baseSearchLimit: SearchLimitService.landBasedMovement(),
            maximumMovementCost:
                movementPerActionThisRound * actionPointsRemaining,
            squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
            ignoreTerrainCost: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.ignoreTerrainCost,
            crossOverPits: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.crossOverPits,
            passThroughWalls: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.passThroughWalls,
        }),
    })

const getPathsThatLeadToDistanceFromLocation = (
    targetMapCoordinate: HexCoordinate,
    radiusFromTargetMapCoordinate: number,
    actor: {
        numberOfActions: number
        movementPerAction: number
        possibleMovementsForThisSquaddie: SearchResult
    }
) =>
    HexGridService.GetCoordinatesForRingAroundCoordinate(
        targetMapCoordinate,
        radiusFromTargetMapCoordinate
    )
        .map((potentialStopLocation) =>
            SearchResultAdapterService.getShortestPathToCoordinate({
                searchResults: actor.possibleMovementsForThisSquaddie,
                mapCoordinate: potentialStopLocation,
            })
        )
        .filter((x) => x)
        .filter(
            (path) =>
                SearchPathAdapterService.getNumberOfMoveActions({
                    path,
                    movementPerAction: actor.movementPerAction,
                }) <= actor.numberOfActions
        )
        .sort((a, b) => {
            const numberOfMoveActionsA =
                SearchPathAdapterService.getNumberOfMoveActions({
                    path: a,
                    movementPerAction: actor.movementPerAction,
                })
            const numberOfMoveActionsB =
                SearchPathAdapterService.getNumberOfMoveActions({
                    path: b,
                    movementPerAction: actor.movementPerAction,
                })
            switch (true) {
                case numberOfMoveActionsA < numberOfMoveActionsB:
                    return -1
                case numberOfMoveActionsA > numberOfMoveActionsB:
                    return 1
                default:
                    return 0
            }
        })

const getPathWithLeastNumberOfMoveActionsAtRadiusFromTheTarget = ({
    targetMapCoordinate,
    radiusFromTargetMapCoordinate,
    actor,
}: {
    targetMapCoordinate: HexCoordinate
    radiusFromTargetMapCoordinate: number
    actor: {
        numberOfActions: number
        movementPerAction: number
        possibleMovementsForThisSquaddie: SearchResult
    }
}) => {
    const candidatePaths = getPathsThatLeadToDistanceFromLocation(
        targetMapCoordinate,
        radiusFromTargetMapCoordinate,
        actor
    )
    if (candidatePaths.length < 1) return undefined

    return {
        shortestRoute: candidatePaths[0],
        distanceFromActor: SearchPathAdapterService.getNumberOfCoordinates(
            candidatePaths[0]
        ),
    }
}

const getBattleSquaddieIdToAct = ({
    gameEngineState,
    team,
}: {
    gameEngineState: GameEngineState
    team: BattleSquaddieTeam
}) => {
    const previousActionsThisTurn =
        BattleActionRecorderService.peekAtAlreadyAnimatedQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )

    return TeamStrategyService.getCurrentlyActingSquaddieWhoCanAct({
        team,
        battleSquaddieId: previousActionsThisTurn?.actor.actorBattleSquaddieId,
        objectRepository: gameEngineState.repository,
    })
}

const getMovementInformationAboutBattleSquaddie = ({
    gameEngineState,
    battleSquaddieIdToAct,
}: {
    gameEngineState: GameEngineState
    battleSquaddieIdToAct: string
}) => {
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
    const { unallocatedActionPoints } = SquaddieService.getNumberOfActionPoints(
        {
            squaddieTemplate,
            battleSquaddie,
        }
    )
    const movementPerActionThisRound =
        SquaddieService.getSquaddieMovementAttributes({
            battleSquaddie,
            squaddieTemplate,
        }).net.movementPerAction
    return {
        battleSquaddie,
        squaddieTemplate,
        mapCoordinate,
        actionPointsRemaining: unallocatedActionPoints,
        movementPerActionThisRound,
    }
}

const getClosestRouteToThisSquaddieThatSpendsTheLeastNumberOfActionPoints = ({
    missionMap,
    targetBattleSquaddieId,
    maximumDistanceToConsider,
    actor,
}: {
    missionMap: MissionMap
    targetBattleSquaddieId: string
    maximumDistanceToConsider: number
    actor: {
        numberOfActions: number
        movementPerAction: number
        possibleMovementsForThisSquaddie: SearchResult
    }
}) => {
    const { mapCoordinate: targetMapCoordinate } =
        MissionMapService.getByBattleSquaddieId(
            missionMap,
            targetBattleSquaddieId
        )
    if (targetMapCoordinate == undefined) return undefined

    const potentialAnswer = Array.from(
        new Array(maximumDistanceToConsider),
        (_, i) => i
    ).reduce(
        (
            squaddieToFollowAndRouteAtThisRadius,
            radiusFromTargetMapCoordinate
        ) => {
            if (squaddieToFollowAndRouteAtThisRadius.shortestRoute)
                return squaddieToFollowAndRouteAtThisRadius

            const pathInfo =
                getPathWithLeastNumberOfMoveActionsAtRadiusFromTheTarget({
                    targetMapCoordinate: targetMapCoordinate,
                    radiusFromTargetMapCoordinate:
                        radiusFromTargetMapCoordinate,
                    actor: actor,
                })

            return pathInfo ?? squaddieToFollowAndRouteAtThisRadius
        },
        {
            distanceFromActor: undefined,
            shortestRoute: undefined,
        }
    )

    if (potentialAnswer.shortestRoute) return potentialAnswer
    return undefined
}
