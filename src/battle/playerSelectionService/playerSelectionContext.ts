import { PlayerIntent } from "./playerSelectionService"
import { MouseClick } from "../../utils/mouseConfig"
import { PlayerInputAction } from "../../ui/playerInput/playerInputState"

export interface PlayerSelectionContext {
    actionTemplateId: string
    playerInputActions: PlayerInputAction[]
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
        actionTemplateId,
        playerInputActions,
    }: {
        playerIntent: PlayerIntent
        battleSquaddieId?: string
        mouseClick?: MouseClick
        mouseMovement?: { x: number; y: number }
        actionTemplateId?: string
        playerInputActions?: PlayerInputAction[]
    }): PlayerSelectionContext => {
        return {
            playerIntent,
            battleSquaddieId,
            mouseClick,
            mouseMovement,
            actionTemplateId,
            playerInputActions,
        }
    },
}
