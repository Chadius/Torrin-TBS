import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { GameEngine } from "./gameEngine"
import { GameModeEnum } from "../utils/startupConfig"
import { MouseButton } from "../utils/mouseConfig"
import { TitleScreen } from "../titleScreen/titleScreen"
import { BattleOrchestrator } from "../battle/orchestrator/battleOrchestrator"
import { NullMissionMap } from "../utils/test/battleOrchestratorState"
import { GameEngineGameLoader } from "./gameEngineGameLoader"
import {
    BattleSaveState,
    BattleSaveStateService,
} from "../battle/history/battleSaveState"
import { MissionObjectiveHelper } from "../battle/missionResult/missionObjective"
import { MissionRewardType } from "../battle/missionResult/missionReward"
import { MissionConditionType } from "../battle/missionResult/missionCondition"
import { ObjectRepositoryService } from "../battle/objectRepository"
import { ResourceLocator, ResourceType } from "../resource/resourceHandler"
import * as DataLoader from "../dataLoader/dataLoader"
import { SaveSaveStateService } from "../dataLoader/saveSaveState"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { CampaignService } from "../campaign/campaign"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"

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
]

describe("Game Engine", () => {
    let mockedP5GraphicsBuffer: MockedP5GraphicsBuffer
    let loadFileIntoFormatSpy: MockInstance

    beforeEach(() => {
        mockedP5GraphicsBuffer = new MockedP5GraphicsBuffer()
        loadFileIntoFormatSpy = vi
            .spyOn(DataLoader, "LoadFileIntoFormat")
            .mockResolvedValue(resourceLocators)
    })

    it("Will call the new mode based on the component recommendations", async () => {
        const newGameEngine = new GameEngine({
            startupMode: GameModeEnum.TITLE_SCREEN,
            graphicsBuffer: mockedP5GraphicsBuffer,
        })
        await newGameEngine.setup({
            graphicsBuffer: mockedP5GraphicsBuffer,
            campaignId: "default",
            version: "TEST",
        })

        const nextComponent = newGameEngine.component
        const updateSpy = vi.spyOn(nextComponent, "update").mockResolvedValue()
        const hasCompletedSpy = vi
            .spyOn(nextComponent, "hasCompleted")
            .mockReturnValue(true)
        const recommendedSpy = vi
            .spyOn(nextComponent, "recommendStateChanges")
            .mockReturnValue({ nextMode: GameModeEnum.BATTLE })

        await newGameEngine.update({ graphics: mockedP5GraphicsBuffer })

        expect(loadFileIntoFormatSpy).toBeCalled()
        expect(updateSpy).toBeCalled()
        expect(hasCompletedSpy).toBeCalled()
        expect(recommendedSpy).toBeCalled()

        expect(newGameEngine.component).toBeInstanceOf(BattleOrchestrator)
    })

    describe("Game Engine component hooks ", () => {
        const expectUpdate = async (newGameEngine: GameEngine) => {
            const updateSpy = vi
                .spyOn(newGameEngine.component, "update")
                .mockResolvedValue()
            await newGameEngine.update({ graphics: mockedP5GraphicsBuffer })
            expect(updateSpy).toBeCalled()
        }

        const expectKeyPressed = (newGameEngine: GameEngine) => {
            const keyPressedSpy = vi
                .spyOn(newGameEngine.component, "keyPressed")
                .mockImplementation(() => {})
            newGameEngine.keyPressed(10)
            expect(keyPressedSpy).toBeCalled()
            expect(keyPressedSpy.mock.calls[0][1]).toBe(10)
        }

        const expectMouseClicked = (newGameEngine: GameEngine) => {
            const mouseClickedSpy = vi
                .spyOn(newGameEngine.component, "mousePressed")
                .mockImplementation(() => {})
            newGameEngine.mousePressed({
                button: MouseButton.ACCEPT,
                x: 100,
                y: 200,
            })
            expect(mouseClickedSpy).toBeCalled()
            expect(mouseClickedSpy.mock.calls[0][1]).toEqual({
                button: MouseButton.ACCEPT,
                x: 100,
                y: 200,
            })
        }

        const expectMouseMoved = (newGameEngine: GameEngine) => {
            const mouseMovedSpy = vi
                .spyOn(newGameEngine.component, "mouseMoved")
                .mockImplementation(() => {})
            newGameEngine.mouseMoved({ x: 100, y: 200 })
            expect(mouseMovedSpy).toBeCalled()
            expect(mouseMovedSpy.mock.calls[0][1]).toEqual({ x: 100, y: 200 })
        }

        const expectMouseWheel = (newGameEngine: GameEngine) => {
            const mouseMovedSpy = vi
                .spyOn(newGameEngine.component, "mouseWheel")
                .mockImplementation(() => {})
            newGameEngine.mouseWheel({
                x: ScreenDimensions.SCREEN_WIDTH / 2,
                y: ScreenDimensions.SCREEN_HEIGHT / 2,
                deltaX: 30,
                deltaY: 50,
                shiftKey: true,
            })
            expect(mouseMovedSpy).toBeCalled()
            expect(mouseMovedSpy.mock.calls[0][1]).toEqual({
                x: ScreenDimensions.SCREEN_WIDTH / 2,
                y: ScreenDimensions.SCREEN_HEIGHT / 2,
                deltaX: 30,
                deltaY: 50,
                shiftKey: true,
            })
        }

        const expectGameEngineStartsWithFunctionalGameEngineComponent = async ({
            startupMode,
            componentType,
        }: {
            startupMode: GameModeEnum
            componentType: any
        }) => {
            const newGameEngine = new GameEngine({
                startupMode,
                graphicsBuffer: mockedP5GraphicsBuffer,
            })
            await newGameEngine.setup({
                graphicsBuffer: mockedP5GraphicsBuffer,
                campaignId: "default",
                version: "TEST",
            })
            expect(loadFileIntoFormatSpy).toBeCalled()
            expect(newGameEngine.currentMode).toBe(startupMode)
            expect(newGameEngine.component).toBeInstanceOf(componentType)

            await expectUpdate(newGameEngine)
            expectKeyPressed(newGameEngine)
            expectMouseClicked(newGameEngine)
            expectMouseMoved(newGameEngine)
            expectMouseWheel(newGameEngine)
            return true
        }

        it("works on title screen", async () => {
            expect(
                await expectGameEngineStartsWithFunctionalGameEngineComponent({
                    startupMode: GameModeEnum.TITLE_SCREEN,
                    componentType: TitleScreen,
                })
            ).toBeTruthy()
        })

        it("battle mode starts the battle orchestrator", async () => {
            expect(
                await expectGameEngineStartsWithFunctionalGameEngineComponent({
                    startupMode: GameModeEnum.BATTLE,
                    componentType: BattleOrchestrator,
                })
            ).toBeTruthy()
        })

        it("battle mode sets up message board", async () => {
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsBuffer: mockedP5GraphicsBuffer,
            })
            await newGameEngine.setup({
                graphicsBuffer: mockedP5GraphicsBuffer,
                campaignId: "default",
                version: "TEST",
            })

            expect(
                newGameEngine.gameEngineState.messageBoard.getListenersByMessageType(
                    MessageBoardMessageType.STARTED_PLAYER_PHASE
                ).length
            ).toBeGreaterThan(0)
        })

        it("works on loading battle", async () => {
            expect(
                await expectGameEngineStartsWithFunctionalGameEngineComponent({
                    startupMode: GameModeEnum.LOADING_BATTLE,
                    componentType: GameEngineGameLoader,
                })
            ).toBeTruthy()
        })
    })

    describe("save the game", () => {
        beforeEach(() => {
            loadFileIntoFormatSpy = vi
                .spyOn(DataLoader, "LoadFileIntoFormat")
                .mockResolvedValue(resourceLocators)
        })

        it("will save the game if the battle state asks for it", async () => {
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsBuffer: mockedP5GraphicsBuffer,
            })
            await newGameEngine.setup({
                graphicsBuffer: mockedP5GraphicsBuffer,
                campaignId: "default",
                version: "TEST",
            })
            expect(loadFileIntoFormatSpy).toBeCalled()
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionMap =
                NullMissionMap()
            newGameEngine.gameEngineState.campaign = CampaignService.new({
                id: "default",
            })
            SaveSaveStateService.userRequestsSave(
                newGameEngine.gameEngineState.fileState.saveSaveState
            )
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionId =
                "save with this mission id"
            newGameEngine.gameEngineState.repository =
                ObjectRepositoryService.new()
            const saveSpy = vi
                .spyOn(BattleSaveStateService, "SaveToFile")
                .mockReturnValue(null)

            await newGameEngine.update({ graphics: mockedP5GraphicsBuffer })

            expect(saveSpy).toBeCalled()
            expect(
                newGameEngine.gameEngineState.fileState.saveSaveState
                    .savingInProgress
            ).toBeFalsy()
            const battleSaveStateSaved: BattleSaveState =
                saveSpy.mock.calls[0][0]
            expect(battleSaveStateSaved.missionId).toBe(
                newGameEngine.gameEngineState.battleOrchestratorState
                    .battleState.missionId
            )
        })
        it("will set the error flag if there is an error while saving", async () => {
            const consoleLoggerSpy: MockInstance = vi
                .spyOn(console, "log")
                .mockImplementation(() => {})
            const newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsBuffer: mockedP5GraphicsBuffer,
            })
            await newGameEngine.setup({
                graphicsBuffer: mockedP5GraphicsBuffer,
                campaignId: "default",
                version: "TEST",
            })
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionMap =
                NullMissionMap()
            newGameEngine.gameEngineState.campaign = CampaignService.new({
                id: "default",
            })
            SaveSaveStateService.userRequestsSave(
                newGameEngine.gameEngineState.fileState.saveSaveState
            )
            const saveSpy = vi
                .spyOn(BattleSaveStateService, "SaveToFile")
                .mockImplementation(() => {
                    throw new Error("Failed for some reason")
                })

            await newGameEngine.update({ graphics: mockedP5GraphicsBuffer })

            expect(saveSpy).toBeCalled()
            expect(
                newGameEngine.gameEngineState.fileState.saveSaveState
                    .savingInProgress
            ).toBeFalsy()
            expect(
                newGameEngine.gameEngineState.fileState.saveSaveState
                    .errorDuringSaving
            ).toBeTruthy()

            expect(consoleLoggerSpy).toBeCalled()
        })
    })

    describe("load the game", () => {
        let newGameEngine: GameEngine

        beforeEach(async () => {
            loadFileIntoFormatSpy = vi
                .spyOn(DataLoader, "LoadFileIntoFormat")
                .mockResolvedValue(resourceLocators)
            newGameEngine = new GameEngine({
                startupMode: GameModeEnum.BATTLE,
                graphicsBuffer: mockedP5GraphicsBuffer,
            })

            await newGameEngine.setup({
                graphicsBuffer: new MockedP5GraphicsBuffer(),
                campaignId: "default",
                version: "TEST",
            })
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.missionMap =
                NullMissionMap()
            newGameEngine.gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                loadSaveState:
                    newGameEngine.gameEngineState.fileState.loadSaveState,
            })
            newGameEngine.gameEngineState.battleOrchestratorState.battleState.objectives =
                [
                    MissionObjectiveHelper.validateMissionObjective({
                        id: "test",
                        reward: { rewardType: MissionRewardType.VICTORY },
                        numberOfRequiredConditionsToComplete: 1,
                        hasGivenReward: false,
                        conditions: [
                            {
                                id: "test",
                                type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                            },
                        ],
                    }),
                ]
            vi.spyOn(
                newGameEngine.battleOrchestrator,
                "hasCompleted"
            ).mockReturnValue(true)
            expect(loadFileIntoFormatSpy).toBeCalled()
        })
        afterEach(() => {
            vi.clearAllMocks()
        })
        it("will switch to loading battle", async () => {
            await newGameEngine.update({ graphics: mockedP5GraphicsBuffer })
            expect(newGameEngine.currentMode).toBe(GameModeEnum.LOADING_BATTLE)
        })
        it("will not reset the battle orchestrator state", async () => {
            await newGameEngine.update({ graphics: mockedP5GraphicsBuffer })
            expect(
                newGameEngine.gameEngineState.battleOrchestratorState
                    .battleState.objectives[0].id
            ).toBe("test")
        })
        it("loader will go to the previous mode upon completion", async () => {
            const loaderUpdateSpy = vi
                .spyOn(newGameEngine.component, "update")
                .mockResolvedValue()
            const loaderCompletedSpy = vi
                .spyOn(newGameEngine.component, "hasCompleted")
                .mockReturnValue(true)
            await newGameEngine.update({ graphics: mockedP5GraphicsBuffer })
            expect(loaderUpdateSpy).toBeCalled()
            expect(loaderCompletedSpy).toBeCalled()
            expect(newGameEngine.gameEngineState.modeThatInitiatedLoading).toBe(
                GameModeEnum.BATTLE
            )
        })
    })

    it("will apply keyboard events to the playerInput", async () => {
        const gameEngine = new GameEngine({
            startupMode: GameModeEnum.BATTLE,
            graphicsBuffer: mockedP5GraphicsBuffer,
        })
        await gameEngine.setup({
            graphicsBuffer: mockedP5GraphicsBuffer,
            campaignId: "the campaign",
            version: "TEST",
        })
        expect(
            gameEngine.gameEngineState.playerInputState.modifierKeyCodes.shift
                .active
        ).toBeFalsy()

        const SHIFT_KEY_CODE = 16
        gameEngine.keyIsDown(SHIFT_KEY_CODE)
        expect(
            gameEngine.gameEngineState.playerInputState.modifierKeyCodes.shift
                .active
        ).toBeTruthy()

        gameEngine.keyIsUp(SHIFT_KEY_CODE)
        expect(
            gameEngine.gameEngineState.playerInputState.modifierKeyCodes.shift
                .active
        ).toBeFalsy()
    })
})
