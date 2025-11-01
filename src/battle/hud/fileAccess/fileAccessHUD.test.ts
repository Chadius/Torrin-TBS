import { RectAreaService } from "../../../ui/rectArea"
import {
    SaveSaveState,
    SaveSaveStateService,
} from "../../../dataLoader/saveSaveState"
import { BattleSaveStateService } from "../../history/battleSaveState"
import {
    FileAccessHUD,
    FileAccessHUDMessage,
    FileAccessHUDService,
} from "./fileAccessHUD"
import { MouseButton } from "../../../utils/mouseConfig"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { ObjectRepositoryService } from "../../objectRepository"
import { BattleStateService } from "../../battleState/battleState"
import {
    BattlePhase,
    TBattlePhase,
} from "../../orchestratorComponents/battlePhaseTracker"
import { MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import { BattleCamera } from "../../battleCamera"
import { CampaignService } from "../../../campaign/campaign"
import { OrchestratorUtilities } from "../../orchestratorComponents/orchestratorUtils"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { MessageBoard } from "../../../message/messageBoard"
import { PlayerDataMessageListener } from "../../../dataLoader/playerData/playerDataMessageListener"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngineState/gameEngineState"
import {
    LoadSaveStateService,
    LoadState,
} from "../../../dataLoader/playerData/loadState"

describe("File Access HUD", () => {
    let fileAccessHUD: FileAccessHUD
    let saveState: SaveSaveState
    let loadState: LoadState
    let dateSpy: MockInstance
    let takingATurnSpy: MockInstance
    let messageBoard: MessageBoard
    let playerDataMessageListener: PlayerDataMessageListener
    let graphicsContext: GraphicsBuffer

    const createGameEngineStateWithBattlePhase = (
        battlePhaseAffiliation: TBattlePhase
    ): GameEngineState => {
        const missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })

        const objectRepository = ObjectRepositoryService.new()
        return GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    missionMap,
                    camera: new BattleCamera(0, 0),
                    battlePhaseState: {
                        battlePhase: battlePhaseAffiliation,
                        turnCount: 0,
                    },
                }),
            }),
            repository: objectRepository,
            campaign: CampaignService.default(),
        })
    }

    beforeEach(() => {
        fileAccessHUD = FileAccessHUDService.new()
        saveState = SaveSaveStateService.new({})
        loadState = LoadSaveStateService.new({})
        messageBoard = new MessageBoard()
        playerDataMessageListener = new PlayerDataMessageListener(
            "playerDataMessageListener"
        )
        graphicsContext = new MockedP5GraphicsBuffer()
    })

    afterEach(() => {
        if (dateSpy) {
            dateSpy.mockRestore()
        }

        if (takingATurnSpy) {
            takingATurnSpy.mockRestore()
        }
    })

    describe("has buttons during turn", () => {
        beforeEach(() => {
            FileAccessHUDService.draw(fileAccessHUD, graphicsContext)
        })

        it("Has a save button", () => {
            expect(
                fileAccessHUD.data.getUIObjects().saveButton
            ).not.toBeUndefined()
            expect(
                fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
            ).toEqual(ButtonStatus.READY)
        })
        it("Save button changes to hovered state when hovered over", () => {
            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseLocation: {
                    x: RectAreaService.centerX(
                        fileAccessHUD.data.getUIObjects().saveButton!.getArea()
                    ),
                    y: RectAreaService.centerY(
                        fileAccessHUD.data.getUIObjects().saveButton!.getArea()
                    ),
                },
            })
            expect(
                fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
            ).toEqual(ButtonStatus.HOVER)

            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseLocation: {
                    x:
                        RectAreaService.left(
                            fileAccessHUD.data
                                .getUIObjects()
                                .saveButton!.getArea()
                        ) - 1,
                    y:
                        RectAreaService.top(
                            fileAccessHUD.data
                                .getUIObjects()
                                .saveButton!.getArea()
                        ) - 1,
                },
            })
            expect(
                fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
            ).toEqual(ButtonStatus.READY)
        })
        it("Has a load button", () => {
            expect(
                fileAccessHUD.data.getUIObjects().loadButton
            ).not.toBeUndefined()
            expect(
                fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
            ).toEqual(ButtonStatus.READY)
        })
        it("Load button changes to hovered state when hovered over", () => {
            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseLocation: {
                    x: RectAreaService.centerX(
                        fileAccessHUD.data.getUIObjects().loadButton!.getArea()
                    ),
                    y: RectAreaService.centerY(
                        fileAccessHUD.data.getUIObjects().loadButton!.getArea()
                    ),
                },
            })
            expect(
                fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
            ).toEqual(ButtonStatus.HOVER)

            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseLocation: {
                    x:
                        RectAreaService.left(
                            fileAccessHUD.data
                                .getUIObjects()
                                .loadButton!.getArea()
                        ) - 1,
                    y:
                        RectAreaService.top(
                            fileAccessHUD.data
                                .getUIObjects()
                                .loadButton!.getArea()
                        ) - 1,
                },
            })
            expect(
                fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
            ).toEqual(ButtonStatus.READY)
        })
    })

    describe("enable and disable buttons based on gameEngineState", () => {
        beforeEach(() => {
            FileAccessHUDService.draw(fileAccessHUD, graphicsContext)
        })

        it("should enable the save and load buttons during the player phase", () => {
            const gameEngineState: GameEngineState =
                createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
            FileAccessHUDService.updateBasedOnGameEngineState(
                fileAccessHUD,
                gameEngineState
            )
            expect(
                fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
            ).toEqual(ButtonStatus.READY)
            expect(
                fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
            ).toEqual(ButtonStatus.READY)
        })

        it("should disable the save and load buttons during the player phase if a squaddie is taking a turn", () => {
            takingATurnSpy = vi
                .spyOn(OrchestratorUtilities, "isSquaddieCurrentlyTakingATurn")
                .mockReturnValue(true)
            const gameEngineState: GameEngineState =
                createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
            FileAccessHUDService.updateBasedOnGameEngineState(
                fileAccessHUD,
                gameEngineState
            )
            expect(
                fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
            ).toEqual(ButtonStatus.DISABLED)
            expect(
                fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
            ).toEqual(ButtonStatus.DISABLED)
            expect(takingATurnSpy).toBeCalled()
            takingATurnSpy.mockRestore()
        })

        it("should disable the save and load buttons during other phases", () => {
            const gameEngineState: GameEngineState =
                createGameEngineStateWithBattlePhase(BattlePhase.ENEMY)
            FileAccessHUDService.updateBasedOnGameEngineState(
                fileAccessHUD,
                gameEngineState
            )
            expect(
                fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
            ).toEqual(ButtonStatus.DISABLED)
            expect(
                fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
            ).toEqual(ButtonStatus.DISABLED)
        })
    })

    describe("clicking on Save Game", () => {
        beforeEach(() => {
            vi.clearAllMocks()
            FileAccessHUDService.draw(fileAccessHUD, graphicsContext)
            FileAccessHUDService.mousePressed({
                fileAccessHUD,
                mousePress: {
                    button: MouseButton.ACCEPT,
                    x: RectAreaService.centerX(
                        fileAccessHUD.data.getUIObjects().saveButton!.getArea()
                    ),
                    y: RectAreaService.centerY(
                        fileAccessHUD.data.getUIObjects().saveButton!.getArea()
                    ),
                },
                loadState,
                saveState: saveState,
                messageBoard,
            })
            FileAccessHUDService.mouseReleased({
                fileAccessHUD,
                mouseRelease: {
                    button: MouseButton.ACCEPT,
                    x: RectAreaService.centerX(
                        fileAccessHUD.data.getUIObjects().saveButton!.getArea()
                    ),
                    y: RectAreaService.centerY(
                        fileAccessHUD.data.getUIObjects().saveButton!.getArea()
                    ),
                },
                loadState,
                saveState: saveState,
                messageBoard,
            })
        })
        it("tells HUD user has requested a save", () => {
            expect(saveState.userRequestedSave).toBeTruthy()
            expect(saveState.savingInProgress).toBeTruthy()
        })
        it("changes save and load button to disabled", () => {
            expect(
                fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
            ).toEqual(ButtonStatus.DISABLED)
            expect(
                fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
            ).toEqual(ButtonStatus.DISABLED)
        })
        describe("save is completed successfully", () => {
            beforeEach(() => {
                SaveSaveStateService.savingAttemptIsComplete(saveState)
                FileAccessHUDService.updateButtonStatus(fileAccessHUD)
                dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            })
            it("tells the user the save is complete", () => {
                const initialMessage: string =
                    FileAccessHUDService.updateStatusMessage({
                        fileAccessHUD: fileAccessHUD,
                        loadState: loadState,
                        saveState: saveState,
                        messageBoard,
                    })
                expect(initialMessage).toEqual(
                    FileAccessHUDMessage.SAVE_SUCCESS
                )
                expect(fileAccessHUD.messageDisplayStartTime).toEqual(0)
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    loadState,
                    saveState,
                    fileAccessHUD,
                    messageBoard
                )
            })
            it("clears user request from the save state after the duration passes", () => {
                FileAccessHUDService.updateStatusMessage({
                    fileAccessHUD: fileAccessHUD,
                    loadState: loadState,
                    saveState: saveState,
                    messageBoard,
                })
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    loadState,
                    saveState,
                    fileAccessHUD,
                    messageBoard
                )
                expect(saveState.userRequestedSave).toBeFalsy()
            })
            it("enables the button after save completes and the message expires", () => {
                FileAccessHUDService.updateStatusMessage({
                    fileAccessHUD: fileAccessHUD,
                    loadState: loadState,
                    saveState: saveState,
                    messageBoard,
                })
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    loadState,
                    saveState,
                    fileAccessHUD,
                    messageBoard
                )
                FileAccessHUDService.updateBasedOnGameEngineState(
                    fileAccessHUD,
                    createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
                )
                expect(
                    fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
                ).toEqual(ButtonStatus.READY)
            })
        })
        describe("save has an error during saving", () => {
            beforeEach(() => {
                SaveSaveStateService.foundErrorDuringSaving(saveState)
                FileAccessHUDService.updateButtonStatus(fileAccessHUD)
                dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            })
            it("generates a message indicating the Save failed for a period of time", () => {
                const initialMessage: string =
                    FileAccessHUDService.updateStatusMessage({
                        fileAccessHUD: fileAccessHUD,
                        loadState: loadState,
                        saveState: saveState,

                        messageBoard,
                    })
                expect(initialMessage).toEqual(FileAccessHUDMessage.SAVE_FAILED)
                expect(fileAccessHUD.messageDisplayStartTime).toEqual(0)
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    loadState,
                    saveState,
                    fileAccessHUD,
                    messageBoard
                )
            })
            it("enables the button after save errors and the message expires", () => {
                FileAccessHUDService.updateStatusMessage({
                    fileAccessHUD: fileAccessHUD,
                    loadState: loadState,
                    saveState: saveState,

                    messageBoard,
                })
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    loadState,
                    saveState,
                    fileAccessHUD,
                    messageBoard
                )
                FileAccessHUDService.updateBasedOnGameEngineState(
                    fileAccessHUD,
                    createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
                )
                expect(
                    fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
                ).toEqual(ButtonStatus.READY)
            })
        })
    })

    it("disables buttons if there is a message present", () => {
        FileAccessHUDService.draw(fileAccessHUD, graphicsContext)
        fileAccessHUD.message = "Oh hai"
        FileAccessHUDService.updateButtonStatus(fileAccessHUD)
        expect(
            fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
        ).toEqual(ButtonStatus.DISABLED)
        expect(
            fileAccessHUD.data.getUIObjects().saveButton!.getStatus()
        ).toEqual(ButtonStatus.DISABLED)
    })

    describe("clicking on Load Game", () => {
        beforeEach(() => {
            messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
            )
            FileAccessHUDService.draw(fileAccessHUD, graphicsContext)
            FileAccessHUDService.mousePressed({
                fileAccessHUD,
                mousePress: {
                    button: MouseButton.ACCEPT,
                    x: RectAreaService.centerX(
                        fileAccessHUD.data.getUIObjects().loadButton!.getArea()
                    ),
                    y: RectAreaService.centerY(
                        fileAccessHUD.data.getUIObjects().loadButton!.getArea()
                    ),
                },
                loadState,
                saveState: saveState,

                messageBoard,
            })
            FileAccessHUDService.mouseReleased({
                fileAccessHUD,
                mouseRelease: {
                    button: MouseButton.ACCEPT,
                    x: RectAreaService.centerX(
                        fileAccessHUD.data.getUIObjects().loadButton!.getArea()
                    ),
                    y: RectAreaService.centerY(
                        fileAccessHUD.data.getUIObjects().loadButton!.getArea()
                    ),
                },
                loadState,
                saveState: saveState,

                messageBoard,
            })
        })
        it("tells HUD user has requested a load", () => {
            expect(loadState.userRequestedLoad).toBeTruthy()
        })
        describe("load is completed successfully", () => {
            beforeEach(() => {
                messageBoard.addListener(
                    playerDataMessageListener,
                    MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE
                )

                messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE,
                    loadState,
                    saveState:
                        BattleSaveStateService.newUsingBattleOrchestratorState({
                            campaignId: "test campaign",
                            missionId: "test",
                            saveVersion: "SAVE_VERSION",
                            battleOrchestratorState:
                                BattleOrchestratorStateService.new({
                                    battleState: BattleStateService.new({
                                        campaignId: "test campaign",
                                        missionId: "missionId",
                                        battlePhaseState: {
                                            battlePhase: BattlePhase.PLAYER,
                                            turnCount: 0,
                                        },
                                        missionMap: MissionMapService.new({
                                            terrainTileMap:
                                                TerrainTileMapService.new({
                                                    movementCost: ["1 "],
                                                }),
                                        }),
                                    }),
                                }),
                            repository: ObjectRepositoryService.new(),
                        }),
                })

                FileAccessHUDService.updateButtonStatus(fileAccessHUD)
                dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            })
            it("enables the button after load completes and the message expires", () => {
                FileAccessHUDService.updateStatusMessage({
                    fileAccessHUD: fileAccessHUD,
                    loadState: loadState,
                    saveState: saveState,

                    messageBoard,
                })
                const noMessage: string =
                    FileAccessHUDService.updateStatusMessage({
                        fileAccessHUD: fileAccessHUD,
                        loadState: loadState,
                        saveState: saveState,

                        messageBoard,
                    })
                expect(noMessage).toBe("")
                FileAccessHUDService.updateBasedOnGameEngineState(
                    fileAccessHUD,
                    createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
                )
                expect(
                    fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
                ).not.toEqual(ButtonStatus.DISABLED)
            })
        })
        describe("loading has an error", () => {
            beforeEach(() => {
                messageBoard.addListener(
                    playerDataMessageListener,
                    MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING
                )
                messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING,
                    loadState,
                })
                FileAccessHUDService.updateButtonStatus(fileAccessHUD)
                dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            })
            it("enables the button after load errors and the message expires", () => {
                FileAccessHUDService.updateStatusMessage({
                    fileAccessHUD: fileAccessHUD,
                    loadState: loadState,
                    saveState: saveState,

                    messageBoard,
                })
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    loadState,
                    saveState,
                    fileAccessHUD,
                    messageBoard
                )
                FileAccessHUDService.updateBasedOnGameEngineState(
                    fileAccessHUD,
                    createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
                )
                expect(
                    fileAccessHUD.data.getUIObjects().loadButton!.getStatus()
                ).toEqual(ButtonStatus.READY)
            })
            it("generates a message indicating the Load failed for a period of time", () => {
                const initialMessage: string =
                    FileAccessHUDService.updateStatusMessage({
                        fileAccessHUD: fileAccessHUD,
                        loadState: loadState,
                        saveState: saveState,

                        messageBoard,
                    })
                expect(initialMessage).toEqual(FileAccessHUDMessage.LOAD_FAILED)
                expect(fileAccessHUD.messageDisplayStartTime).toEqual(0)
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    loadState,
                    saveState,
                    fileAccessHUD,
                    messageBoard
                )
            })
        })
    })
})

const expectNoMessageAfterDisplayDuration = (
    dateSpy: MockInstance,
    loadState: LoadState,
    saveState: SaveSaveState,
    fileAccessHUD: FileAccessHUD,
    messageBoard: MessageBoard
) => {
    const layout = fileAccessHUD.data.getLayout()
    dateSpy = vi
        .spyOn(Date, "now")
        .mockReturnValue(layout.MESSAGE_DISPLAY_DURATION + 1)
    const noMessage: string = FileAccessHUDService.updateStatusMessage({
        fileAccessHUD: fileAccessHUD,
        loadState: loadState,
        saveState: saveState,
        messageBoard,
    })
    expect(noMessage).toBe("")
    expect(fileAccessHUD.messageDisplayStartTime).toBeUndefined()
    expect(dateSpy).toBeCalled()
}
