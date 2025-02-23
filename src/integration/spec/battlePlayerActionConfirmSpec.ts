import { BattlePlayerActionConfirm } from "../../battle/orchestratorComponents/battlePlayerActionConfirm"
import {
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../../battle/orchestrator/battleOrchestratorComponent"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { MouseButton } from "../../utils/mouseConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"

export const BattlePlayerActionConfirmSpec = {
    clickOnCancelButton: ({
        confirm,
        gameEngineState,
    }: {
        confirm: BattlePlayerActionConfirm
        gameEngineState: GameEngineState
    }) => {
        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: {
                x: (ScreenDimensions.SCREEN_WIDTH * 13) / 24,
                y: ScreenDimensions.SCREEN_HEIGHT,
                button: MouseButton.ACCEPT,
            },
        })
        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                x: (ScreenDimensions.SCREEN_WIDTH * 13) / 24,
                y: ScreenDimensions.SCREEN_HEIGHT,
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
        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: {
                x: (ScreenDimensions.SCREEN_WIDTH * 13) / 24,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.9,
                button: MouseButton.ACCEPT,
            },
        })
        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                x: (ScreenDimensions.SCREEN_WIDTH * 13) / 24,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.9,
                button: MouseButton.ACCEPT,
            },
        })
    },
    clickCancelButton: ({
        confirm,
        gameEngineState,
    }: {
        confirm: BattlePlayerActionConfirm
        gameEngineState: GameEngineState
    }) => {
        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: {
                x: 0,
                y: 0,
                button: MouseButton.CANCEL,
            },
        })
        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                x: 0,
                y: 0,
                button: MouseButton.CANCEL,
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
}
