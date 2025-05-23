import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { BattleCamera } from "../../battleCamera"
import { Button } from "../../../ui/button/button"
import { ImageUI } from "../../../ui/imageUI/imageUI"
import { Label } from "../../../ui/label"

export enum PlayerActionTargetSelectMapHighlight {
    NONE = "NONE",
    ALL_VALID_COORDINATES = "ALL_VALID_COORDINATES",
    SELECTED_SQUADDIES_ONLY = "SELECTED_SQUADDIES_ONLY",
}

export interface PlayerActionTargetStateMachineUIObjects {
    graphicsContext: GraphicsBuffer
    camera: BattleCamera
    mapHighlight: PlayerActionTargetSelectMapHighlight
    confirm: {
        okButton: Button
        cancelButton: Button
    }
    selectTarget: {
        cancelButton: Button
        explanationLabel: Label
    }
    mapIcons: {
        actor: {
            mapIcon?: ImageUI
            hasTinted: boolean
        }
        targets: {
            mapIcons: ImageUI[]
            hasTinted: boolean
        }
    }
}

export const PlayerActionTargetStateMachineUIObjectsService = {
    empty: (): PlayerActionTargetStateMachineUIObjects => ({
        camera: undefined,
        graphicsContext: undefined,
        mapHighlight: PlayerActionTargetSelectMapHighlight.NONE,
        confirm: {
            okButton: undefined,
            cancelButton: undefined,
        },
        selectTarget: {
            cancelButton: undefined,
            explanationLabel: undefined,
        },
        mapIcons: {
            actor: {
                mapIcon: undefined,
                hasTinted: false,
            },
            targets: {
                mapIcons: [],
                hasTinted: false,
            },
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
