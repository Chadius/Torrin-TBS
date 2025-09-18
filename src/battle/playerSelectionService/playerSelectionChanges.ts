import {
    BattleOrchestratorMode,
    TBattleOrchestratorMode,
} from "../orchestrator/battleOrchestrator"
import { MessageBoardMessage } from "../../message/messageBoardMessage"

export interface PlayerSelectionChanges {
    messageSent: MessageBoardMessage | undefined
    battleOrchestratorMode: TBattleOrchestratorMode
}

export const PlayerSelectionChangesService = {
    new: ({
        battleOrchestratorMode,
        messageSent,
    }: {
        battleOrchestratorMode?: TBattleOrchestratorMode
        messageSent?: MessageBoardMessage
    }): PlayerSelectionChanges => {
        return {
            battleOrchestratorMode:
                battleOrchestratorMode || BattleOrchestratorMode.UNKNOWN,
            messageSent: messageSent,
        }
    },
}
