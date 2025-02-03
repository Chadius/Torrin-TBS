import { PlayerIntent } from "./playerSelectionService"
import { MouseClick } from "../../utils/mouseConfig"
import { PlayerInputAction } from "../../ui/playerInput/playerInputState"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"

export interface MovementDecision {
    actionPointCost: number
    coordinates: HexCoordinate[]
    destination: HexCoordinate
}

export interface PlayerSelectionContext {
    actionTemplateId: string
    playerInputActions: PlayerInputAction[]
    mouseClick: MouseClick
    mouseMovement: { x: number; y: number }
    actorBattleSquaddieId: string
    playerIntent: PlayerIntent
    targetBattleSquaddieIds: string[]
    movement?: MovementDecision
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
        movement,
    }: {
        playerIntent: PlayerIntent
        actorBattleSquaddieId?: string
        mouseClick?: MouseClick
        mouseMovement?: { x: number; y: number }
        actionTemplateId?: string
        playerInputActions?: PlayerInputAction[]
        targetBattleSquaddieIds?: string[]
        movement?: MovementDecision
    }): PlayerSelectionContext => {
        return {
            playerIntent,
            actorBattleSquaddieId,
            mouseClick,
            mouseMovement,
            actionTemplateId,
            playerInputActions,
            movement,
            targetBattleSquaddieIds: targetBattleSquaddieIds ?? [],
        }
    },
}
