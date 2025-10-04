import { MessageBoardListener } from "../../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessagePlayerCancelsPlayerActionConsiderations,
    MessageBoardMessagePlayerConsidersAction,
    MessageBoardMessagePlayerConsidersMovement,
    MessageBoardMessagePlayerSelectionIsInvalid,
    MessageBoardMessageSelectAndLockNextSquaddie,
    MessageBoardMessageService,
    MessageBoardMessageType,
} from "../../../message/messageBoardMessage"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    PopupWindow,
    PopupWindowService,
    PopupWindowStatus,
} from "../popupWindow/popupWindow"
import { SquaddieStatusTileService } from "./tile/squaddieStatusTile/squaddieStatusTile"
import { ActionTilePosition } from "./tile/actionTilePosition"
import {
    BattleHUDState,
    BattleHUDStateService,
} from "../battleHUD/battleHUDState"
import { BattleState, BattleStateService } from "../../battleState/battleState"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { MissionMapSquaddieCoordinateService } from "../../../missionMap/squaddieCoordinate"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { PlayerCommandStateService } from "../playerCommand/playerCommandHUD"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieTurnService } from "../../../squaddie/turn"
import { SummaryHUDStateService } from "../summary/summaryHUD"
import { EnumLike } from "../../../utils/enum"
import { BattleCamera } from "../../battleCamera"

const INVALID_SELECTION_POP_UP_DURATION_MS = 2000

