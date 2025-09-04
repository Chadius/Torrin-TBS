import { MessageBoardListener } from "../../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageMoveSquaddieToCoordinate,
    MessageBoardMessagePlayerCancelsTargetConfirmation,
    MessageBoardMessagePlayerCancelsTargetSelection,
    MessageBoardMessagePlayerConfirmsAction,
    MessageBoardMessagePlayerControlledSquaddieNeedsNextAction,
    MessageBoardMessagePlayerEndsTurn,
    MessageBoardMessagePlayerPeeksAtSquaddie,
    MessageBoardMessagePlayerSelectsActionTemplate,
    MessageBoardMessagePlayerSelectsAndLocksSquaddie,
    MessageBoardMessagePlayerSelectsTargetCoordinate,
    MessageBoardMessageService,
    MessageBoardMessageStartedPlayerPhase,
    MessageBoardMessageType,
} from "../../../message/messageBoardMessage"
import { FileAccessHUDService } from "../fileAccess/fileAccessHUD"
import { BattleHUDService } from "./battleHUD"

export class BattleHUDListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        if (
            MessageBoardMessageService.isMessageBoardMessageStartedPlayerPhase(
                message
            ) ||
            MessageBoardMessageService.isMessageBoardMessagePlayerCanControlDifferentSquaddie(
                message
            )
        ) {
            FileAccessHUDService.enableButtons(
                message.gameEngineState.battleOrchestratorState.battleHUD
                    .fileAccessHUD
            )
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerCancelsTargetSelection(
                message
            )
        ) {
            BattleHUDService.cancelTargetSelection(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerCancelsTargetConfirmation(
                message
            )
        ) {
            BattleHUDService.cancelTargetConfirmation(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerEndsTurn(
                message
            )
        ) {
            BattleHUDService.endPlayerSquaddieTurn(
                message.gameEngineState,
                message.battleAction
            )
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerSelectsAndLocksSquaddie(
                message
            )
        ) {
            BattleHUDService.playerSelectsSquaddie(
                message.gameEngineState.battleOrchestratorState.battleHUD,
                message
            )
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerPeeksAtSquaddie(
                message
            )
        ) {
            BattleHUDService.playerPeeksAtSquaddie(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerSelectsActionTemplate(
                message
            )
        ) {
            BattleHUDService.playerSelectsActionTemplate(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerSelectsTargetCoordinate(
                message
            )
        ) {
            BattleHUDService.playerSelectsTargetCoordinate(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerConfirmsAction(
                message
            )
        ) {
            BattleHUDService.playerConfirmsAction(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessageMoveSquaddieToCoordinate(
                message
            )
        ) {
            BattleHUDService.tryToMoveSquaddieToLocation(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessagePlayerControlledSquaddieNeedsNextAction(
                message
            )
        ) {
            BattleHUDService.playerControlledSquaddieNeedsNextAction(message)
            return
        }
    }
}
