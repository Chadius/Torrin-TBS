import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { PlayerActionConfirmUIObjects } from "../../orchestratorComponents/playerActionConfirm/battlePlayerActionConfirm"
import { BattleCamera } from "../../battleCamera"
import { Button } from "../../../ui/button/button"

export interface PlayerActionTargetStateMachineUIObjects {
    graphicsContext: GraphicsBuffer
    camera: BattleCamera
    confirm: PlayerActionConfirmUIObjects
}

export const PlayerActionTargetStateMachineUIObjectsService = {
    empty: (): PlayerActionTargetStateMachineUIObjects => ({
        camera: undefined,
        graphicsContext: undefined,
        confirm: {
            okButton: undefined,
            cancelButton: undefined,
        },
    }),
    getConfirmButtons: (
        uiObjects: PlayerActionTargetStateMachineUIObjects
    ): Button[] => {
        return [
            uiObjects.confirm.okButton,
            uiObjects.confirm.cancelButton,
        ].filter((x) => x)
    },
}
