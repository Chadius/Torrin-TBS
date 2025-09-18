import { TPlayerIntent } from "./playerSelectionService"
import { MousePress } from "../../utils/mouseConfig"
import { TPlayerInputAction } from "../../ui/playerInput/playerInputState"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"

export interface MovementDecision {
    actionPointCost: number
    coordinates: HexCoordinate[]
    destination: HexCoordinate
}

export interface PlayerSelectionContext {
    actionTemplateId?: string
    playerInputActions: TPlayerInputAction[]
    mouseClick?: MousePress
    mouseMovement?: { x: number; y: number }
    actorBattleSquaddieId?: string
    playerIntent: TPlayerIntent
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
        playerIntent: TPlayerIntent
        actorBattleSquaddieId?: string
        mouseClick?: MousePress
        mouseMovement?: { x: number; y: number }
        actionTemplateId?: string
        playerInputActions?: TPlayerInputAction[]
        targetBattleSquaddieIds?: string[]
        movement?: MovementDecision
    }): PlayerSelectionContext => {
        return {
            playerIntent,
            actorBattleSquaddieId,
            mouseClick,
            mouseMovement,
            actionTemplateId,
            playerInputActions: playerInputActions ?? [],
            movement,
            targetBattleSquaddieIds: targetBattleSquaddieIds ?? [],
        }
    },
}
