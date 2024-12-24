import { getResultOrThrowError } from "../../utils/ResultOrError"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleCamera } from "../battleCamera"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { MissionMapSquaddieCoordinateService } from "../../missionMap/squaddieCoordinate"
import { MapHighlightService } from "../animation/mapHighlight"
import { isValidValue } from "../../utils/validityCheck"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattlePhase } from "./battlePhaseTracker"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieTurnService } from "../../squaddie/turn"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapGraphicsLayer"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"

export const OrchestratorUtilities = {
    isSquaddieCurrentlyTakingATurn: (state: GameEngineState): boolean => {
        return isSquaddieCurrentlyTakingATurn(state)
    },
    canTheCurrentSquaddieAct: (gameEngineState: GameEngineState): boolean => {
        return canTheCurrentSquaddieAct(gameEngineState)
    },
    highlightSquaddieRange: (
        gameEngineState: GameEngineState,
        battleSquaddieId: string
    ) => {
        return highlightSquaddieRange(gameEngineState, battleSquaddieId)
    },
    getSquaddieAtScreenLocation: ({
        mouseX,
        mouseY,
        squaddieRepository,
        camera,
        map,
    }: {
        mouseX: number
        mouseY: number
        squaddieRepository: ObjectRepository
        camera: BattleCamera
        map: MissionMap
    }): {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
        squaddieMapCoordinate: HexCoordinate
    } => {
        return getSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            squaddieRepository,
            camera,
            map,
        })
    },
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

        if (isSquaddieCurrentlyTakingATurn(gameEngineState)) {
            return
        }

        const didFindAnotherPlayerSquaddieToControl =
            ObjectRepositoryService.getBattleSquaddieIterator(
                gameEngineState.repository
            ).some((battleSquaddieInfo) => {
                const { battleSquaddieId } = battleSquaddieInfo
                const { battleSquaddie, squaddieTemplate } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            gameEngineState.repository,
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
                        datum.mapCoordinate
                    )

                return (
                    playerCanControlThisSquaddieRightNow && squaddieIsOnTheMap
                )
            })

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
    }): string => getBattleSquaddieIdCurrentlyTakingATurn({ gameEngineState }),
    messageAndHighlightPlayableSquaddieTakingATurn: ({
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
    }) => messageAndHighlightPlayableSquaddieTakingATurn({ gameEngineState }),
}

const canTheCurrentSquaddieAct = (gameEngineState: GameEngineState) => {
    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            getBattleSquaddieIdCurrentlyTakingATurn({ gameEngineState })
        )
    )

    const { canAct } = SquaddieService.canSquaddieActRightNow({
        squaddieTemplate: squaddieTemplate,
        battleSquaddie: battleSquaddie,
    })

    return canAct
}

const isSquaddieCurrentlyTakingATurn = (
    gameEngineState: GameEngineState
): boolean => {
    if (!isValidValue(gameEngineState)) {
        return false
    }

    if (!isValidValue(gameEngineState.battleOrchestratorState)) {
        return false
    }

    if (!isValidValue(gameEngineState.battleOrchestratorState.battleState)) {
        return false
    }

    if (
        BattleActionDecisionStepService.isActorSet(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ) &&
        BattleActionDecisionStepService.isActionSet(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    ) {
        return true
    }

    if (
        !BattleActionRecorderService.isAnimationQueueEmpty(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
    ) {
        return true
    }

    return !BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
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
        gameEngineState: gameEngineState,
    })

    const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        battleSquaddie.battleSquaddieId
    )

    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
        gameEngineState: gameEngineState,
        battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
        selectionMethod: {
            mapCoordinate,
        },
    })
}

const getSquaddieAtScreenLocation = (param: {
    mouseX: number
    mouseY: number
    squaddieRepository: ObjectRepository
    camera: BattleCamera
    map: MissionMap
}): {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
    squaddieMapCoordinate: HexCoordinate
} => {
    const { mouseX, squaddieRepository, mouseY, camera, map } = param

    const clickedCoordinate =
        ConvertCoordinateService.convertScreenLocationToMapCoordinates({
            screenX: mouseX,
            screenY: mouseY,
            ...camera.getCoordinates(),
        })

    return getSquaddieAtMapCoordinate({
        mapCoordinate: clickedCoordinate,
        squaddieRepository,
        map,
    })
}

const getSquaddieAtMapCoordinate = (param: {
    mapCoordinate: HexCoordinate
    squaddieRepository: ObjectRepository
    map: MissionMap
}): {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
    squaddieMapCoordinate: HexCoordinate
} => {
    const { mapCoordinate, squaddieRepository, map } = param

    const squaddieAndLocationIdentifier =
        MissionMapService.getBattleSquaddieAtCoordinate(map, mapCoordinate)

    if (
        !MissionMapSquaddieCoordinateService.isValid(
            squaddieAndLocationIdentifier
        )
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
        squaddieMapCoordinate: squaddieAndLocationIdentifier.mapCoordinate,
    }
}

const highlightSquaddieRange = (
    gameEngineState: GameEngineState,
    battleSquaddieToHighlightId: string
) => {
    const { mapCoordinate: startLocation } =
        MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddieToHighlightId
        )

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieToHighlightId
        )
    )

    const squaddieReachHighlightedOnMap =
        MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
            repository: gameEngineState.repository,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startCoordinate: startLocation,
            campaignResources: gameEngineState.campaign.resources,
            squaddieTurnOverride:
                squaddieTemplate.squaddieId.affiliation ===
                SquaddieAffiliation.PLAYER
                    ? undefined
                    : SquaddieTurnService.new(),
        })

    const { squaddieIsNormallyControllableByPlayer } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })

    const layerType: MapGraphicsLayerType =
        squaddieIsNormallyControllableByPlayer
            ? MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE
            : MapGraphicsLayerType.CLICKED_ON_NORMALLY_UNCONTROLLABLE_SQUADDIE

    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: battleSquaddieToHighlightId,
        highlightedTileDescriptions: squaddieReachHighlightedOnMap,
        type: layerType,
    })
    TerrainTileMapService.addGraphicsLayer(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap,
        actionRangeOnMap
    )
}

const getBattleSquaddieIdCurrentlyTakingATurn = ({
    gameEngineState,
}: {
    gameEngineState: GameEngineState
}): string => {
    switch (true) {
        case !isSquaddieCurrentlyTakingATurn(gameEngineState):
            return undefined
        case BattleActionDecisionStepService.isActorSet(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ):
            return BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId
        case !BattleActionRecorderService.isAnimationQueueEmpty(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        ):
            return BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            ).actor.actorBattleSquaddieId
        case !BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        ):
            return BattleActionRecorderService.peekAtAlreadyAnimatedQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            ).actor.actorBattleSquaddieId
        default:
            return undefined
    }
}
