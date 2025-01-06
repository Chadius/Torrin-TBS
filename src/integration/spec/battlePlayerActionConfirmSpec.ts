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
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: (ScreenDimensions.SCREEN_WIDTH * 13) / 24,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
            mouseButton: MouseButton.ACCEPT,
        })
    },
    clickOnConfirmTarget: ({
        confirm,
        gameEngineState,
    }: {
        confirm: BattlePlayerActionConfirm
        gameEngineState: GameEngineState
    }) => {
        const confirmSelectionClick: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: (ScreenDimensions.SCREEN_WIDTH * 13) / 24,
            mouseY: ScreenDimensions.SCREEN_HEIGHT * 0.9,
            mouseButton: MouseButton.ACCEPT,
        }

        confirm.mouseEventHappened(gameEngineState, confirmSelectionClick)
    },
    clickCancelButton: ({
        confirm,
        gameEngineState,
    }: {
        confirm: BattlePlayerActionConfirm
        gameEngineState: GameEngineState
    }) => {
        confirm.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
            mouseButton: MouseButton.CANCEL,
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
            keyCode: JSON.parse(process.env.PLAYER_INPUT_CANCEL)[0][
                "pressedKey"
            ],
        })
    },
}
