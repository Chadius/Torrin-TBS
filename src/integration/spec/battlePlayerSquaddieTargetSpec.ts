import { OrchestratorComponentMouseEventType } from "../../battle/orchestrator/battleOrchestratorComponent"
import { MouseButton, MousePress, MouseRelease } from "../../utils/mouseConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattlePlayerSquaddieTarget } from "../../battle/orchestratorComponents/playerActionTarget/battlePlayerSquaddieTarget"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { RectAreaService } from "../../ui/rectArea"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"

export const BattlePlayerActionTargetSpec = {
    updateUntilCancelButtonIsReady: ({
        targeting,
        gameEngineState,
        graphicsContext,
    }: {
        targeting: BattlePlayerSquaddieTarget
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
    }) => {
        let attempts = 1000
        while (!targeting.data.getUIObjects().cancelButton && attempts > 0) {
            targeting.update({
                gameEngineState,
                graphicsContext,
            })
            attempts -= 1
        }
        if (attempts <= 0) {
            throw new Error(
                "[BattlePlayerActionTargetSpec.updateUntilCancelButtonIsReady]: Failed to render Cancel button"
            )
        }
    },
    clickOnCancelButton: ({
        targeting,
        gameEngineState,
    }: {
        targeting: BattlePlayerSquaddieTarget
        gameEngineState: GameEngineState
    }) => {
        const mouseClick: MousePress | MouseRelease = {
            x: RectAreaService.centerX(
                targeting.data.getUIObjects().cancelButton.getArea()
            ),
            y: RectAreaService.centerY(
                targeting.data.getUIObjects().cancelButton.getArea()
            ),
            button: MouseButton.ACCEPT,
        }

        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: mouseClick,
        })

        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: mouseClick,
        })
    },
    clickCancelButtonOnMouse: ({
        targeting,
        gameEngineState,
    }: {
        targeting: BattlePlayerSquaddieTarget
        gameEngineState: GameEngineState
    }) => {
        const mouseClick: MousePress | MouseRelease = {
            x: 90210,
            y: -9001,
            button: MouseButton.CANCEL,
        }
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: mouseClick,
        })

        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: mouseClick,
        })
    },
    clickOnMapAtCoordinates: ({
        targeting,
        gameEngineState,
        mapCoordinate,
    }: {
        targeting: BattlePlayerSquaddieTarget
        gameEngineState: GameEngineState
        mapCoordinate: HexCoordinate
    }) => {
        let { x: mouseX, y: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate,
                cameraLocation:
                    gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
            })
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                x: mouseX,
                y: mouseY,
                button: MouseButton.ACCEPT,
            },
        })
    },
}
