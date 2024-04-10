import {MessageBoard} from "../../message/messageBoard";
import {BattleHUDListener, BattleHUDService} from "./battleHUD";
import {MessageBoardMessageType} from "../../message/messageBoardMessage";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {BattleStateService} from "../orchestrator/battleState";
import {FileAccessHUD, FileAccessHUDService} from "./fileAccessHUD";
import {ButtonStatus} from "../../ui/button";

describe('Battle HUD', () => {
    describe('enable buttons as a reaction', () => {
        let fileAccessHUDSpy: jest.SpyInstance;
        let fileAccessHUD: FileAccessHUD;
        let battleHUDListener: BattleHUDListener;
        let listenerSpy: jest.SpyInstance;
        let messageBoard: MessageBoard;
        let gameEngineStateWithPlayerPhase: GameEngineState;

        beforeEach(() => {
            fileAccessHUDSpy = jest.spyOn(FileAccessHUDService, "enableButtons");
            fileAccessHUD = FileAccessHUDService.new({});
            fileAccessHUD.loadButton.setStatus(ButtonStatus.DISABLED);
            fileAccessHUD.saveButton.setStatus(ButtonStatus.DISABLED);
            battleHUDListener = new BattleHUDListener("battleHUDListener");
            listenerSpy = jest.spyOn(battleHUDListener, "receiveMessage");
            messageBoard = new MessageBoard();
            gameEngineStateWithPlayerPhase = GameEngineStateService.new({
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
            });
        });
        afterEach(() => {
            listenerSpy.mockRestore();
            fileAccessHUDSpy.mockRestore();
        });

        it('will enable file access buttons when it receives a player phase started message', () => {
            messageBoard.addListener(battleHUDListener, MessageBoardMessageType.STARTED_PLAYER_PHASE);
            messageBoard.sendMessage({
                type: MessageBoardMessageType.STARTED_PLAYER_PHASE,
                gameEngineState: gameEngineStateWithPlayerPhase
            });

            expect(listenerSpy).toBeCalled();
            expect(fileAccessHUD.loadButton.getStatus()).toEqual(ButtonStatus.READY);
            expect(fileAccessHUD.saveButton.getStatus()).toEqual(ButtonStatus.READY);
            expect(fileAccessHUDSpy).toBeCalled();
        });

        it('will enable file access buttons when it receives a player can begin a turn message', () => {
            messageBoard.addListener(battleHUDListener, MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE);
            messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE,
                gameEngineState: gameEngineStateWithPlayerPhase
            });

            expect(listenerSpy).toBeCalled();
            expect(fileAccessHUD.loadButton.getStatus()).toEqual(ButtonStatus.READY);
            expect(fileAccessHUD.saveButton.getStatus()).toEqual(ButtonStatus.READY);
            expect(fileAccessHUDSpy).toBeCalled();
        });
    });
});