export class PlayerDecisionHUDListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerSelectionIsInvalid(
                message
            )
        ) {
            this.playerSelectionIsInvalid(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerConsidersAction(
                message
            )
        ) {
            playerConsidersAction(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerConsidersMovement(
                message
            )
        ) {
            playerConsidersMovement(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerCancelsPlayerActionConsiderations(
                message
            )
        ) {
            cancelPlayerActionConsiderations(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessageSelectAndLockNextSquaddie(
                message
            )
        ) {
            selectAndLockNextSquaddie(message)
            return
        }
    }

    private playerSelectionIsInvalid(
        message: MessageBoardMessagePlayerSelectionIsInvalid
    ) {
        PlayerDecisionHUDService.createPlayerInvalidSelectionPopup({
            message: message,
            popupWindow: message.popupWindow,
            playerDecisionHUD: message.playerDecisionHUD,
        })
    }
}

export const PopupWindowType = {
    PLAYER_INVALID_SELECTION: "PLAYER_INVALID_SELECTION",
} as const satisfies Record<string, string>
export type TPopupWindowType = EnumLike<typeof PopupWindowType>

export interface PlayerDecisionHUD {
    popupWindows: {
        [key in TPopupWindowType]: PopupWindow | undefined
    }
}

export const PlayerDecisionHUDService = {
    new: (): PlayerDecisionHUD => {
        return {
            popupWindows: {
                [PopupWindowType.PLAYER_INVALID_SELECTION]: undefined,
            },
        }
    },
    drawPopupWindows: (
        playerDecisionHUD: PlayerDecisionHUD,
        graphicsContext: GraphicsBuffer
    ) => {
        Object.values(playerDecisionHUD.popupWindows)
            .filter((p) => p != undefined)
            .forEach((popupWindow) => {
                PopupWindowService.draw(popupWindow, graphicsContext)
            })
    },
    setPopupWindow: (
        playerDecisionHUD: PlayerDecisionHUD,
        popupWindow: PopupWindow,
        popupWindowType: TPopupWindowType
    ) => setPopupWindow(playerDecisionHUD, popupWindow, popupWindowType),
    clearPopupWindow: (
        playerDecisionHUD: PlayerDecisionHUD,
        popupWindowType: TPopupWindowType
    ) => {
        playerDecisionHUD.popupWindows[popupWindowType] = undefined
    },
    createPlayerInvalidSelectionPopup: ({
        playerDecisionHUD,
        popupWindow,
    }: {
        playerDecisionHUD: PlayerDecisionHUD
        message: MessageBoardMessagePlayerSelectionIsInvalid
        popupWindow: PopupWindow
    }) => {
        PopupWindowService.changeStatus(popupWindow, PopupWindowStatus.ACTIVE)

        PopupWindowService.setInactiveAfterTimeElapsed(
            popupWindow,
            INVALID_SELECTION_POP_UP_DURATION_MS
        )

        setPopupWindow(
            playerDecisionHUD,
            popupWindow,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )
    },
}

const setPopupWindow = (
    playerDecisionHUD: PlayerDecisionHUD,
    popupWindow: PopupWindow,
    popupWindowType: TPopupWindowType
) => {
    playerDecisionHUD.popupWindows[popupWindowType] = popupWindow
}

const playerConsidersAction = (
    message: MessageBoardMessagePlayerConsidersAction
) => {
    switch (true) {
        case !!message.useAction.actionTemplateId:
            message.playerConsideredActions.actionTemplateId =
                message.useAction.actionTemplateId
            message.playerConsideredActions.endTurn = false
            message.playerConsideredActions.movement = undefined
            break
        case !!message.useAction.isEndTurn:
            message.playerConsideredActions.actionTemplateId = undefined
            message.playerConsideredActions.endTurn = true
            message.playerConsideredActions.movement = undefined
            break
    }

    const squaddieStatusTile =
        message.summaryHUDState.squaddieStatusTiles[
            ActionTilePosition.ACTOR_STATUS
        ]
    if (squaddieStatusTile != undefined) {
        SquaddieStatusTileService.updateTileUsingSquaddie({
            tile: squaddieStatusTile,
            missionMap: message.missionMap,
            playerConsideredActions: message.playerConsideredActions,
            battleActionDecisionStep: message.battleActionDecisionStep,
            objectRepository: message.objectRepository,
        })
    }

    SummaryHUDStateService.createActionTiles({
        summaryHUDState: message.summaryHUDState,
        battleActionDecisionStep: message.battleActionDecisionStep,
        playerConsideredActions: message.playerConsideredActions,
        objectRepository: message.objectRepository,
        glossary: message.glossary,
    })

    PlayerDecisionHUDService.clearPopupWindow(
        message.playerDecisionHUD,
        PopupWindowType.PLAYER_INVALID_SELECTION
    )
}

const playerConsidersMovement = (
    message: MessageBoardMessagePlayerConsidersMovement
) => {
    const battleSquaddieId = BattleActionDecisionStepService.getActor(
        message.battleActionDecisionStep
    )?.battleSquaddieId
    if (battleSquaddieId == undefined) return

    const { battleSquaddie } = ObjectRepositoryService.getSquaddieByBattleId(
        message.objectRepository,
        battleSquaddieId
    )

    message.playerConsideredActions.endTurn = false
    message.playerConsideredActions.actionTemplateId = undefined
    message.playerConsideredActions.movement = message.movementDecision

    SquaddieTurnService.setMovementActionPointsPreviewedByPlayer({
        squaddieTurn: battleSquaddie.squaddieTurn,
        actionPoints: message.movementDecision.actionPointCost,
    })

    const squaddieStatusTile =
        message.summaryHUDState.squaddieStatusTiles[
            ActionTilePosition.ACTOR_STATUS
        ]
    if (squaddieStatusTile != undefined) {
        SquaddieStatusTileService.updateTileUsingSquaddie({
            tile: squaddieStatusTile,
            missionMap: message.missionMap,
            playerConsideredActions: message.playerConsideredActions,
            battleActionDecisionStep: message.battleActionDecisionStep,
            objectRepository: message.objectRepository,
        })
    }

    PlayerDecisionHUDService.clearPopupWindow(
        message.playerDecisionHUD,
        PopupWindowType.PLAYER_INVALID_SELECTION
    )
}

const cancelPlayerActionConsiderations = (
    message: MessageBoardMessagePlayerCancelsPlayerActionConsiderations
) => {
    const battleSquaddieId = BattleActionDecisionStepService.getActor(
        message.battleActionDecisionStep
    )?.battleSquaddieId
    if (battleSquaddieId == undefined) {
        throw new Error("battleSquaddieId is undefined")
    }

    const { battleSquaddie } = ObjectRepositoryService.getSquaddieByBattleId(
        message.objectRepository,
        battleSquaddieId
    )

    BattleActionDecisionStepService.removeAction({
        actionDecisionStep: message.battleActionDecisionStep,
    })

    message.playerConsideredActions.actionTemplateId = undefined
    message.playerConsideredActions.endTurn = false
    SquaddieTurnService.setMovementActionPointsPreviewedByPlayer({
        squaddieTurn: battleSquaddie.squaddieTurn,
        actionPoints: 0,
    })

    PlayerCommandStateService.removeSelection(message.playerCommandState)

    const squaddieStatusTile =
        message.summaryHUDState.squaddieStatusTiles[
            ActionTilePosition.ACTOR_STATUS
        ]
    if (squaddieStatusTile != undefined) {
        SquaddieStatusTileService.updateTileUsingSquaddie({
            tile: squaddieStatusTile,
            missionMap: message.missionMap,
            playerConsideredActions: message.playerConsideredActions,
            battleActionDecisionStep: message.battleActionDecisionStep,
            objectRepository: message.objectRepository,
        })
    }

    PlayerDecisionHUDService.clearPopupWindow(
        message.playerDecisionHUD,
        PopupWindowType.PLAYER_INVALID_SELECTION
    )
}

const selectAndLockNextSquaddie = (
    message: MessageBoardMessageSelectAndLockNextSquaddie
) => {
    const repository = message.repository
    const battleHUDState = message.battleHUDState
    const battleState = message.battleState
    const messageBoard = message.messageBoard
    const missionMap = message.battleState.missionMap
    const cache = message.cache
    const campaignResources = message.campaignResources

    if (repository == undefined) return
    createSquaddieSelectorPanel({
        repository,
        battleHUDState,
        battleState,
    })

    const squaddieCurrentlyTakingATurn =
        BattleStateService.getBattleSquaddieIdCurrentlyTakingATurn(battleState)

    if (squaddieCurrentlyTakingATurn) {
        panCameraToSquaddie({
            nextBattleSquaddieId: squaddieCurrentlyTakingATurn,
            missionMap: missionMap,
            camera: battleState.camera,
        })
        messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            repository,
            battleHUDState,
            battleState,
            missionMap,
            cache,
            campaignResources,
            battleSquaddieSelectedId: squaddieCurrentlyTakingATurn,
        })
        return
    }

    const nextBattleSquaddieId = BattleHUDStateService.getNextSquaddieId({
        battleHUDState,
        objectRepository: repository,
        missionMap,
    })

    if (nextBattleSquaddieId == undefined) {
        return
    }

    panCameraToSquaddie({
        nextBattleSquaddieId,
        missionMap: missionMap,
        camera: battleState.camera,
    })

    BattleStateService.resetPlayerConsideredActions(battleState)

    messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
        repository,
        battleHUDState,
        battleState,
        missionMap,
        cache,
        campaignResources,
        battleSquaddieSelectedId: nextBattleSquaddieId,
    })
}

