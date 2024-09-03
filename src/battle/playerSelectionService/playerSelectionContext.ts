import { PlayerIntent } from "./playerSelectionService"
import { MouseClick } from "../../utils/mouseConfig"
import { KeyButtonName } from "../../utils/keyboardConfig"

export interface PlayerSelectionContext {
    actionTemplateId: string
    keyPress: {
        keyButtonName: KeyButtonName
    }
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
        keyPress,
        actionTemplateId,
    }: {
        playerIntent: PlayerIntent
        battleSquaddieId?: string
        mouseClick?: MouseClick
        mouseMovement?: { x: number; y: number }
        keyPress?: {
            keyButtonName: KeyButtonName
        }
        actionTemplateId?: string
    }): PlayerSelectionContext => {
        return {
            playerIntent,
            battleSquaddieId,
            mouseClick,
            mouseMovement,
            keyPress,
            actionTemplateId,
        }
    },
}
