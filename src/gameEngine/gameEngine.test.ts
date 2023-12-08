import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {GameEngine} from "./gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {MouseButton} from "../utils/mouseConfig";
import {TitleScreen} from "../titleScreen/titleScreen";
import {BattleOrchestrator} from "../battle/orchestrator/battleOrchestrator";
import {NullMissionMap} from "../utils/test/battleOrchestratorState";
import {GameEngineBattleMissionLoader} from "./gameEngineBattleMissionLoader";
import {BattleSaveState, BattleSaveStateHandler} from "../battle/history/battleSaveState";
import {MissionObjectiveHelper} from "../battle/missionResult/missionObjective";
import {MissionRewardType} from "../battle/missionResult/missionReward";
import {MissionConditionType} from "../battle/missionResult/missionCondition";

describe('Game Engine', () => {
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });

    it('Will call the new mode based on the component recommendations', async () => {
        const newGameEngine = new GameEngine({
            startupMode: GameModeEnum.TITLE_SCREEN,
            graphicsContext: mockedP5GraphicsContext,
        });
        newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});

        const nextComponent = newGameEngine.component;
        const hasCompletedSpy = jest.spyOn(nextComponent, "hasCompleted").mockReturnValue(true);
        const recommendedSpy = jest.spyOn(nextComponent, "recommendStateChanges").mockReturnValue({nextMode: GameModeEnum.BATTLE});

        await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

        expect(hasCompletedSpy).toBeCalled();
        expect(recommendedSpy).toBeCalled();

        expect(newGameEngine.component).toBeInstanceOf(BattleOrchestrator);
    });

    describe('Game Engine component hooks ', () => {
        async function expectUpdate(newGameEngine: GameEngine) {
            const updateSpy = jest.spyOn(newGameEngine.component, "update").mockImplementation(() => {
            });
            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(updateSpy).toBeCalled();
        }

        function expectKeyPressed(newGameEngine: GameEngine) {
            const keyPressedSpy = jest.spyOn(newGameEngine.component, "keyPressed").mockImplementation(() => {
            });
            newGameEngine.keyPressed(10);
            expect(keyPressedSpy).toBeCalled();
            expect(keyPressedSpy.mock.calls[0][1]).toBe(10);
        }

        function expectMouseClicked(newGameEngine: GameEngine) {
            const mouseClickedSpy = jest.spyOn(newGameEngine.component, "mouseClicked").mockImplementation(() => {
            });
            newGameEngine.mouseClicked(MouseButton.LEFT, 100, 200);
            expect(mouseClickedSpy).toBeCalled();
            expect(mouseClickedSpy.mock.calls[0][1]).toBe(MouseButton.LEFT);
            expect(mouseClickedSpy.mock.calls[0][2]).toBe(100);
            expect(mouseClickedSpy.mock.calls[0][3]).toBe(200);
        }

        function expectMouseMoved(newGameEngine: GameEngine) {
            const mouseMovedSpy = jest.spyOn(newGameEngine.component, "mouseMoved").mockImplementation(() => {
            });
            newGameEngine.mouseMoved(100, 200);
            expect(mouseMovedSpy).toBeCalled();
            expect(mouseMovedSpy.mock.calls[0][1]).toBe(100);
            expect(mouseMovedSpy.mock.calls[0][2]).toBe(200);
        }

        const loadAndExpect = ({
                                   startupMode,
                                   componentType,
                               }: {
            startupMode: GameModeEnum,
            componentType: any,
        }) => {
            const newGameEngine = new GameEngine({
                startupMode,
                graphicsContext: mockedP5GraphicsContext
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            expect(newGameEngine.currentMode).toBe(startupMode);
            expect(newGameEngine.component).toBeInstanceOf(componentType);

            expectUpdate(newGameEngine);
            expectKeyPressed(newGameEngine);
            expectMouseClicked(newGameEngine);
            expectMouseMoved(newGameEngine);
        }

        it('works on title screen', () => {
            loadAndExpect({
                startupMode: GameModeEnum.TITLE_SCREEN,
                componentType: TitleScreen,
            })
        });

        it('works on battle mode', () => {
            loadAndExpect({
                startupMode: GameModeEnum.BATTLE,
                componentType: BattleOrchestrator,
            })
        });

        it('works on loading battle', () => {
            loadAndExpect({
                startupMode: GameModeEnum.LOADING_BATTLE,
                componentType: GameEngineBattleMissionLoader,
            })
        });
    });

    describe('save the game', () => {
        it('will save the game if the battle state asks for it', async () => {
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionMap = NullMissionMap();
            newGameEngine.gameEngineState.gameSaveFlags.savingInProgress = true;
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionId = "save with this mission id";
            const saveSpy = jest.spyOn(BattleSaveStateHandler, "SaveToFile").mockReturnValue(null);

            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

            expect(saveSpy).toBeCalled();
            expect(newGameEngine.gameEngineState.gameSaveFlags.savingInProgress).toBeFalsy();
            const battleSaveStateSaved: BattleSaveState = saveSpy.mock.calls[0][0];
            expect(battleSaveStateSaved.mission_id).toBe(newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionId);
        });
        it('will set the error flag if there is an error while saving', async () => {
            const consoleLoggerSpy: jest.SpyInstance = jest.spyOn(console, "log").mockImplementation(() => {
            });
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionMap = NullMissionMap();
            newGameEngine.gameEngineState.gameSaveFlags.savingInProgress = true;
            const saveSpy = jest.spyOn(BattleSaveStateHandler, "SaveToFile").mockImplementation(() => {
                throw new Error("Failed for some reason");
            });

            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

            expect(saveSpy).toBeCalled();
            expect(newGameEngine.gameEngineState.gameSaveFlags.savingInProgress).toBeFalsy();
            expect(newGameEngine.gameEngineState.gameSaveFlags.errorDuringSaving).toBeTruthy();

            expect(consoleLoggerSpy).toBeCalled();
        });
    });

    describe('load the game', () => {
        let newGameEngine: GameEngine;

        beforeEach(() => {
            newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionMap = NullMissionMap();
            newGameEngine.gameEngineState.gameSaveFlags.loadRequested = true;
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.objectives = [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "test",
                    reward: {rewardType: MissionRewardType.VICTORY},
                    numberOfRequiredConditionsToComplete: 1,
                    hasGivenReward: false,
                    conditions: [
                        {
                            id: "test",
                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                        }
                    ],
                })
            ];
            jest.spyOn(newGameEngine.battleOrchestrator, "hasCompleted").mockReturnValue(true);
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('will switch to loading battle', () => {
            newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(newGameEngine.currentMode).toBe(GameModeEnum.LOADING_BATTLE);
        });
        it('will not reset the battle orchestrator state', () => {
            newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(newGameEngine.gameEngineState.battleOrchestratorState.battleState.objectives[0].id).toBe("test");
        });
    });
});