const createSquaddieSelectorPanel = ({
    repository,
    battleHUDState,
    battleState,
}: {
    repository: ObjectRepository
    battleHUDState: BattleHUDState
    battleState: BattleState
}) => {
    const currentTeam = BattleStateService.getCurrentTeam(
        battleState,
        repository
    )

    if (currentTeam == undefined) return
    if (
        battleHUDState.squaddieListing === undefined ||
        battleHUDState.squaddieListing.teamId != currentTeam.id
    ) {
        BattleHUDStateService.resetSquaddieListingForTeam({
            battleHUDState: battleHUDState,
            team: currentTeam,
            objectRepository: repository,
            battleActionDecisionStep: battleState.battleActionDecisionStep,
        })
    }
}

const panCameraToSquaddie = ({
    nextBattleSquaddieId,
    missionMap,
    camera,
}: {
    nextBattleSquaddieId: string
    missionMap: MissionMap
    camera: BattleCamera
}) => {
    const selectedMapCoordinates = MissionMapService.getByBattleSquaddieId(
        missionMap,
        nextBattleSquaddieId
    )
    if (
        MissionMapSquaddieCoordinateService.isValid(selectedMapCoordinates) &&
        selectedMapCoordinates.currentMapCoordinate != undefined
    ) {
        const selectedWorldCoordinates =
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: {
                    q: selectedMapCoordinates.currentMapCoordinate.q,
                    r: selectedMapCoordinates.currentMapCoordinate.r,
                },
            })
        camera.pan({
            xDestination: selectedWorldCoordinates.x,
            yDestination: selectedWorldCoordinates.y,
            timeToPan: 500,
            respectConstraints: true,
        })
    }
}
