import { BattlePlayerActionConfirm } from "../../battle/orchestratorComponents/playerActionConfirm/battlePlayerActionConfirm"
import {
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEventType,
} from "../../battle/orchestrator/battleOrchestratorComponent"
import { MouseButton, MousePress, MouseRelease } from "../../utils/mouseConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { RectAreaService } from "../../ui/rectArea"
import { PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID } from "../../battle/orchestratorComponents/playerActionConfirm/okButton"
import { PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID } from "../../battle/orchestratorComponents/playerActionConfirm/cancelButton"
import { BattlePlayerSquaddieTarget } from "../../battle/orchestratorComponents/playerActionTarget/battlePlayerSquaddieTarget"

export const BattlePlayerActionConfirmSpec = {
    clickOnCancelButton: ({
        confirm,
        gameEngineState,
    }: {
        confirm: BattlePlayerActionConfirm
        gameEngineState: GameEngineState
    }) => {
        const cancelButton = confirm
            .getButtons()
            .find(
                (button) =>
                    button.id === PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID
            )

        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: {
                x: RectAreaService.centerX(cancelButton.getArea()),
                y: RectAreaService.centerY(cancelButton.getArea()),
                button: MouseButton.ACCEPT,
            },
        })
        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                x: RectAreaService.centerX(cancelButton.getArea()),
                y: RectAreaService.centerY(cancelButton.getArea()),
                button: MouseButton.ACCEPT,
            },
        })
    },
    clickOnConfirmTarget: ({
        confirm,
        gameEngineState,
    }: {
        confirm: BattlePlayerActionConfirm
        gameEngineState: GameEngineState
    }) => {
        const confirmButton = confirm
            .getButtons()
            .find(
                (button) =>
                    button.id === PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID
            )

        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: {
                x: RectAreaService.centerX(confirmButton.getArea()),
                y: RectAreaService.centerY(confirmButton.getArea()),
                button: MouseButton.ACCEPT,
            },
        })
        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                x: RectAreaService.centerX(confirmButton.getArea()),
                y: RectAreaService.centerY(confirmButton.getArea()),
                button: MouseButton.ACCEPT,
            },
        })
    },
    clickCancelKey: ({
        confirm,
        gameEngineState,
    }: {
        confirm: BattlePlayerActionConfirm
        gameEngineState: GameEngineState
    }) => {
        const mouseClick: MousePress | MouseRelease = {
            x: 90210,
            y: -9001,
            button: MouseButton.CANCEL,
        }
        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: mouseClick,
        })

        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: mouseClick,
        })
    },
    pressCancelKey: ({
        confirm,
        gameEngineState,
    }: {
        confirm: BattlePlayerActionConfirm
        gameEngineState: GameEngineState
    }) => {
        confirm.keyEventHappened(gameEngineState, {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode: JSON.parse(process.env.PLAYER_INPUT_CANCEL)[0]["press"],
        })
    },
    pressConfirmKey: ({
        confirm,
        gameEngineState,
    }: {
        confirm: BattlePlayerActionConfirm
        gameEngineState: GameEngineState
    }) => {
        confirm.keyEventHappened(gameEngineState, {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode: JSON.parse(process.env.PLAYER_INPUT_ACCEPT)[0]["press"],
        })
    },
}
