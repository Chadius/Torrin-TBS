import { BattlePlayerActionConfirm } from "../../battle/orchestratorComponents/playerActionConfirm/battlePlayerActionConfirm"
import {
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEventType,
} from "../../battle/orchestrator/battleOrchestratorComponent"
import { MouseButton } from "../../utils/mouseConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { RectAreaService } from "../../ui/rectArea"

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
            .find((button) => button.id === "PlayerActionConfirmCancel")

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
            .find((button) => button.id === "PlayerActionConfirmOK")

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
