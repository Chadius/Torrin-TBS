import { PlayerIntent } from "./playerSelectionService"
import { MouseClick } from "../../utils/mouseConfig"
import { KeyButtonName } from "../../utils/keyboardConfig"

export interface PlayerSelectionContext {
    buttonPress: KeyButtonName
    mouseClick: MouseClick
    mouseMovement: { x: number; y: number }
    battleSquaddieId: string
    playerIntent: PlayerIntent
}

export const PlayerSelectionContextService = {
    new: ({
        playerIntent,
        battleSquaddieId,
        mouseClick,
        mouseMovement,
        buttonPress,
    }: {
        playerIntent: PlayerIntent
        battleSquaddieId?: string
        mouseClick?: MouseClick
        mouseMovement?: { x: number; y: number }
        buttonPress?: KeyButtonName
    }): PlayerSelectionContext => {
        return {
            playerIntent,
            battleSquaddieId,
            mouseClick,
            mouseMovement,
            buttonPress,
        }
    },
}
