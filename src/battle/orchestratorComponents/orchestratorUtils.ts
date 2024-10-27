import { getResultOrThrowError } from "../../utils/ResultOrError"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleCamera } from "../battleCamera"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { MissionMapSquaddieLocationService } from "../../missionMap/squaddieLocation"
import { MapHighlightService } from "../animation/mapHighlight"
import { isValidValue } from "../../utils/validityCheck"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattlePhase } from "./battlePhaseTracker"
import { HEX_TILE_WIDTH } from "../../graphicsConstants"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieTurnService } from "../../squaddie/turn"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapGraphicsLayer"
import { MouseButton, MouseClickService } from "../../utils/mouseConfig"

export const OrchestratorUtilities = {
    isSquaddieCurrentlyTakingATurn: (state: GameEngineState): boolean => {
        return isSquaddieCurrentlyTakingATurn(state)
    },
    drawPlayableSquaddieReach: (gameEngineState: GameEngineState) => {
        return drawPlayableSquaddieReach(gameEngineState)
    },
    drawOrResetHUDBasedOnSquaddieTurnAndAffiliation: (
        state: GameEngineState
    ) => {
        return drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state)
    },
    canTheCurrentSquaddieAct: (gameEngineState: GameEngineState): boolean => {
        return canTheCurrentSquaddieAct(gameEngineState)
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
                    MissionMapSquaddieLocationService.isValid(datum) &&
                    TerrainTileMapService.isLocationOnMap(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap,
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

    const actionsThisRound =
        gameEngineState.battleOrchestratorState.battleState.actionsThisRound
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
    gameEngineState: GameEngineState
) => {
    if (
        !gameEngineState.battleOrchestratorState.battleState.actionsThisRound ||
        !isSquaddieCurrentlyTakingATurn(gameEngineState)
    ) {
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            undefined
        return
    }

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
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

    const { mapLocation } = MissionMapService.getByBattleSquaddieId(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        battleSquaddie.battleSquaddieId
    )

    let mouseX: number = 0,
        mouseY: number = 0
    if (mapLocation) {
        ;({ screenX: mouseX, screenY: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q: mapLocation.q,
                r: mapLocation.r,
                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
            }))
        mouseX -= HEX_TILE_WIDTH
    }

    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
        gameEngineState: gameEngineState,
        battleSquaddieSelectedId:
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId,
        selectionMethod: {
            mouseClick: MouseClickService.new({
                x: mouseX,
                y: mouseY,
                button: MouseButton.ACCEPT,
            }),
        },
    })
}

const drawPlayableSquaddieReach = (gameEngineState: GameEngineState) => {
    const currentlyActingBattleSquaddieId =
        gameEngineState?.battleOrchestratorState?.battleState?.actionsThisRound
            ?.battleSquaddieId
    if (
        !isValidValue(currentlyActingBattleSquaddieId) ||
        currentlyActingBattleSquaddieId === ""
    ) {
        return
    }

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        )
    )

    const { playerCanControlThisSquaddieRightNow } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })
    if (playerCanControlThisSquaddieRightNow) {
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION,
            gameEngineState: gameEngineState,
        })
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

    const clickedLocation =
        ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates({
            screenX: mouseX,
            screenY: mouseY,
            ...camera.getCoordinates(),
        })

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
        !MissionMapSquaddieLocationService.isValid(
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
    gameEngineState: GameEngineState,
    battleSquaddieToHighlightId: string
) => {
    const { mapLocation: startLocation } =
        gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
            battleSquaddieToHighlightId
        )

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieToHighlightId
        )
    )

    const squaddieReachHighlightedOnMap =
        MapHighlightService.highlightAllLocationsWithinSquaddieRange({
            repository: gameEngineState.repository,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startLocation: startLocation,
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
