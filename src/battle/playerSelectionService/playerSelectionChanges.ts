import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { MessageBoardMessage } from "../../message/messageBoardMessage"

export interface PlayerSelectionChanges {
    messageSent: MessageBoardMessage
    battleOrchestratorMode: BattleOrchestratorMode
}

export const PlayerSelectionChangesService = {
    new: ({
        battleOrchestratorMode,
        messageSent,
    }: {
        battleOrchestratorMode?: BattleOrchestratorMode
        messageSent?: MessageBoardMessage
    }): PlayerSelectionChanges => {
        return {
            battleOrchestratorMode:
                battleOrchestratorMode || BattleOrchestratorMode.UNKNOWN,
            messageSent: messageSent,
        }
    },
}
