import { PlayerIntent } from "./playerSelectionService"
import { MouseClick } from "../../utils/mouseConfig"
import { KeyButtonName } from "../../utils/keyboardConfig"

export interface PlayerSelectionContext {
    actionTemplateId: string
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
        actionTemplateId,
    }: {
        playerIntent: PlayerIntent
        battleSquaddieId?: string
        mouseClick?: MouseClick
        mouseMovement?: { x: number; y: number }
        buttonPress?: KeyButtonName
        actionTemplateId?: string
    }): PlayerSelectionContext => {
        return {
            playerIntent,
            battleSquaddieId,
            mouseClick,
            mouseMovement,
            buttonPress,
            actionTemplateId,
        }
    },
}
