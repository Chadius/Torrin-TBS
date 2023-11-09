import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {GameEngine, GameEngineComponentState} from "./gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {MouseButton} from "../utils/mouseConfig";
import {TitleScreen} from "../titleScreen/titleScreen";
import {TitleScreenState} from "../titleScreen/titleScreenState";
import {BattleOrchestratorState} from "../battle/orchestrator/battleOrchestratorState";
import {BattleOrchestrator} from "../battle/orchestrator/battleOrchestrator";
import {SaveFile} from "../utils/fileHandling/saveFile";
import {NullMissionMap} from "../utils/test/battleOrchestratorState";
import {BattleSaveState, BattleSaveStateHandler, DefaultBattleSaveState} from "../battle/history/battleSaveState";
import {BattleCamera} from "../battle/battleCamera";
import {BattleSquaddieRepository} from "../battle/battleSquaddieRepository";
import {MissionStatisticsHandler} from "../battle/missionStatistics/missionStatistics";
import {Pathfinder} from "../hexMap/pathfinder/pathfinder";
import {MissionObjective} from "../battle/missionResult/missionObjective";
import {MissionReward, MissionRewardType} from "../battle/missionResult/missionReward";
import {MissionConditionType} from "../battle/missionResult/missionCondition";
import {ResourceHandler} from "../resource/resourceHandler";
import {StubImmediateLoader} from "../resource/resourceHandlerTestUtils";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {TriggeringEvent} from "../cutscene/cutsceneTrigger";
import {BattleMissionLoader} from "../battle/orchestratorComponents/battleMissionLoader";

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
        async function expectUpdate(newGameEngine: GameEngine, expectedStateType: GameEngineComponentState) {
            const updateSpy = jest.spyOn(newGameEngine.component, "update").mockImplementation(() => {
            });
            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(updateSpy).toBeCalled();
            const updateGameEngineComponentState: GameEngineComponentState = updateSpy.mock.calls[0][0];
            expect(updateGameEngineComponentState).toBeInstanceOf(expectedStateType);
        }

        function expectKeyPressed(newGameEngine: GameEngine, expectedStateType: GameEngineComponentState) {
            const keyPressedSpy = jest.spyOn(newGameEngine.component, "keyPressed").mockImplementation(() => {
            });
            newGameEngine.keyPressed(10);
            expect(keyPressedSpy).toBeCalled();
            const keyPressedGameEngineComponentState: GameEngineComponentState = keyPressedSpy.mock.calls[0][0];
            expect(keyPressedGameEngineComponentState).toBeInstanceOf(expectedStateType);
            expect(keyPressedSpy.mock.calls[0][1]).toBe(10);
        }

        function expectMouseClicked(newGameEngine: GameEngine, expectedStateType: GameEngineComponentState) {
            const mouseClickedSpy = jest.spyOn(newGameEngine.component, "mouseClicked").mockImplementation(() => {
            });
            newGameEngine.mouseClicked(MouseButton.LEFT, 100, 200);
            expect(mouseClickedSpy).toBeCalled();
            const mouseClickedGameEngineComponentState: GameEngineComponentState = mouseClickedSpy.mock.calls[0][0];
            expect(mouseClickedGameEngineComponentState).toBeInstanceOf(expectedStateType);
            expect(mouseClickedSpy.mock.calls[0][1]).toBe(MouseButton.LEFT);
            expect(mouseClickedSpy.mock.calls[0][2]).toBe(100);
            expect(mouseClickedSpy.mock.calls[0][3]).toBe(200);
        }

        function expectMouseMoved(newGameEngine: GameEngine, expectedStateType: GameEngineComponentState) {
            const mouseMovedSpy = jest.spyOn(newGameEngine.component, "mouseMoved").mockImplementation(() => {
            });
            newGameEngine.mouseMoved(100, 200);
            expect(mouseMovedSpy).toBeCalled();
            const mouseMovedGameEngineComponentState: GameEngineComponentState = mouseMovedSpy.mock.calls[0][0];
            expect(mouseMovedGameEngineComponentState).toBeInstanceOf(expectedStateType);
            expect(mouseMovedSpy.mock.calls[0][1]).toBe(100);
            expect(mouseMovedSpy.mock.calls[0][2]).toBe(200);
        }

        const loadAndExpect = ({
                                   startupMode,
                                   componentType,
                                   expectedStateType,
                               }: {
            startupMode: GameModeEnum,
            componentType: any,
            expectedStateType: GameEngineComponentState
        }) => {
            const newGameEngine = new GameEngine({
                startupMode,
                graphicsContext: mockedP5GraphicsContext
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            expect(newGameEngine.currentMode).toBe(startupMode);
            expect(newGameEngine.component).toBeInstanceOf(componentType);

            expectUpdate(newGameEngine, expectedStateType);
            expectKeyPressed(newGameEngine, expectedStateType);
            expectMouseClicked(newGameEngine, expectedStateType);
            expectMouseMoved(newGameEngine, expectedStateType);
        }

        it('works on title screen', () => {
            loadAndExpect({
                startupMode: GameModeEnum.TITLE_SCREEN,
                componentType: TitleScreen,
                expectedStateType: TitleScreenState,
            })
        });

        it('works on battle mode', () => {
            loadAndExpect({
                startupMode: GameModeEnum.BATTLE,
                componentType: BattleOrchestrator,
                expectedStateType: BattleOrchestratorState,
            })
        });
    });

    describe('save the game', () => {
        it('will save the game if the battle state asks for it', () => {
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            newGameEngine.battleOrchestratorState.missionMap = NullMissionMap();
            newGameEngine.battleOrchestratorState.gameSaveFlags.savingInProgress = true;
            const saveSpy = jest.spyOn(SaveFile, "DownloadToBrowser").mockReturnValue(null);

            newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

            expect(saveSpy).toBeCalled();
            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.savingInProgress).toBeFalsy();
        });
        it('will set the error flag if there is an error while saving', () => {
            const consoleLoggerSpy: jest.SpyInstance = jest.spyOn(console, "log").mockImplementation(() => {
            });
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            newGameEngine.battleOrchestratorState.missionMap = NullMissionMap();
            newGameEngine.battleOrchestratorState.gameSaveFlags.savingInProgress = true;
            const saveSpy = jest.spyOn(SaveFile, "DownloadToBrowser").mockImplementation(() => {
                throw new Error("Failed for some reason");
            });

            newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

            expect(saveSpy).toBeCalled();
            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.savingInProgress).toBeFalsy();
            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.errorDuringSaving).toBeTruthy();

            expect(consoleLoggerSpy).toBeCalled();
        });
    });

    describe('load the game', () => {
        let newGameEngine: GameEngine;
        let openDialogSpy: jest.SpyInstance;
        let loadedBattleSaveState: BattleSaveState;
        let hasCompletedSpy: jest.SpyInstance;
        let originalState: BattleOrchestratorState;

        beforeEach(() => {
            newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            newGameEngine.battleOrchestratorState.missionMap = NullMissionMap();
            newGameEngine.battleOrchestratorState.gameSaveFlags.loadRequested = true;
            newGameEngine.battleOrchestratorState.pathfinder = new Pathfinder();
            newGameEngine.battleOrchestratorState.gameBoard.objectives = [
                new MissionObjective({
                    id: "test",
                    reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
                    conditions: [
                        {
                            id: "test",
                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                        }
                    ],
                })
            ];

            loadedBattleSaveState = {
                ...DefaultBattleSaveState(),
                mission_statistics: {
                    ...MissionStatisticsHandler.new(),
                    timeElapsedInMilliseconds: 1,
                },
                teams_by_affiliation: {
                    [SquaddieAffiliation.PLAYER]: {
                        name: "Players",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [],
                    }
                }
            };
            openDialogSpy = jest.spyOn(SaveFile, "RetrieveFileContent").mockResolvedValue(
                loadedBattleSaveState
            );
            jest.spyOn(newGameEngine.battleOrchestrator.missionLoader, "update").mockReturnValue(null);
            hasCompletedSpy = jest.spyOn(BattleMissionLoader.prototype, "hasCompleted").mockReturnValue(true);

            originalState = new BattleOrchestratorState({
                camera: new BattleCamera(100, 200),
                missionMap: NullMissionMap(),
                squaddieRepository: new BattleSquaddieRepository(),
                missionStatistics: {
                    ...MissionStatisticsHandler.new(),
                    timeElapsedInMilliseconds: 9001,
                },
                pathfinder: new Pathfinder(),
                objectives: [
                    new MissionObjective({
                        id: "test",
                        reward: new MissionReward({rewardType: MissionRewardType.VICTORY}),
                        conditions: [
                            {
                                id: "test",
                                type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                            }
                        ],

                    })
                ],
                resourceHandler: new ResourceHandler({
                    imageLoader: new StubImmediateLoader(),
                    allResources: []
                }),
                cutsceneTriggers: [
                    {
                        cutsceneId: "introductory",
                        triggeringEvent: TriggeringEvent.START_OF_TURN,
                        turn: 0,
                        systemReactedToTrigger: true,
                    }
                ],
                missionCompletionStatus: {},
            });
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('will try to begin retrieving file content', async () => {
            const retrieveSpy = jest.spyOn(SaveFile, "RetrieveFileContent");
            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(retrieveSpy).toBeCalled();
        });
        it('will try to open a file dialog', async () => {
            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(openDialogSpy).toBeCalled();
        });
        it('will tell the battle orchestrator to reload the mission', async () => {
            newGameEngine.battleOrchestratorState = originalState;
            BattleSaveStateHandler.applySaveStateToOrchestratorState({
                battleSaveState: loadedBattleSaveState,
                battleOrchestratorState: newGameEngine.battleOrchestratorState,
                squaddieRepository: new BattleSquaddieRepository(),
            });
            expect(newGameEngine.battleOrchestratorState.missionStatistics).toEqual(loadedBattleSaveState.mission_statistics);

            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(newGameEngine.currentMode).toBe(GameModeEnum.BATTLE);

            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(hasCompletedSpy).toBeCalled();
            expect(newGameEngine.battleOrchestrator.missionLoader.update).toBeCalled();

            expect(newGameEngine.battleOrchestratorState.missingComponents).toHaveLength(0);
            expect(newGameEngine.battleOrchestratorState.isValid).toBeTruthy();
            expect(newGameEngine.battleOrchestratorState.isReadyToContinueMission).toBeTruthy();
        });
        it('will clear the load game flag after succeeding', async () => {
            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(hasCompletedSpy).toBeCalled();
            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.loadRequested).toBeFalsy();
            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.loadingInProgress).toBeFalsy();
        });
        it('should not play the introductory cutscene', async () => {
            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(hasCompletedSpy).toBeCalled();
            expect(newGameEngine.battleOrchestrator.cutscenePlayer.currentCutsceneId).toBeUndefined();
        });

        it('should abort loading if the file data is invalid', async () => {
            newGameEngine.battleOrchestratorState = originalState;
            newGameEngine.battleOrchestratorState.gameSaveFlags.loadRequested = true;
            newGameEngine.battleOrchestratorState.gameSaveFlags.loadingInProgress = true;
            openDialogSpy = jest.spyOn(SaveFile, "RetrieveFileContent").mockRejectedValue(
                null
            );
            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.loadRequested).toBeFalsy();
            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.loadingInProgress).toBeFalsy();
            expect(newGameEngine.battleOrchestratorState).toEqual(originalState);
            expect(hasCompletedSpy).not.toBeCalled();
        });
        it('should revert to previous state if augmented state is invalid', async () => {
            const consoleLoggerSpy: jest.SpyInstance = jest.spyOn(console, "log").mockImplementation(() => {
            });

            const isValidSpy: jest.SpyInstance = jest.spyOn(BattleOrchestratorState.prototype, "isReadyToContinueMission", "get").mockReturnValue(false);
            newGameEngine.battleOrchestratorState = originalState;
            newGameEngine.battleOrchestratorState.gameSaveFlags.loadRequested = true;
            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(isValidSpy).toBeCalled();
            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.loadRequested).toBeFalsy();
            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.loadingInProgress).toBeFalsy();

            const originalGameSaveFlags = {...originalState.gameSaveFlags};
            originalState.gameSaveFlags = {
                ...originalState.gameSaveFlags,
                loadingInProgress: false,
                loadRequested: false,
                errorDuringLoading: true,
            };
            expect(newGameEngine.battleOrchestratorState).toEqual(originalState);
            originalState.gameSaveFlags = originalGameSaveFlags;

            expect(newGameEngine.battleOrchestratorState.gameSaveFlags.errorDuringLoading).toBeTruthy();
            expect(consoleLoggerSpy).toBeCalled();
        });
    });
});
