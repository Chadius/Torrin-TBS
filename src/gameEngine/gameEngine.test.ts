import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {GameEngine, GameEngineComponentState} from "./gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {MouseButton} from "../utils/mouseConfig";
import {TitleScreen} from "../titleScreen/titleScreen";
import {TitleScreenState} from "../titleScreen/titleScreenState";
import {BattleOrchestratorState, BattleOrchestratorStateHelper} from "../battle/orchestrator/battleOrchestratorState";
import {BattleOrchestrator} from "../battle/orchestrator/battleOrchestrator";
import {SaveFile} from "../utils/fileHandling/saveFile";
import {NullMissionMap} from "../utils/test/battleOrchestratorState";
import {GameEngineBattleMissionLoader} from "./gameEngineBattleMissionLoader";
import {TriggeringEvent} from "../cutscene/cutsceneTrigger";
import {BattleSaveState, BattleSaveStateHandler, DefaultBattleSaveState} from "../battle/history/battleSaveState";
import {MissionObjectiveHelper} from "../battle/missionResult/missionObjective";
import {MissionRewardType} from "../battle/missionResult/missionReward";
import {MissionConditionType} from "../battle/missionResult/missionCondition";
import {MissionStatisticsHandler} from "../battle/missionStatistics/missionStatistics";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleCamera} from "../battle/battleCamera";
import {BattleSquaddieRepository} from "../battle/battleSquaddieRepository";
import {ResourceHandler} from "../resource/resourceHandler";
import {StubImmediateLoader} from "../resource/resourceHandlerTestUtils";
import {BattleStateHelper} from "../battle/orchestrator/battleState";

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

        it('works on loading battle', () => {
            loadAndExpect({
                startupMode: GameModeEnum.LOADING_BATTLE,
                componentType: GameEngineBattleMissionLoader,
                expectedStateType: BattleOrchestratorState,
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
            newGameEngine.battleOrchestratorState.battleState.missionMap = NullMissionMap();
            newGameEngine.battleOrchestratorState.battleState.gameSaveFlags.savingInProgress = true;
            newGameEngine.battleOrchestratorState.battleState.missionId = "save with this mission id";
            const saveSpy = jest.spyOn(BattleSaveStateHandler, "SaveToFile").mockReturnValue(null);

            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

            expect(saveSpy).toBeCalled();
            expect(newGameEngine.battleOrchestratorState.battleState.gameSaveFlags.savingInProgress).toBeFalsy();
            const battleSaveStateSaved: BattleSaveState = saveSpy.mock.calls[0][0];
            expect(battleSaveStateSaved.mission_id).toBe(newGameEngine.battleOrchestratorState.battleState.missionId);
        });
        it('will set the error flag if there is an error while saving', async () => {
            const consoleLoggerSpy: jest.SpyInstance = jest.spyOn(console, "log").mockImplementation(() => {
            });
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });
            newGameEngine.setup({graphicsContext: mockedP5GraphicsContext});
            newGameEngine.battleOrchestratorState.battleState.missionMap = NullMissionMap();
            newGameEngine.battleOrchestratorState.battleState.gameSaveFlags.savingInProgress = true;
            const saveSpy = jest.spyOn(BattleSaveStateHandler, "SaveToFile").mockImplementation(() => {
                throw new Error("Failed for some reason");
            });

            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

            expect(saveSpy).toBeCalled();
            expect(newGameEngine.battleOrchestratorState.battleState.gameSaveFlags.savingInProgress).toBeFalsy();
            expect(newGameEngine.battleOrchestratorState.battleState.gameSaveFlags.errorDuringSaving).toBeTruthy();

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
            newGameEngine.battleOrchestratorState.battleState.missionMap = NullMissionMap();
            newGameEngine.battleOrchestratorState.battleState.gameSaveFlags.loadRequested = true;
            newGameEngine.battleOrchestratorState.battleState.objectives = [
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

            originalState = BattleOrchestratorStateHelper.newOrchestratorState({
                squaddieRepository: new BattleSquaddieRepository(),
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateHelper.newBattleState({
                    missionId: "test mission",
                    camera: new BattleCamera(100, 200),
                    missionMap: NullMissionMap(),
                    missionStatistics: {
                        ...MissionStatisticsHandler.new(),
                        timeElapsedInMilliseconds: 9001,
                    },
                    objectives: [
                        MissionObjectiveHelper.validateMissionObjective({
                            id: "test",
                            reward: {rewardType: MissionRewardType.VICTORY},
                            hasGivenReward: false,
                            numberOfRequiredConditionsToComplete: 1,
                            conditions: [
                                {
                                    id: "test",
                                    type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                                }
                            ],

                        })
                    ],
                    cutsceneTriggers: [
                        {
                            cutsceneId: "introductory",
                            triggeringEvent: TriggeringEvent.START_OF_TURN,
                            turn: 0,
                            systemReactedToTrigger: true,
                        }
                    ],
                    missionCompletionStatus: {},
                }),
                resourceHandler: new ResourceHandler({
                    imageLoader: new StubImmediateLoader(),
                    allResources: []
                }),
            });
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
            expect(newGameEngine.battleOrchestratorState.battleState.objectives[0].id).toBe("test");
        });
    });
});
