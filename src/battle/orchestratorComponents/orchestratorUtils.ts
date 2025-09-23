import { getResultOrThrowError } from "../../utils/resultOrError"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { MissionMapSquaddieCoordinateService } from "../../missionMap/squaddieCoordinate"
import { MapHighlightService } from "../animation/mapHighlight"
import { isValidValue } from "../../utils/objectValidityCheck"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattlePhase } from "./battlePhaseTracker"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieTurnService } from "../../squaddie/turn"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
    TMapGraphicsLayerType,
} from "../../hexMap/mapLayer/mapGraphicsLayer"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../history/battleAction/battleActionRecorder"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { SearchResultsCache } from "../../hexMap/pathfinder/searchResults/searchResultsCache"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export const OrchestratorUtilities = {
    isSquaddieCurrentlyTakingATurn: ({
        battleActionDecisionStep,
        battleActionRecorder,
    }: {
        battleActionDecisionStep: BattleActionDecisionStep
        battleActionRecorder: BattleActionRecorder
    }): boolean => {
        return isSquaddieCurrentlyTakingATurn({
            battleActionDecisionStep,
            battleActionRecorder,
        })
    },
    canTheCurrentSquaddieAct: (gameEngineState: GameEngineState): boolean => {
        return canTheCurrentSquaddieAct(gameEngineState)
    },
    highlightSquaddieRange: ({
        battleSquaddieToHighlightId,
        missionMap,
        objectRepository,
        squaddieAllMovementCache,
    }: {
        battleSquaddieToHighlightId: string
        missionMap: MissionMap
        objectRepository: ObjectRepository
        squaddieAllMovementCache: SearchResultsCache
    }) =>
        highlightSquaddieRange({
            battleSquaddieToHighlightId: battleSquaddieToHighlightId,
            missionMap: missionMap,
            objectRepository: objectRepository,
            squaddieAllMovementCache,
        }),
    getSquaddieAtMapCoordinate: ({
        mapCoordinate,
        squaddieRepository,
        map,
    }: {
        mapCoordinate: HexCoordinate
        squaddieRepository: ObjectRepository
        map: MissionMap
    }) => {
        return getSquaddieAtMapCoordinate({
            mapCoordinate,
            squaddieRepository,
            map,
        })
    },
    generateMessagesIfThePlayerCanActWithANewSquaddie: (
        gameEngineState: GameEngineState
    ) => {
        if (
            !isValidValue(
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState
            )
        ) {
            return
        }

        if (
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation !== BattlePhase.PLAYER
        ) {
            return
        }

        const repository = gameEngineState.repository
        if (repository == undefined) {
            return
        }

        if (
            isSquaddieCurrentlyTakingATurn({
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
            })
        ) {
            return
        }

        const didFindAnotherPlayerSquaddieToControl =
            ObjectRepositoryService.getBattleSquaddieIterator(repository).some(
                (battleSquaddieInfo) => {
                    const { battleSquaddieId } = battleSquaddieInfo
                    const { battleSquaddie, squaddieTemplate } =
                        getResultOrThrowError(
                            ObjectRepositoryService.getSquaddieByBattleId(
                                repository,
                                battleSquaddieId
                            )
                        )
                    const { playerCanControlThisSquaddieRightNow } =
                        SquaddieService.canPlayerControlSquaddieRightNow({
                            squaddieTemplate,
                            battleSquaddie,
                        })

                    const datum = MissionMapService.getByBattleSquaddieId(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                        battleSquaddieId
                    )
                    const squaddieIsOnTheMap: boolean =
                        MissionMapSquaddieCoordinateService.isValid(datum) &&
                        TerrainTileMapService.isCoordinateOnMap(
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap.terrainTileMap,
                            datum.currentMapCoordinate
                        )

                    return (
                        playerCanControlThisSquaddieRightNow &&
                        squaddieIsOnTheMap
                    )
                }
            )

        if (!didFindAnotherPlayerSquaddieToControl) {
            return
        }

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE,
            gameEngineState,
        })
    },
    getBattleSquaddieIdCurrentlyTakingATurn: ({
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
    }): string | undefined =>
        getBattleSquaddieIdCurrentlyTakingATurn({ gameEngineState }),
    messageAndHighlightPlayableSquaddieTakingATurn: ({
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
    }) => messageAndHighlightPlayableSquaddieTakingATurn({ gameEngineState }),
}

const canTheCurrentSquaddieAct = (gameEngineState: GameEngineState) => {
    if (gameEngineState.repository == undefined) return false
    const battleSquaddieIdCurrentlyTakingATurn =
        getBattleSquaddieIdCurrentlyTakingATurn({ gameEngineState })
    if (battleSquaddieIdCurrentlyTakingATurn == undefined) return false
    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieIdCurrentlyTakingATurn
        )
    )

    const { canAct } = SquaddieService.canSquaddieActRightNow({
        squaddieTemplate: squaddieTemplate,
        battleSquaddie: battleSquaddie,
    })

    return canAct
}

