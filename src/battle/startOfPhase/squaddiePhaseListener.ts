import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { SquaddiePhaseStartsService } from "./squaddiePhaseStarts"
import { PlayerPhaseService } from "./playerPhase"
import { SquaddiePhaseEndsService } from "./squaddiePhaseEnds"

export class SquaddiePhaseListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        switch (message.type) {
            case MessageBoardMessageType.SQUADDIE_PHASE_ENDS:
                SquaddiePhaseEndsService.unTintSquaddieMapIconForEachSquaddie(
                    message
                )
                SquaddiePhaseEndsService.clearMapSquaddieGameplayLayers(message)
                break
            case MessageBoardMessageType.SQUADDIE_PHASE_STARTS:
                SquaddiePhaseStartsService.restoreTurnForAllSquaddies(message)
                SquaddiePhaseStartsService.reduceDurationForAttributeModifiers(
                    message
                )
                SquaddiePhaseStartsService.unTintSquaddieMapIconForEachSquaddieWhoCanAct(
                    message
                )
                SquaddiePhaseStartsService.stopCamera(message)
                SquaddiePhaseStartsService.stopHighlightingMapTiles(message)
                break
            case MessageBoardMessageType.STARTED_PLAYER_PHASE:
                PlayerPhaseService.panToControllablePlayerSquaddieIfPlayerPhase(
                    message
                )
                break
        }
    }
}
