import {BattleSquaddieSelectedHUD} from "./battleSquaddieSelectedHUD";
import {FileAccessHUD, FileAccessHUDService} from "./fileAccessHUD";
import {getValidValueOrDefault} from "../../utils/validityCheck";
import {MessageBoardListener} from "../../message/messageBoardListener";
import {MessageBoardMessage, MessageBoardMessageType} from "../../message/messageBoardMessage";

export interface BattleHUD {
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    fileAccessHUD: FileAccessHUD;
}

export const BattleHUDService = {
    new: ({
              fileAccessHUD,
              battleSquaddieSelectedHUD,
          }: {
        fileAccessHUD?: FileAccessHUD,
        battleSquaddieSelectedHUD?: BattleSquaddieSelectedHUD
    }): BattleHUD => {
        return {
            fileAccessHUD: getValidValueOrDefault(fileAccessHUD, FileAccessHUDService.new({})),
            battleSquaddieSelectedHUD,
        }
    }
}

export class BattleHUDListener implements MessageBoardListener {
    messageBoardListenerId: string;

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId;
    }

    receiveMessage(message: MessageBoardMessage): void {
        switch (message.type) {
            case MessageBoardMessageType.STARTED_PLAYER_PHASE:
            case MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE:
                FileAccessHUDService.enableButtons(message.gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD);
                break;
        }
    }
}
