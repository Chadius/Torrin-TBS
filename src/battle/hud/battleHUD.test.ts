import {MessageBoard} from "../../message/messageBoard";
import {BattleHUDListener, BattleHUDService} from "./battleHUD";
import {MessageBoardMessageType} from "../../message/messageBoardMessage";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {GameEngineStateService} from "../../gameEngine/gameEngine";
import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {BattleStateService} from "../orchestrator/battleState";
import {FileAccessHUD, FileAccessHUDService} from "./fileAccessHUD";
import {ButtonStatus} from "../../ui/button";

describe('Battle HUD', () => {
    it('will enable file access buttons when it receives a player phase message', () => {
        const fileAccessHUDSpy: jest.SpyInstance = jest.spyOn(FileAccessHUDService, "enableButtons");
        const fileAccessHUD: FileAccessHUD = FileAccessHUDService.new({});
        fileAccessHUD.loadButton.setStatus(ButtonStatus.DISABLED);
        fileAccessHUD.saveButton.setStatus(ButtonStatus.DISABLED);

        const battleHUDListener: BattleHUDListener = new BattleHUDListener("battleHUDListener");
        const listenerSpy: jest.SpyInstance = jest.spyOn(battleHUDListener, "receiveMessage");

        const messageBoard: MessageBoard = new MessageBoard();
        messageBoard.addListener(battleHUDListener, MessageBoardMessageType.STARTED_PLAYER_PHASE);

        messageBoard.sendMessage({
            type: MessageBoardMessageType.STARTED_PLAYER_PHASE,
            gameEngineState: GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({
                        fileAccessHUD,
                    }),
                    battleState: BattleStateService.new({
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        },
                        missionId: "missionId",
                    }),
                }),
            })
        });

        expect(listenerSpy).toBeCalled();
        expect(fileAccessHUD.loadButton.getStatus()).toEqual(ButtonStatus.READY);
        expect(fileAccessHUD.saveButton.getStatus()).toEqual(ButtonStatus.READY);
        expect(fileAccessHUDSpy).toBeCalled();

        listenerSpy.mockRestore();
        fileAccessHUDSpy.mockRestore();
    });
});
