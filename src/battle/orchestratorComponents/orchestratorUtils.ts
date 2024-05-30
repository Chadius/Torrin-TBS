import { getResultOrThrowError } from "../../utils/ResultOrError"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleCamera } from "../battleCamera"
import { MissionMap } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { convertScreenCoordinatesToMapCoordinates } from "../../hexMap/convertCoordinates"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { MissionMapSquaddieLocationHandler } from "../../missionMap/squaddieLocation"
import { MapHighlightHelper } from "../animation/mapHighlight"
import { isValidValue } from "../../utils/validityCheck"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattlePhase } from "./battlePhaseTracker"
import { PlayerBattleActionBuilderStateService } from "../actionBuilder/playerBattleActionBuilderState"

export const OrchestratorUtilities = {
    isSquaddieCurrentlyTakingATurn: (state: GameEngineState): boolean => {
        return isSquaddieCurrentlyTakingATurn(state)
    },
    drawSquaddieReachBasedOnSquaddieTurnAndAffiliation: (
        state: GameEngineState
    ) => {
        return drawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state)
    },
    drawOrResetHUDBasedOnSquaddieTurnAndAffiliation: (
        state: GameEngineState
    ) => {
        return drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state)
    },
    canTheCurrentSquaddieAct: (gameEngineState: GameEngineState): boolean => {
        return canTheCurrentSquaddieAct(gameEngineState)
    },
    resetActionBuilderIfActionIsComplete: (
        gameEngineState: GameEngineState
    ): void => {
        if (
            !PlayerBattleActionBuilderStateService.isActionComplete(
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState
            )
        ) {
            return
        }
        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            undefined
    },
    clearActionsThisRoundIfSquaddieCannotAct: (
        gameEngineState: GameEngineState
    ) => {
        if (
            !(
                isValidValue(gameEngineState) &&
                isValidValue(gameEngineState.battleOrchestratorState) &&
                isValidValue(
                    gameEngineState.battleOrchestratorState.battleState
                ) &&
                isValidValue(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                )
            )
        ) {
            return
        }

        if (canTheCurrentSquaddieAct(gameEngineState)) {
            return
        }

        gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
            undefined
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
        squaddieMapLocation: HexCoordinate
    } => {
        return getSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            squaddieRepository,
            camera,
            map,
        })
    },
    getSquaddieAtMapLocation: ({
        mapLocation,
        squaddieRepository,
        map,
    }: {
        mapLocation: HexCoordinate
        squaddieRepository: ObjectRepository
        map: MissionMap
    }) => {
        return getSquaddieAtMapLocation({
            mapLocation,
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

                const datum =
                    gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                        battleSquaddieId
                    )
                const squaddieIsOnTheMap: boolean =
                    MissionMapSquaddieLocationHandler.isValid(datum) &&
                    gameEngineState.battleOrchestratorState.battleState.missionMap.areCoordinatesOnMap(
                        datum.mapLocation
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
}

const canTheCurrentSquaddieAct = (gameEngineState: GameEngineState) => {
    const actionsThisRound =
        gameEngineState.battleOrchestratorState.battleState.actionsThisRound
    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            actionsThisRound.battleSquaddieId
        )
    )

    const { canAct } = SquaddieService.canSquaddieActRightNow({
        squaddieTemplate: squaddieTemplate,
        battleSquaddie: battleSquaddie,
    })

    return canAct
}

const isSquaddieCurrentlyTakingATurn = (state: GameEngineState): boolean => {
    if (!isValidValue(state)) {
        return false
    }

    if (!isValidValue(state.battleOrchestratorState)) {
        return false
    }

    if (!isValidValue(state.battleOrchestratorState.battleState)) {
        return false
    }

    const actionsThisRound =
        state.battleOrchestratorState.battleState.actionsThisRound
    if (!isValidValue(actionsThisRound)) {
        return false
    }

    if (
        !isValidValue(actionsThisRound.battleSquaddieId) ||
        actionsThisRound.battleSquaddieId === ""
    ) {
        return false
    }

    if (actionsThisRound.processedActions.length > 0) {
        return true
    }

    return isValidValue(actionsThisRound.previewedActionTemplateId)
}

