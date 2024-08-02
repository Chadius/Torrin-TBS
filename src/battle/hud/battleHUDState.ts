import { SummaryHUDState } from "./summaryHUD"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { RectAreaService } from "../../ui/rectArea"
import { HEX_TILE_WIDTH } from "../../graphicsConstants"

export interface BattleHUDState {
    summaryHUDState: SummaryHUDState
}

export const BattleHUDStateService = {
    new: ({
        summaryHUDState,
    }: {
        summaryHUDState?: SummaryHUDState
    }): BattleHUDState => {
        return newBattleHUDState({
            summaryHUDState,
        })
    },
    clone: (battleHUDState: BattleHUDState): BattleHUDState => {
        return newBattleHUDState({ ...battleHUDState })
    },
    getPositionToOpenPlayerCommandWindow: ({
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
    }): { x: number; y: number } => {
        let repositionWindow = {
            mouseX: ScreenDimensions.SCREEN_WIDTH / 2,
            mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
        }

        if (
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.playerCommandState?.playerCommandWindow
        ) {
            repositionWindow.mouseX =
                RectAreaService.left(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState.playerCommandWindow
                        .area
                ) + HEX_TILE_WIDTH
            repositionWindow.mouseY =
                RectAreaService.top(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState.playerCommandWindow
                        .area
                ) - HEX_TILE_WIDTH
        }

        return {
            x: repositionWindow.mouseX,
            y: repositionWindow.mouseY,
        }
    },
}

const newBattleHUDState = ({
    summaryHUDState,
}: {
    summaryHUDState?: SummaryHUDState
}): BattleHUDState => {
    return sanitize({
        summaryHUDState,
    })
}

const sanitize = (battleHUDState: BattleHUDState): BattleHUDState => {
    return battleHUDState
}
