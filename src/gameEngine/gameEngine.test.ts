import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {GameEngine} from "./gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {MouseButton} from "../utils/mouseConfig";
import {TitleScreen} from "../titleScreen/titleScreen";
import {BattleOrchestrator} from "../battle/orchestrator/battleOrchestrator";
import {NullMissionMap} from "../utils/test/battleOrchestratorState";
import {GameEngineGameLoader} from "./gameEngineGameLoader";
import {BattleSaveState, BattleSaveStateService} from "../battle/history/battleSaveState";
import {MissionObjectiveHelper} from "../battle/missionResult/missionObjective";
import {MissionRewardType} from "../battle/missionResult/missionReward";
import {MissionConditionType} from "../battle/missionResult/missionCondition";
import {ObjectRepositoryService} from "../battle/objectRepository";
import {LoadSaveStateService} from "../dataLoader/loadSaveState";
import {ResourceLocator, ResourceType} from "../resource/resourceHandler";
import * as DataLoader from "../dataLoader/dataLoader";
import {SaveSaveStateService} from "../dataLoader/saveSaveState";

const resourceLocators: ResourceLocator[] = [
    {
        type: ResourceType.IMAGE,
        key: "Cool pic",
        path: "/path/to/cool_pic.png",
    },
    {
        type: ResourceType.IMAGE,
        key: "Cool pic2",
        path: "/path/to/cool_pic_2.png",
    },
];

describe('Game Engine', () => {
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let loadFileIntoFormatSpy: jest.SpyInstance;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        loadFileIntoFormatSpy = jest.spyOn(DataLoader, "LoadFileIntoFormat").mockResolvedValue(
            resourceLocators
        );
    });

    it('Will call the new mode based on the component recommendations', async () => {
        const newGameEngine = new GameEngine({
            startupMode: GameModeEnum.TITLE_SCREEN,
            graphicsContext: mockedP5GraphicsContext,
        });
        await newGameEngine.setup({graphicsContext: mockedP5GraphicsContext, campaignId: "default"});

        const nextComponent = newGameEngine.component;
        const updateSpy = jest.spyOn(nextComponent, "update").mockReturnValue();
        const hasCompletedSpy = jest.spyOn(nextComponent, "hasCompleted").mockReturnValue(true);
        const recommendedSpy = jest.spyOn(nextComponent, "recommendStateChanges").mockReturnValue({nextMode: GameModeEnum.BATTLE});

        await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

        expect(loadFileIntoFormatSpy).toBeCalled();
        expect(updateSpy).toBeCalled();
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

        const loadAndExpect = async ({
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
            await newGameEngine.setup({graphicsContext: mockedP5GraphicsContext, campaignId: "default"});
            expect(loadFileIntoFormatSpy).toBeCalled();
            expect(newGameEngine.currentMode).toBe(startupMode);
            expect(newGameEngine.component).toBeInstanceOf(componentType);

            expectUpdate(newGameEngine);
            expectKeyPressed(newGameEngine);
            expectMouseClicked(newGameEngine);
            expectMouseMoved(newGameEngine);
        }

        it('works on title screen', async () => {
            await loadAndExpect({
                startupMode: GameModeEnum.TITLE_SCREEN,
                componentType: TitleScreen,
            })
        });

        it('works on battle mode', async () => {
            await loadAndExpect({
                startupMode: GameModeEnum.BATTLE,
                componentType: BattleOrchestrator,
            })
        });

        it('works on loading battle', async () => {
            await loadAndExpect({
                startupMode: GameModeEnum.LOADING_BATTLE,
                componentType: GameEngineGameLoader,
            })
        });
    });

    describe('save the game', () => {
        beforeEach(() => {
            loadFileIntoFormatSpy = jest.spyOn(DataLoader, "LoadFileIntoFormat").mockResolvedValue(
                resourceLocators
            );
        });

        it('will save the game if the battle state asks for it', async () => {
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });
            await newGameEngine.setup({graphicsContext: mockedP5GraphicsContext, campaignId: "default"});
            expect(loadFileIntoFormatSpy).toBeCalled();
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionMap = NullMissionMap();
            SaveSaveStateService.userRequestsSave(newGameEngine.gameEngineState.fileState.saveSaveState);
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionId = "save with this mission id";
            newGameEngine.gameEngineState.repository = ObjectRepositoryService.new();
            const saveSpy = jest.spyOn(BattleSaveStateService, "SaveToFile").mockReturnValue(null);

            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

            expect(saveSpy).toBeCalled();
            expect(newGameEngine.gameEngineState.fileState.saveSaveState.savingInProgress).toBeFalsy();
            const battleSaveStateSaved: BattleSaveState = saveSpy.mock.calls[0][0];
            expect(battleSaveStateSaved.missionId).toBe(newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionId);
        });
        it('will set the error flag if there is an error while saving', async () => {
            const consoleLoggerSpy: jest.SpyInstance = jest.spyOn(console, "log").mockImplementation(() => {
            });
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });
            await newGameEngine.setup({graphicsContext: mockedP5GraphicsContext, campaignId: "default"});
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionMap = NullMissionMap();
            SaveSaveStateService.userRequestsSave(newGameEngine.gameEngineState.fileState.saveSaveState);
            const saveSpy = jest.spyOn(BattleSaveStateService, "SaveToFile").mockImplementation(() => {
                throw new Error("Failed for some reason");
            });

            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});

            expect(saveSpy).toBeCalled();
            expect(newGameEngine.gameEngineState.fileState.saveSaveState.savingInProgress).toBeFalsy();
            expect(newGameEngine.gameEngineState.fileState.saveSaveState.errorDuringSaving).toBeTruthy();

            expect(consoleLoggerSpy).toBeCalled();
        });
    });

    describe('load the game', () => {
        let newGameEngine: GameEngine;

        beforeEach(async () => {
            loadFileIntoFormatSpy = jest.spyOn(DataLoader, "LoadFileIntoFormat").mockResolvedValue(
                resourceLocators
            );
            newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsContext: mockedP5GraphicsContext,
            });

            await newGameEngine.setup({graphicsContext: mockedP5GraphicsContext, campaignId: "default"});
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionMap = NullMissionMap();
            LoadSaveStateService.userRequestsLoad(newGameEngine.gameEngineState.fileState.loadSaveState);
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
            expect(loadFileIntoFormatSpy).toBeCalled();
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
        it('loader will go to the previous mode upon completion', async () => {
            const loaderUpdateSpy = jest.spyOn(newGameEngine.component, "update").mockImplementation(() => {
            });
            const loaderCompletedSpy = jest.spyOn(newGameEngine.component, "hasCompleted").mockReturnValue(true);
            await newGameEngine.update({graphicsContext: mockedP5GraphicsContext});
            expect(loaderUpdateSpy).toBeCalled();
            expect(loaderCompletedSpy).toBeCalled();
            expect(newGameEngine.gameEngineState.modeThatInitiatedLoading).toBe(GameModeEnum.BATTLE);
        });
    });
});
