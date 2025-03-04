import { OrchestratorComponentMouseEventType } from "../../battle/orchestrator/battleOrchestratorComponent"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { MouseButton } from "../../utils/mouseConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattlePlayerSquaddieTarget } from "../../battle/orchestratorComponents/battlePlayerSquaddieTarget"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"

export const BattlePlayerActionTargetSpec = {
    clickOnCancelButton: ({
        targeting,
        gameEngineState,
    }: {
        targeting: BattlePlayerSquaddieTarget
        gameEngineState: GameEngineState
    }) => {
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                x: (ScreenDimensions.SCREEN_WIDTH * 13) / 24,
                y: ScreenDimensions.SCREEN_HEIGHT,
                button: MouseButton.ACCEPT,
            },
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
