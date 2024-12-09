import { OrchestratorComponentMouseEventType } from "../../battle/orchestrator/battleOrchestratorComponent"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { MouseButton } from "../../utils/mouseConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattlePlayerSquaddieTarget } from "../../battle/orchestratorComponents/battlePlayerSquaddieTarget"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"

export const BattlePlayerActionTargetSpec = {
    clickOnCancelButton: ({
        targeting,
        gameEngineState,
    }: {
        targeting: BattlePlayerSquaddieTarget
        gameEngineState: GameEngineState
    }) => {
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
            mouseButton: MouseButton.ACCEPT,
        })
    },
    clickOnMapAtCoordinates: ({
        targeting,
        gameEngineState,
        q,
        r,
    }: {
        targeting: BattlePlayerSquaddieTarget
        gameEngineState: GameEngineState
        q: number
        r: number
    }) => {
        let { screenX: mouseX, screenY: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
                q,
                r,
                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
            })
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        })
    },
}
