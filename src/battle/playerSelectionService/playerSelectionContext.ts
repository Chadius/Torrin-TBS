import { PlayerIntent } from "./playerSelectionService"
import { MouseClick } from "../../utils/mouseConfig"
import { PlayerInputAction } from "../../ui/playerInput/playerInputState"

export interface PlayerSelectionContext {
    actionTemplateId: string
    playerInputActions: PlayerInputAction[]
    mouseClick: MouseClick
    mouseMovement: { x: number; y: number }
    actorBattleSquaddieId: string
    playerIntent: PlayerIntent
    targetBattleSquaddieIds: string[]
}

export const PlayerSelectionContextService = {
    new: ({
        playerIntent,
        actorBattleSquaddieId,
        mouseClick,
        mouseMovement,
        actionTemplateId,
        playerInputActions,
        targetBattleSquaddieIds,
    }: {
        playerIntent: PlayerIntent
        actorBattleSquaddieId?: string
        mouseClick?: MouseClick
        mouseMovement?: { x: number; y: number }
        actionTemplateId?: string
        playerInputActions?: PlayerInputAction[]
        targetBattleSquaddieIds?: string[]
    }): PlayerSelectionContext => {
        return {
            playerIntent,
            actorBattleSquaddieId,
            mouseClick,
            mouseMovement,
            actionTemplateId,
            playerInputActions,
            targetBattleSquaddieIds: targetBattleSquaddieIds ?? [],
        }
    },
}
