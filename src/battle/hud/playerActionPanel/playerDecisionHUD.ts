import { MessageBoardListener } from "../../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessagePlayerConsidersAction,
    MessageBoardMessagePlayerSelectionIsInvalid,
    MessageBoardMessageType,
} from "../../../message/messageBoardMessage"
import { isValidValue } from "../../../utils/validityCheck"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    PopupWindow,
    PopupWindowService,
    PopupWindowStatus,
} from "../popupWindow/popupWindow"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { ObjectRepositoryService } from "../../objectRepository"
import { SquaddieTurnService } from "../../../squaddie/turn"
import { SquaddieStatusTileService } from "./tile/squaddieStatusTile"
import { ActionTilePosition } from "./tile/actionTilePosition"

const INVALID_SELECTION_POP_UP_DURATION_MS = 2000

export class PlayerDecisionHUDListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        switch (message.type) {
            case MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID:
                PlayerDecisionHUDService.createPlayerInvalidSelectionPopup({
                    message,
                    popupWindow: message.popupWindow,
                    playerDecisionHUD:
                        message.gameEngineState.battleOrchestratorState
                            .playerDecisionHUD,
                })
                break
            case MessageBoardMessageType.PLAYER_CONSIDERS_ACTION:
                playerConsidersAction(message)
                break
        }
    }
}

export enum PopupWindowType {
    PLAYER_INVALID_SELECTION = "PLAYER_INVALID_SELECTION",
}

export interface PlayerDecisionHUD {
    popupWindows: {
        [key in PopupWindowType]: PopupWindow
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
    draw: (
        playerDecisionHUD: PlayerDecisionHUD,
        graphicsContext: GraphicsBuffer
    ) => {
        Object.values(playerDecisionHUD.popupWindows)
            .filter(isValidValue)
            .forEach((popupWindow) => {
                PopupWindowService.draw(popupWindow, graphicsContext)
            })
    },
    setPopupWindow: (
        playerDecisionHUD: PlayerDecisionHUD,
        popupWindow: PopupWindow,
        popupWindowType: PopupWindowType
    ) => setPopupWindow(playerDecisionHUD, popupWindow, popupWindowType),
    clearPopupWindow: (
        playerDecisionHUD: PlayerDecisionHUD,
        popupWindowType: PopupWindowType
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
    popupWindowType: PopupWindowType
) => {
    playerDecisionHUD.popupWindows[popupWindowType] = popupWindow
}

const playerConsidersAction = (
    message: MessageBoardMessagePlayerConsidersAction
) => {
    const gameEngineState = message.gameEngineState
    const battleSquaddieId: string = BattleActionDecisionStepService.getActor(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    ).battleSquaddieId

    const { battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieId
        )
    )

    switch (true) {
        case !!message.action.actionTemplateId:
            SquaddieTurnService.markActionPoints(
                battleSquaddie.squaddieTurn,
                ObjectRepositoryService.getActionTemplateById(
                    gameEngineState.repository,
                    message.action.actionTemplateId
                ).resourceCost.actionPoints
            )
            break
        case !!message.action.isEndTurn:
            SquaddieTurnService.markActionPoints(
                battleSquaddie.squaddieTurn,
                battleSquaddie.squaddieTurn.remainingActionPoints
            )
            break
        case !!message.action.cancel:
            SquaddieTurnService.markActionPoints(battleSquaddie.squaddieTurn, 0)
            break
    }

    SquaddieStatusTileService.updateTileUsingSquaddie({
        tile: gameEngineState.battleOrchestratorState.battleHUDState
            .summaryHUDState.squaddieStatusTiles[
            ActionTilePosition.ACTOR_STATUS
        ],
        objectRepository: gameEngineState.repository,
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
    })

    PlayerDecisionHUDService.clearPopupWindow(
        gameEngineState.battleOrchestratorState.playerDecisionHUD,
        PopupWindowType.PLAYER_INVALID_SELECTION
    )
}
