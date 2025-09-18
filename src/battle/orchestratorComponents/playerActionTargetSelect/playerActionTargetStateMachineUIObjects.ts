import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { BattleCamera } from "../../battleCamera"
import { Button } from "../../../ui/button/button"
import { ImageUI } from "../../../ui/imageUI/imageUI"
import { Label } from "../../../ui/label"
import { EnumLike } from "../../../utils/enum"

export const PlayerActionTargetSelectMapHighlight = {
    NONE: "NONE",
    ALL_VALID_COORDINATES: "ALL_VALID_COORDINATES",
    SELECTED_SQUADDIES_ONLY: "SELECTED_SQUADDIES_ONLY",
} as const satisfies Record<string, string>
export type TPlayerActionTargetSelectMapHighlight = EnumLike<
    typeof PlayerActionTargetSelectMapHighlight
>

export interface PlayerActionTargetStateMachineUIObjects {
    graphicsContext: GraphicsBuffer | undefined
    camera: BattleCamera | undefined
    mapHighlight: TPlayerActionTargetSelectMapHighlight
    confirm: {
        okButton: Button | undefined
        cancelButton: Button | undefined
    }
    selectTarget: {
        cancelButton: Button | undefined
        explanationLabel: Label | undefined
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
            uiObjects.confirm?.okButton,
            uiObjects.confirm?.cancelButton,
        ].filter((x) => x != undefined)
    },
}
