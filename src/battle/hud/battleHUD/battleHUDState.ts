import { SummaryHUDState } from "../summary/summaryHUD"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { RectAreaService } from "../../../ui/rectArea"
import { HEX_TILE_WIDTH } from "../../../graphicsConstants"
import {
    MouseButton,
    MouseClick,
    MouseClickService,
} from "../../../utils/mouseConfig"

export interface BattleHUDState {
    nextSquaddieBattleSquaddieIdsToCycleThrough: string[]
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
    }): MouseClick => {
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

        return MouseClickService.new({
            x: repositionWindow.mouseX,
            y: repositionWindow.mouseY,
            button: MouseButton.ACCEPT,
        })
    },
}

const newBattleHUDState = ({
    summaryHUDState,
}: {
    summaryHUDState?: SummaryHUDState
}): BattleHUDState => {
    return sanitize({
        summaryHUDState,
        nextSquaddieBattleSquaddieIdsToCycleThrough: [],
    })
}

const sanitize = (battleHUDState: BattleHUDState): BattleHUDState => {
    return battleHUDState
}
