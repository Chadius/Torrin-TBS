import { LoadState, LoadSaveStateService } from "./loadState"
import {
    MessageBoardMessagePlayerDataLoadBegin,
    MessageBoardMessagePlayerDataLoadErrorDuring,
    MessageBoardMessagePlayerDataLoadFinishRequest,
    MessageBoardMessagePlayerDataLoadUserCancel,
    MessageBoardMessagePlayerDataLoadUserRequest,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { MessageBoard } from "../../message/messageBoard"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { PlayerDataMessageListener } from "./playerDataMessageListener"
import { BattleSaveStateService } from "../../battle/history/battleSaveState"
import { ObjectRepositoryService } from "../../battle/objectRepository"
import { BattleOrchestratorStateService } from "../../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../battle/battleState/battleState"
import { BattleCamera } from "../../battle/battleCamera"
import { NullMissionMap } from "../../utils/test/battleOrchestratorState"
import { BattlePhase } from "../../battle/orchestratorComponents/battlePhaseTracker"

describe("Player Data Message Listener", () => {
    let messageBoard: MessageBoard
    let playerDataMessageListener: PlayerDataMessageListener
    beforeEach(() => {
        playerDataMessageListener = new PlayerDataMessageListener(
            "playerDataMessageListener"
        )
        messageBoard = new MessageBoard()
    })

    describe("Load events", () => {
        let spy: MockInstance
        afterEach(() => {
            if (spy) {
                spy.mockRestore()
            }
        })

        const loadTests = [
            {
                name: "user requests a load",
                getSpy: () =>
                    vi.spyOn(LoadSaveStateService, "userRequestsLoad"),
                getMessage: (
                    loadSaveState: LoadState
                ): MessageBoardMessagePlayerDataLoadUserRequest => ({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                    loadState: loadSaveState,
                }),
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
            },
            {
                name: "application begins loading",
                getSpy: () =>
                    vi.spyOn(LoadSaveStateService, "applicationStartsLoad"),
                getMessage: (
                    loadSaveState: LoadState
                ): MessageBoardMessagePlayerDataLoadBegin => ({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN,
                    loadState: loadSaveState,
                }),
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN,
            },
            {
                name: "application has an error while loading",
                getSpy: () =>
                    vi.spyOn(
                        LoadSaveStateService,
                        "applicationErrorsWhileLoading"
                    ),
                getMessage: (
                    loadSaveState: LoadState
                ): MessageBoardMessagePlayerDataLoadErrorDuring => ({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING,
                    loadState: loadSaveState,
                }),
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING,
            },
            {
                name: "user cancels the load",
                getSpy: () => vi.spyOn(LoadSaveStateService, "userCancelsLoad"),
                getMessage: (
                    loadSaveState: LoadState
                ): MessageBoardMessagePlayerDataLoadUserCancel => ({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_CANCEL,
                    loadState: loadSaveState,
                }),
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_CANCEL,
            },
            {
                name: "finally the load finishes",
                getSpy: () =>
                    vi.spyOn(
                        LoadSaveStateService,
                        "userFinishesRequestingLoad"
                    ),
                getMessage: (
                    loadSaveState: LoadState
                ): MessageBoardMessagePlayerDataLoadFinishRequest => ({
                    type: MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD,
                    loadState: loadSaveState,
                }),
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD,
            },
        ]

        it.each(loadTests)(
            `Will call the loader when $name`,
            ({ type, getSpy, getMessage }) => {
                spy = getSpy()
                messageBoard.addListener(playerDataMessageListener, type)
                const loadSaveState = LoadSaveStateService.new({})
                messageBoard.sendMessage(getMessage(loadSaveState))
                expect(spy).toHaveBeenCalledWith(loadSaveState)
            }
        )

        it(`Will call the loader when application completes loading`, () => {
            spy = vi.spyOn(LoadSaveStateService, "applicationCompletesLoad")
            messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE
            )
            const loadSaveState = LoadSaveStateService.new({})
            const saveState =
                BattleSaveStateService.newUsingBattleOrchestratorState({
                    missionId: "missionId",
                    campaignId: "campaignId",
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                camera: new BattleCamera(100, 200),
                                missionMap: NullMissionMap(),
                                battlePhaseState: {
                                    turnCount: 0,
                                    currentAffiliation: BattlePhase.UNKNOWN,
                                },
                            }),
                        }
                    ),
                    saveVersion: "saveVersion",
                    repository: ObjectRepositoryService.new(),
                })
            messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE,
                loadState: loadSaveState,
                saveState,
            })
            expect(spy).toHaveBeenCalledWith(loadSaveState, saveState)
        })

        it("completely resets the state when the service finishes", () => {
            const newSaveSate = LoadSaveStateService.new({})

            messageBoard.addListener(
                playerDataMessageListener,
                MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD
            )
            const loadSaveState = LoadSaveStateService.new({
                userRequestedLoad: true,
                userCanceledLoad: true,
                applicationStartedLoad: true,
                applicationErroredWhileLoading: true,
                applicationCompletedLoad: true,
            })
            messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD,
                loadState: loadSaveState,
            })
            expect(loadSaveState).toEqual(newSaveSate)
        })
    })
})