const isSquaddieCurrentlyTakingATurn = ({
    battleActionDecisionStep,
    battleActionRecorder,
}: {
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
}): boolean => {
    if (
        BattleActionDecisionStepService.isActorSet(battleActionDecisionStep) &&
        BattleActionDecisionStepService.isActionSet(battleActionDecisionStep) &&
        BattleActionDecisionStepService.isTargetConsidered(
            battleActionDecisionStep
        )
    ) {
        return true
    }

    if (
        !BattleActionRecorderService.isAnimationQueueEmpty(battleActionRecorder)
    ) {
        return true
    }

    return !BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
        battleActionRecorder
    )
}

const messageAndHighlightPlayableSquaddieTakingATurn = ({
    gameEngineState,
}: {
    gameEngineState: GameEngineState
}) => {
    const currentlyActingBattleSquaddieId =
        getBattleSquaddieIdCurrentlyTakingATurn({ gameEngineState })
    if (
        !isValidValue(currentlyActingBattleSquaddieId) ||
        currentlyActingBattleSquaddieId === ""
    ) {
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            undefined
        return
    }

    if (gameEngineState.repository == undefined) return
    if (currentlyActingBattleSquaddieId == undefined) return

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            currentlyActingBattleSquaddieId
        )
    )

    const { playerCanControlThisSquaddieRightNow } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })

    if (!playerCanControlThisSquaddieRightNow) {
        return
    }

    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION,
        objectRepository: gameEngineState.repository,
        battleSquaddieId: BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )?.battleSquaddieId,
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        playerCommandState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.playerCommandState,
        campaignResources: gameEngineState.campaign.resources,
        squaddieAllMovementCache:
            gameEngineState.battleOrchestratorState.cache.searchResultsCache,
    })

    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
        gameEngineState: gameEngineState,
        battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
    })
}

const getSquaddieAtMapCoordinate = (param: {
    mapCoordinate: HexCoordinate
    squaddieRepository: ObjectRepository
    map: MissionMap
}): {
    squaddieTemplate: SquaddieTemplate | undefined
    battleSquaddie: BattleSquaddie | undefined
    squaddieMapCoordinate: HexCoordinate | undefined
} => {
    const { mapCoordinate, squaddieRepository, map } = param

    const squaddieAndLocationIdentifier =
        MissionMapService.getBattleSquaddieAtCoordinate(map, mapCoordinate)

    if (
        !MissionMapSquaddieCoordinateService.isValid(
            squaddieAndLocationIdentifier
        ) ||
        squaddieAndLocationIdentifier.battleSquaddieId == undefined
    ) {
        return {
            squaddieTemplate: undefined,
            battleSquaddie: undefined,
            squaddieMapCoordinate: undefined,
        }
    }

    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            squaddieRepository,
            squaddieAndLocationIdentifier.battleSquaddieId
        )
    )

    return {
        squaddieTemplate,
        battleSquaddie,
        squaddieMapCoordinate:
            squaddieAndLocationIdentifier.currentMapCoordinate,
    }
}

const highlightSquaddieRange = ({
    battleSquaddieToHighlightId,
    missionMap,
    objectRepository,
    squaddieAllMovementCache,
}: {
    battleSquaddieToHighlightId: string
    missionMap: MissionMap
    objectRepository: ObjectRepository
    squaddieAllMovementCache: SearchResultsCache
}) => {
    const { currentMapCoordinate, originMapCoordinate } =
        MissionMapService.getByBattleSquaddieId(
            missionMap,
            battleSquaddieToHighlightId
        )

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieToHighlightId
        )
    )

    const squaddieReachHighlightedOnMap =
        MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
            repository: objectRepository,
            missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            originMapCoordinate,
            currentMapCoordinate,
            squaddieTurnOverride:
                squaddieTemplate.squaddieId.affiliation ===
                SquaddieAffiliation.PLAYER
                    ? undefined
                    : SquaddieTurnService.new(),
            squaddieAllMovementCache,
        })

    const { squaddieIsNormallyControllableByPlayer } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })

    const layerType: TMapGraphicsLayerType =
        squaddieIsNormallyControllableByPlayer
            ? MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE
            : MapGraphicsLayerType.CLICKED_ON_NORMALLY_UNCONTROLLABLE_SQUADDIE

    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: battleSquaddieToHighlightId,
        highlightedTileDescriptions: squaddieReachHighlightedOnMap,
        type: layerType,
    })
    TerrainTileMapService.addGraphicsLayer(
        missionMap.terrainTileMap,
        actionRangeOnMap
    )
}

const getBattleSquaddieIdCurrentlyTakingATurn = ({
    gameEngineState,
}: {
    gameEngineState: GameEngineState
}): string | undefined => {
    switch (true) {
        case !isSquaddieCurrentlyTakingATurn({
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleActionRecorder:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
        }):
            return undefined
        case BattleActionDecisionStepService.isActorSet(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ):
            return BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )?.battleSquaddieId
        case !BattleActionRecorderService.isAnimationQueueEmpty(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        ):
            return BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )?.actor?.actorBattleSquaddieId
        case !BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        ):
            return BattleActionRecorderService.peekAtAlreadyAnimatedQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )?.actor?.actorBattleSquaddieId
        default:
            return undefined
    }
}
