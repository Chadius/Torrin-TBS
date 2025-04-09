import { MessageBoardListener } from "../../../message/messageBoardListener"
import {
    MessageBoardMessage,
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
        switch (message.type) {
            case MessageBoardMessageType.STARTED_PLAYER_PHASE:
            case MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE:
                FileAccessHUDService.enableButtons(
                    message.gameEngineState.battleOrchestratorState.battleHUD
                        .fileAccessHUD
                )
                break
            case MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION:
                BattleHUDService.cancelTargetSelection(message)
                break
            case MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION:
                BattleHUDService.cancelTargetConfirmation(message)
                break
            case MessageBoardMessageType.PLAYER_ENDS_TURN:
                BattleHUDService.endPlayerSquaddieTurn(
                    message.gameEngineState,
                    message.battleAction
                )
                break
            case MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE:
                BattleHUDService.playerSelectsSquaddie(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message
                )
                break
            case MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE:
                BattleHUDService.playerPeeksAtSquaddie(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message
                )
                break
            case MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET:
                BattleHUDService.playerSelectsActionThatRequiresATarget(message)
                break
            case MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE:
                BattleHUDService.playerSelectsTargetCoordinate(message)
                break
            case MessageBoardMessageType.PLAYER_CONFIRMS_ACTION:
                BattleHUDService.playerConfirmsAction(message)
                break
            case MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE:
                BattleHUDService.tryToMoveSquaddieToLocation(message)
                break
            case MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS:
                BattleHUDService.cancelSquaddieSelectionAtStartOfTurn(message)
                break
            case MessageBoardMessageType.PLAYER_SELECTS_EMPTY_TILE:
                BattleHUDService.clicksOnAnEmptyTileAtTheStartOfTheTurn(message)
                break
            case MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION:
                BattleHUDService.playerControlledSquaddieNeedsNextAction(
                    message
                )
                break
        }
    }
}
