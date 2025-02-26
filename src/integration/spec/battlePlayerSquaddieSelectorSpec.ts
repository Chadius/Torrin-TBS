import { BattlePlayerSquaddieSelector } from "../../battle/orchestratorComponents/battlePlayerSquaddieSelector"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { OrchestratorComponentMouseEventType } from "../../battle/orchestrator/battleOrchestratorComponent"
import { MouseButton } from "../../utils/mouseConfig"
import { SummaryHUDStateService } from "../../battle/hud/summary/summaryHUD"
import { RectAreaService } from "../../ui/rectArea"
import { ActionButtonService } from "../../battle/hud/playerActionPanel/actionButton/actionButton"

export const BattlePlayerSquaddieSelectorSpec = {
    clickOnMapAtCoordinates: ({
        selector,
        gameEngineState,
        q,
        r,
        graphicsContext,
    }: {
        selector: BattlePlayerSquaddieSelector
        gameEngineState: GameEngineState
        q: number
        r: number
        graphicsContext: GraphicsBuffer
    }) => {
        let { screenX: mouseX, screenY: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                q,
                r,
                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
            })
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.PRESS,
            mousePress: {
                x: mouseX,
                y: mouseY,
                button: MouseButton.ACCEPT,
            },
        })
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                x: mouseX,
                y: mouseY,
                button: MouseButton.ACCEPT,
            },
        })

        SummaryHUDStateService.draw({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            gameEngineState,
            resourceHandler: gameEngineState.resourceHandler,
            graphicsBuffer: graphicsContext,
        })
    },
    clickOnActionButton: ({
        actionTemplateId,
        gameEngineState,
        selector,
    }: {
        actionTemplateId: string
        gameEngineState: GameEngineState
        selector: BattlePlayerSquaddieSelector
    }) => {
        const attackButton =
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                (actionButton) =>
                    ActionButtonService.getActionTemplateId(actionButton) ===
                    actionTemplateId
            )

        selector.mousePressed({
            mousePress: {
                button: MouseButton.ACCEPT,
                x: RectAreaService.centerX(
                    attackButton.uiObjects.buttonIcon.drawArea
                ),
                y: RectAreaService.centerY(
                    attackButton.uiObjects.buttonIcon.drawArea
                ),
            },
            gameEngineState,
        })

        selector.mouseReleased({
            mouseRelease: {
                button: MouseButton.ACCEPT,
                x: RectAreaService.centerX(
                    attackButton.uiObjects.buttonIcon.drawArea
                ),
                y: RectAreaService.centerY(
                    attackButton.uiObjects.buttonIcon.drawArea
                ),
            },
            gameEngineState,
        })
    },
}
