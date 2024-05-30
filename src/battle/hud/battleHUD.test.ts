import { MessageBoard } from "../../message/messageBoard"
import {
    BattleHUDListener,
    BattleHUDService,
    PopupWindowType,
} from "./battleHUD"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../orchestrator/battleState"
import { FileAccessHUD, FileAccessHUDService } from "./fileAccessHUD"
import { ButtonStatus } from "../../ui/button"
import { PopupWindow, PopupWindowService } from "./popupWindow"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { LabelService } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import { SquaddieTemplateService } from "../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../squaddie/id"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieService } from "../battleSquaddie"
import { ObjectRepositoryService } from "../objectRepository"
import { MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"

describe("Battle HUD", () => {
    describe("enable buttons as a reaction", () => {
        let fileAccessHUDSpy: jest.SpyInstance
        let fileAccessHUD: FileAccessHUD
        let battleHUDListener: BattleHUDListener
        let listenerSpy: jest.SpyInstance
        let messageBoard: MessageBoard
        let gameEngineStateWithPlayerPhase: GameEngineState

        beforeEach(() => {
            fileAccessHUDSpy = jest.spyOn(FileAccessHUDService, "enableButtons")
            fileAccessHUD = FileAccessHUDService.new({})
            fileAccessHUD.loadButton.setStatus(ButtonStatus.DISABLED)
            fileAccessHUD.saveButton.setStatus(ButtonStatus.DISABLED)
            battleHUDListener = new BattleHUDListener("battleHUDListener")
            listenerSpy = jest.spyOn(battleHUDListener, "receiveMessage")
            messageBoard = new MessageBoard()
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
                        campaignId: "test campaign",
                    }),
                }),
            })
        })
        afterEach(() => {
            listenerSpy.mockRestore()
            fileAccessHUDSpy.mockRestore()
        })

        it("will enable file access buttons when it receives a player phase started message", () => {
            messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.STARTED_PLAYER_PHASE
            )
            messageBoard.sendMessage({
                type: MessageBoardMessageType.STARTED_PLAYER_PHASE,
                gameEngineState: gameEngineStateWithPlayerPhase,
            })

            expect(listenerSpy).toBeCalled()
            expect(fileAccessHUD.loadButton.getStatus()).toEqual(
                ButtonStatus.READY
            )
            expect(fileAccessHUD.saveButton.getStatus()).toEqual(
                ButtonStatus.READY
            )
            expect(fileAccessHUDSpy).toBeCalled()
        })

        it("will enable file access buttons when it receives a player can begin a turn message", () => {
            messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE
            )
            messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE,
                gameEngineState: gameEngineStateWithPlayerPhase,
            })

            expect(listenerSpy).toBeCalled()
            expect(fileAccessHUD.loadButton.getStatus()).toEqual(
                ButtonStatus.READY
            )
            expect(fileAccessHUD.saveButton.getStatus()).toEqual(
                ButtonStatus.READY
            )
            expect(fileAccessHUDSpy).toBeCalled()
        })
    })
    describe("draw", () => {
        let mockGraphicsContext: MockedP5GraphicsBuffer
        beforeEach(() => {
            mockGraphicsContext = new MockedP5GraphicsBuffer()
        })
        it("will draw popup windows if they are defined", () => {
            const drawSpy: jest.SpyInstance = jest.spyOn(
                PopupWindowService,
                "draw"
            )

            const battleHUD = BattleHUDService.new({})
            const differentSquaddiePopup: PopupWindow = PopupWindowService.new({
                label: LabelService.new({
                    area: RectAreaService.new({
                        left: 0,
                        top: 0,
                        width: 200,
                        height: 100,
                    }),
                    text: "It's SQUADDIE_NAME turn",
                    textSize: 10,
                    fontColor: [0, 0, 100],
                    fillColor: [0, 0, 10],
                    textBoxMargin: 8,
                }),
            })

            BattleHUDService.setPopupWindow(
                battleHUD,
                differentSquaddiePopup,
                PopupWindowType.DIFFERENT_SQUADDIE_TURN
            )
            BattleHUDService.draw(battleHUD, mockGraphicsContext)

            expect(drawSpy).toBeCalledTimes(1)
            drawSpy.mockRestore()
        })
        it("will not draw popup windows if they are undefined", () => {
            const drawSpy: jest.SpyInstance = jest.spyOn(
                PopupWindowService,
                "draw"
            )

            const battleHUD = BattleHUDService.new({})
            BattleHUDService.draw(battleHUD, mockGraphicsContext)

            expect(drawSpy).not.toBeCalled()
            drawSpy.mockRestore()
        })
    })
    describe("Popup Windows", () => {
        it("can set a popup window", () => {
            const battleHUD = BattleHUDService.new({})
            const differentSquaddiePopup: PopupWindow = PopupWindowService.new({
                label: LabelService.new({
                    area: RectAreaService.new({
                        left: 0,
                        top: 0,
                        width: 200,
                        height: 100,
                    }),
                    text: "It's SQUADDIE_NAME turn",
                    textSize: 10,
                    fontColor: [0, 0, 100],
                    fillColor: [0, 0, 10],
                    textBoxMargin: 8,
                }),
            })

            BattleHUDService.setPopupWindow(
                battleHUD,
                differentSquaddiePopup,
                PopupWindowType.DIFFERENT_SQUADDIE_TURN
            )

            expect(
                battleHUD.popupWindows[PopupWindowType.DIFFERENT_SQUADDIE_TURN]
            ).toEqual(differentSquaddiePopup)
        })
        it("will create a popup window if it gets a message that the player selected a different squaddie", () => {
            const squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    name: "squaddie template",
                    affiliation: SquaddieAffiliation.PLAYER,
                    templateId: "templateId",
                }),
            })
            const battleSquaddie = BattleSquaddieService.new({
                squaddieTemplate: squaddieTemplate,
                battleSquaddieId: "battleSquaddie",
            })
            const repository = ObjectRepositoryService.new()
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                squaddieTemplate
            )
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                battleSquaddie
            )
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 "],
                }),
            })
            MissionMapService.addSquaddie(
                missionMap,
                squaddieTemplate.squaddieId.templateId,
                battleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0,
                }
            )

            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                startingLocation: { q: 0, r: 0 },
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: undefined,
                        processedActionEffects: [
                            ProcessedActionMovementEffectService.new({
                                decidedActionEffect:
                                    DecidedActionMovementEffectService.new({
                                        template: undefined,
                                        destination: { q: 0, r: 1 },
                                    }),
                            }),
                        ],
                    }),
                ],
            })

            const gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.new({
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        },
                        missionId: "missionId",
                        campaignId: "test campaign",
                        missionMap,
                        actionsThisRound,
                    }),
                }),
                repository,
            })

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN
            )

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
                gameEngineState,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUD.popupWindows[
                    PopupWindowType.DIFFERENT_SQUADDIE_TURN
                ]
            ).not.toBeUndefined()

            const popup =
                gameEngineState.battleOrchestratorState.battleHUD.popupWindows[
                    PopupWindowType.DIFFERENT_SQUADDIE_TURN
                ]
            expect(
                popup.label.textBox.text.includes(
                    `${squaddieTemplate.squaddieId.name}\n is not done yet`
                )
            ).toBeTruthy()
        })
    })
})
