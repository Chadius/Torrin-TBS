import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageService,
    MessageBoardMessageSquaddiePhaseEnds,
    MessageBoardMessageSquaddiePhaseStarts,
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
        if (
            MessageBoardMessageService.isMessageBoardMessageSquaddiePhaseEnds(
                message
            )
        ) {
            this.squaddiePhaseEnds(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessageSquaddiePhaseStarts(
                message
            )
        ) {
            this.squaddiePhaseStarts(message)
            return
        }

        if (
            MessageBoardMessageService.isMessageBoardMessageStartedPlayerPhase(
                message
            )
        ) {
            PlayerPhaseService.panToControllablePlayerSquaddieIfPlayerPhase(
                message
            )
        }
    }

    private squaddiePhaseStarts = (
        message: MessageBoardMessageSquaddiePhaseStarts
    ) => {
        SquaddiePhaseStartsService.restoreTurnForAllSquaddies(message)
        SquaddiePhaseStartsService.reduceCooldownForAllSquaddies(message)
        SquaddiePhaseStartsService.reduceDurationForAttributeModifiers(message)
        SquaddiePhaseStartsService.unTintSquaddieMapIconForEachSquaddieWhoCanAct(
            message
        )
        SquaddiePhaseStartsService.stopCamera(message)
        SquaddiePhaseStartsService.stopHighlightingMapTiles(message)
    }
    private squaddiePhaseEnds = (
        message:
            | MessageBoardMessageSquaddiePhaseStarts
            | MessageBoardMessageSquaddiePhaseEnds
    ) => {
        SquaddiePhaseEndsService.unTintSquaddieMapIconForEachSquaddie(message)
        SquaddiePhaseStartsService.restoreTurnForAllSquaddies(message)
        SquaddiePhaseEndsService.clearMapSquaddieGameplayLayers(message)
    }
}
