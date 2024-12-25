import { GameEngineStateService } from "../../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../orchestrator/battleState"
import { BattlePhase } from "../../orchestratorComponents/battlePhaseTracker"
import { ObjectRepositoryService } from "../../objectRepository"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { CoordinateSystem } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { PopupWindow, PopupWindowService } from "../popupWindow"
import { LabelService } from "../../../ui/label"
import { RectAreaService } from "../../../ui/rectArea"
import {
    PlayerDecisionHUDListener,
    PlayerDecisionHUDService,
    PopupWindowType,
} from "./playerDecisionHUD"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import { beforeEach, describe, expect, it, MockInstance, vi } from "vitest"

describe("Player Decision HUD", () => {
    const differentSquaddiePopup: PopupWindow = PopupWindowService.new({
        label: LabelService.new({
            area: RectAreaService.new({
                left: 0,
                top: 0,
                width: 200,
                height: 100,
            }),
            text: "It's SQUADDIE_NAME turn",
            fontSize: 10,
            fontColor: [0, 0, 100],
            fillColor: [0, 0, 10],
            textBoxMargin: 8,
        }),
    })

    it("can set a popup window", () => {
        const playerDecisionHUD = PlayerDecisionHUDService.new()

        PlayerDecisionHUDService.setPopupWindow(
            playerDecisionHUD,
            differentSquaddiePopup,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )

        expect(
            playerDecisionHUD.popupWindows[
                PopupWindowType.PLAYER_INVALID_SELECTION
            ]
        ).toEqual(differentSquaddiePopup)
    })
    it("can clear a popup window", () => {
        const playerDecisionHUD = PlayerDecisionHUDService.new()

        PlayerDecisionHUDService.setPopupWindow(
            playerDecisionHUD,
            differentSquaddiePopup,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )

        PlayerDecisionHUDService.clearPopupWindow(
            playerDecisionHUD,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )

        expect(
            playerDecisionHUD.popupWindows[
                PopupWindowType.PLAYER_INVALID_SELECTION
            ]
        ).toBeUndefined()
    })
    it("squaddie does not have enough action points to perform the action", () => {
        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.new({
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 0,
                    },
                    missionId: "missionId",
                    campaignId: "test campaign",
                }),
            }),
            repository: ObjectRepositoryService.new(),
        })

        const playerDecisionHUDListener = new PlayerDecisionHUDListener(
            "playerDecisionHUDListener"
        )
        gameEngineState.messageBoard.addListener(
            playerDecisionHUDListener,
            MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID
        )

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
            gameEngineState,
            popupWindow: PopupWindowService.new({
                coordinateSystem: CoordinateSystem.WORLD,
                label: LabelService.new({
                    fontColor: [],
                    textBoxMargin: undefined,
                    fontSize: 10,
                    text: "Need 2 action points",
                    area: RectAreaService.new({
                        left: 0,
                        top: 0,
                        right: 10,
                        bottom: 10,
                    }),
                }),
            }),
        })

        expect(
            gameEngineState.battleOrchestratorState.playerDecisionHUD
                .popupWindows[PopupWindowType.PLAYER_INVALID_SELECTION]
        ).not.toBeUndefined()

        const popup =
            gameEngineState.battleOrchestratorState.playerDecisionHUD
                .popupWindows[PopupWindowType.PLAYER_INVALID_SELECTION]
        expect(
            popup.label.textBox.text.includes("Need 2 action points")
        ).toBeTruthy()
    })

    describe("draw", () => {
        let mockGraphicsContext: MockedP5GraphicsBuffer

        beforeEach(() => {
            mockGraphicsContext = new MockedP5GraphicsBuffer()
        })

        it("will draw popup windows if they are defined", () => {
            const drawSpy: MockInstance = vi.spyOn(PopupWindowService, "draw")

            const playerDecisionHUD = PlayerDecisionHUDService.new()

            PlayerDecisionHUDService.setPopupWindow(
                playerDecisionHUD,
                differentSquaddiePopup,
                PopupWindowType.PLAYER_INVALID_SELECTION
            )
            PlayerDecisionHUDService.draw(
                playerDecisionHUD,
                mockGraphicsContext
            )

            expect(drawSpy).toBeCalledTimes(1)
            drawSpy.mockRestore()
        })
        it("will not draw popup windows if they are undefined", () => {
            const drawSpy: MockInstance = vi.spyOn(PopupWindowService, "draw")

            const battleHUD = PlayerDecisionHUDService.new()
            PlayerDecisionHUDService.draw(battleHUD, mockGraphicsContext)

            expect(drawSpy).not.toBeCalled()
            drawSpy.mockRestore()
        })
    })
})
