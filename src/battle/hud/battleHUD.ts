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
        if (message.type !== MessageBoardMessageType.STARTED_PLAYER_PHASE) {
            return;
        }

        FileAccessHUDService.enableButtons(message.gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD);
    }
}
