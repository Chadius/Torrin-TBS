import { ButtonStatus } from "../../../ui/button/button"
import { RectAreaService } from "../../../ui/rectArea"
import { SaveSaveStateService } from "../../../dataLoader/saveSaveState"
import { BattleSaveStateService } from "../../history/battleSaveState"
import {
    FileAccessHUD,
    FileAccessHUDDesign,
    FileAccessHUDMessage,
    FileAccessHUDService,
} from "./fileAccessHUD"
import { MouseButton } from "../../../utils/mouseConfig"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { ObjectRepositoryService } from "../../objectRepository"
import { BattleStateService } from "../../orchestrator/battleState"
import { BattlePhase } from "../../orchestratorComponents/battlePhaseTracker"
import { MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
import { BattleCamera } from "../../battleCamera"
import { CampaignService } from "../../../campaign/campaign"
import { OrchestratorUtilities } from "../../orchestratorComponents/orchestratorUtils"
import { FileState, FileStateService } from "../../../gameEngine/fileState"
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

describe("File Access HUD", () => {
    let fileAccessHUD: FileAccessHUD
    let fileState: FileState
    let dateSpy: MockInstance
    let takingATurnSpy: MockInstance
    let messageBoard: MessageBoard
    let playerDataMessageListener: PlayerDataMessageListener

    const createGameEngineStateWithBattlePhase = (
        battlePhaseAffiliation: BattlePhase
    ): GameEngineState => {
        const missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })

        const objectRepository = ObjectRepositoryService.new()
        return GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    missionMap,
                    camera: new BattleCamera(0, 0),
                    battlePhaseState: {
                        currentAffiliation: battlePhaseAffiliation,
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
        fileState = FileStateService.new()
        messageBoard = new MessageBoard()
        playerDataMessageListener = new PlayerDataMessageListener(
            "playerDataMessageListener"
        )
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
        it("Has a save button", () => {
            expect(fileAccessHUD.saveButton).not.toBeUndefined()
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(
                ButtonStatus.READY
            )
        })
        it("Save button changes to hovered state when hovered over", () => {
            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseX: RectAreaService.centerX(
                    fileAccessHUD.saveButton.readyLabel.rectangle.area
                ),
                mouseY: RectAreaService.centerY(
                    fileAccessHUD.saveButton.readyLabel.rectangle.area
                ),
            })
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(
                ButtonStatus.HOVER
            )

            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseX:
                    RectAreaService.left(
                        fileAccessHUD.saveButton.readyLabel.rectangle.area
                    ) - 1,
                mouseY:
                    RectAreaService.top(
                        fileAccessHUD.saveButton.readyLabel.rectangle.area
                    ) - 1,
            })
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(
                ButtonStatus.READY
            )
        })
        it("Has a load button", () => {
            expect(fileAccessHUD.loadButton).not.toBeUndefined()
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(
                ButtonStatus.READY
            )
        })
        it("Load button changes to hovered state when hovered over", () => {
            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseX: RectAreaService.centerX(
                    fileAccessHUD.loadButton.readyLabel.rectangle.area
                ),
                mouseY: RectAreaService.centerY(
                    fileAccessHUD.loadButton.readyLabel.rectangle.area
                ),
            })
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(
                ButtonStatus.HOVER
            )

            FileAccessHUDService.mouseMoved({
                fileAccessHUD,
                mouseX:
                    RectAreaService.left(
                        fileAccessHUD.loadButton.readyLabel.rectangle.area
                    ) - 1,
                mouseY:
                    RectAreaService.top(
                        fileAccessHUD.loadButton.readyLabel.rectangle.area
                    ) - 1,
            })
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(
                ButtonStatus.READY
            )
        })
    })

    describe("enable and disable buttons based on gameEngineState", () => {
        it("should enable the save and load buttons during the player phase", () => {
            const gameEngineState: GameEngineState =
                createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
            FileAccessHUDService.updateBasedOnGameEngineState(
                fileAccessHUD,
                gameEngineState
            )
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(
                ButtonStatus.READY
            )
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(
                ButtonStatus.READY
            )
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
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(
                ButtonStatus.DISABLED
            )
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(
                ButtonStatus.DISABLED
            )
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
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(
                ButtonStatus.DISABLED
            )
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(
                ButtonStatus.DISABLED
            )
        })
    })

    describe("clicking on Save Game", () => {
        beforeEach(() => {
            vi.clearAllMocks()
            FileAccessHUDService.mouseClicked({
                fileAccessHUD,
                mouseButton: MouseButton.ACCEPT,
                mouseX: RectAreaService.centerX(
                    fileAccessHUD.saveButton.readyLabel.rectangle.area
                ),
                mouseY: RectAreaService.centerY(
                    fileAccessHUD.saveButton.readyLabel.rectangle.area
                ),
                fileState,
                messageBoard,
            })
        })
        it("tells HUD user has requested a save", () => {
            expect(fileState.saveSaveState.userRequestedSave).toBeTruthy()
            expect(fileState.saveSaveState.savingInProgress).toBeTruthy()
        })
        it("changes save and load button to disabled", () => {
            expect(fileAccessHUD.loadButton.buttonStatus).toEqual(
                ButtonStatus.DISABLED
            )
            expect(fileAccessHUD.saveButton.buttonStatus).toEqual(
                ButtonStatus.DISABLED
            )
        })
        describe("save is completed successfully", () => {
            beforeEach(() => {
                SaveSaveStateService.savingAttemptIsComplete(
                    fileState.saveSaveState
                )
                FileAccessHUDService.updateButtonStatus(fileAccessHUD)
                dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            })
            it("tells the user the save is complete", () => {
                const initialMessage: string =
                    FileAccessHUDService.updateStatusMessage({
                        fileAccessHUD: fileAccessHUD,
                        fileState: fileState,
                        messageBoard,
                    })
                expect(initialMessage).toEqual(
                    FileAccessHUDMessage.SAVE_SUCCESS
                )
                expect(fileAccessHUD.messageDisplayStartTime).toEqual(0)
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    fileState,
                    fileAccessHUD,
                    messageBoard
                )
            })
            it("clears user request from the save state after the duration passes", () => {
                FileAccessHUDService.updateStatusMessage({
                    fileAccessHUD: fileAccessHUD,
                    fileState: fileState,
                    messageBoard,
                })
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    fileState,
                    fileAccessHUD,
                    messageBoard
                )
                expect(fileState.saveSaveState.userRequestedSave).toBeFalsy()
            })
            it("enables the button after save completes and the message expires", () => {
                FileAccessHUDService.updateStatusMessage({
                    fileAccessHUD: fileAccessHUD,
                    fileState: fileState,
                    messageBoard,
                })
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    fileState,
                    fileAccessHUD,
                    messageBoard
                )
                FileAccessHUDService.updateBasedOnGameEngineState(
                    fileAccessHUD,
                    createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
                )
                expect(fileAccessHUD.saveButton.getStatus()).toEqual(
                    ButtonStatus.READY
                )
            })
        })
        describe("save has an error during saving", () => {
            beforeEach(() => {
                SaveSaveStateService.foundErrorDuringSaving(
                    fileState.saveSaveState
                )
                FileAccessHUDService.updateButtonStatus(fileAccessHUD)
                dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            })
            it("generates a message indicating the Save failed for a period of time", () => {
                const initialMessage: string =
                    FileAccessHUDService.updateStatusMessage({
                        fileAccessHUD: fileAccessHUD,
                        fileState: fileState,
                        messageBoard,
                    })
                expect(initialMessage).toEqual(FileAccessHUDMessage.SAVE_FAILED)
                expect(fileAccessHUD.messageDisplayStartTime).toEqual(0)
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    fileState,
                    fileAccessHUD,
                    messageBoard
                )
            })
            it("enables the button after save errors and the message expires", () => {
                FileAccessHUDService.updateStatusMessage({
                    fileAccessHUD: fileAccessHUD,
                    fileState: fileState,
                    messageBoard,
                })
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    fileState,
                    fileAccessHUD,
                    messageBoard
                )
                FileAccessHUDService.updateBasedOnGameEngineState(
                    fileAccessHUD,
                    createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
                )
                expect(fileAccessHUD.saveButton.getStatus()).toEqual(
                    ButtonStatus.READY
                )
            })
        })
    })

    it("disables buttons if there is a message present", () => {
        fileAccessHUD.message = "Oh hai"
        FileAccessHUDService.updateButtonStatus(fileAccessHUD)
        expect(fileAccessHUD.loadButton.buttonStatus).toEqual(
            ButtonStatus.DISABLED
        )
        expect(fileAccessHUD.saveButton.buttonStatus).toEqual(
            ButtonStatus.DISABLED
        )
    })

    describe("clicking on Load Game", () => {
        beforeEach(() => {
            messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
            )

            FileAccessHUDService.mouseClicked({
                fileAccessHUD,
                mouseButton: MouseButton.ACCEPT,
                mouseX: RectAreaService.centerX(
                    fileAccessHUD.loadButton.readyLabel.rectangle.area
                ),
                mouseY: RectAreaService.centerY(
                    fileAccessHUD.loadButton.readyLabel.rectangle.area
                ),
                fileState,
                messageBoard,
            })
        })
        it("tells HUD user has requested a load", () => {
            expect(fileState.loadSaveState.userRequestedLoad).toBeTruthy()
        })
        describe("load is completed successfully", () => {
            beforeEach(() => {
                messageBoard.addListener(
                    playerDataMessageListener,
                    MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE
                )

                messageBoard.sendMessage({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE,
                    loadSaveState: fileState.loadSaveState,
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
                                            currentAffiliation:
                                                BattlePhase.PLAYER,
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
                    fileState: fileState,
                    messageBoard,
                })
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    fileState,
                    fileAccessHUD,
                    messageBoard
                )
                FileAccessHUDService.updateBasedOnGameEngineState(
                    fileAccessHUD,
                    createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
                )
                expect(fileAccessHUD.loadButton.getStatus()).toEqual(
                    ButtonStatus.READY
                )
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
                    loadSaveState: fileState.loadSaveState,
                })
                FileAccessHUDService.updateButtonStatus(fileAccessHUD)
                dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            })
            it("enables the button after load errors and the message expires", () => {
                FileAccessHUDService.updateStatusMessage({
                    fileAccessHUD: fileAccessHUD,
                    fileState: fileState,
                    messageBoard,
                })
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    fileState,
                    fileAccessHUD,
                    messageBoard
                )
                FileAccessHUDService.updateBasedOnGameEngineState(
                    fileAccessHUD,
                    createGameEngineStateWithBattlePhase(BattlePhase.PLAYER)
                )
                expect(fileAccessHUD.loadButton.getStatus()).toEqual(
                    ButtonStatus.READY
                )
            })
            it("generates a message indicating the Load failed for a period of time", () => {
                const initialMessage: string =
                    FileAccessHUDService.updateStatusMessage({
                        fileAccessHUD: fileAccessHUD,
                        fileState: fileState,
                        messageBoard,
                    })
                expect(initialMessage).toEqual(FileAccessHUDMessage.LOAD_FAILED)
                expect(fileAccessHUD.messageDisplayStartTime).toEqual(0)
                expectNoMessageAfterDisplayDuration(
                    dateSpy,
                    fileState,
                    fileAccessHUD,
                    messageBoard
                )
            })
        })
    })
})

const expectNoMessageAfterDisplayDuration = (
    dateSpy: MockInstance,
    fileState: FileState,
    fileAccessHUD: FileAccessHUD,
    messageBoard: MessageBoard
) => {
    dateSpy = vi
        .spyOn(Date, "now")
        .mockReturnValue(FileAccessHUDDesign.MESSAGE_DISPLAY_DURATION + 1)
    const noMessage: string = FileAccessHUDService.updateStatusMessage({
        fileAccessHUD: fileAccessHUD,
        fileState: fileState,
        messageBoard,
    })
    expect(noMessage).toBeUndefined()
    expect(fileAccessHUD.messageDisplayStartTime).toBeUndefined()
    expect(dateSpy).toBeCalled()
}