const drawOrResetHUDBasedOnSquaddieTurnAndAffiliation = (
    state: GameEngineState
) => {
    if (
        !state.battleOrchestratorState.battleState.actionsThisRound ||
        !isSquaddieCurrentlyTakingATurn(state)
    ) {
        state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.reset()
        return
    }

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            state.repository,
            state.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        )
    )

    const { playerCanControlThisSquaddieRightNow } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })
    if (playerCanControlThisSquaddieRightNow) {
        state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow(
            {
                battleId:
                    state.battleOrchestratorState.battleState.actionsThisRound
                        .battleSquaddieId,
                state,
            }
        )
    } else {
        state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.reset()
    }
}

const drawSquaddieReachBasedOnSquaddieTurnAndAffiliation = (
    state: GameEngineState
) => {
    if (
        !state.battleOrchestratorState.battleState.actionsThisRound ||
        isSquaddieCurrentlyTakingATurn(state)
    ) {
        return
    }

    const currentlyActingBattleSquaddieId =
        state.battleOrchestratorState.battleState.actionsThisRound
            .battleSquaddieId
    if (
        !isValidValue(currentlyActingBattleSquaddieId) ||
        currentlyActingBattleSquaddieId === ""
    ) {
        return
    }

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            state.repository,
            state.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        )
    )

    const { playerCanControlThisSquaddieRightNow } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })
    if (playerCanControlThisSquaddieRightNow) {
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()

        const { mapLocation: startLocation } =
            state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                battleSquaddie.battleSquaddieId
            )
        const squaddieReachHighlightedOnMap =
            MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                repository: state.repository,
                missionMap:
                    state.battleOrchestratorState.battleState.missionMap,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                startLocation: startLocation,
                campaignResources: state.campaign.resources,
            })

        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles(
            squaddieReachHighlightedOnMap
        )
    }
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
    squaddieMapLocation: HexCoordinate
} => {
    const { mouseX, squaddieRepository, mouseY, camera, map } = param

    const coords = convertScreenCoordinatesToMapCoordinates(
        mouseX,
        mouseY,
        ...camera.getCoordinates()
    )
    const clickedLocation: HexCoordinate = {
        q: coords[0],
        r: coords[1],
    }
    return getSquaddieAtMapLocation({
        mapLocation: clickedLocation,
        squaddieRepository,
        map,
    })
}

const getSquaddieAtMapLocation = (param: {
    mapLocation: HexCoordinate
    squaddieRepository: ObjectRepository
    map: MissionMap
}): {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
    squaddieMapLocation: HexCoordinate
} => {
    const { mapLocation, squaddieRepository, map } = param

    const squaddieAndLocationIdentifier = map.getSquaddieAtLocation(mapLocation)

    if (
        !MissionMapSquaddieLocationHandler.isValid(
            squaddieAndLocationIdentifier
        )
    ) {
        return {
            squaddieTemplate: undefined,
            battleSquaddie: undefined,
            squaddieMapLocation: undefined,
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
        squaddieMapLocation: squaddieAndLocationIdentifier.mapLocation,
    }
}

const highlightSquaddieRange = (
    state: GameEngineState,
    battleSquaddieToHighlightId: string
) => {
    const { mapLocation: startLocation } =
        state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
            battleSquaddieToHighlightId
        )

    const { battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            state.repository,
            battleSquaddieToHighlightId
        )
    )

    state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()
    const squaddieReachHighlightedOnMap =
        MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
            repository: state.repository,
            missionMap: state.battleOrchestratorState.battleState.missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startLocation: startLocation,
            campaignResources: state.campaign.resources,
        })
    state.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles(
        squaddieReachHighlightedOnMap
    )
}
