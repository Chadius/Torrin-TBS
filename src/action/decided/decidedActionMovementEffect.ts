import { ActionEffectMovementTemplate } from "../template/actionEffectMovementTemplate"
import { ActionEffectType } from "../template/actionEffectTemplate"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { isValidValue } from "../../utils/validityCheck"

export interface DecidedActionMovementEffect {
    type: ActionEffectType.MOVEMENT
    destination: HexCoordinate
}

export const DecidedActionMovementEffectService = {
    new: ({
        template,
        destination,
    }: {
        template: ActionEffectMovementTemplate
        destination?: HexCoordinate
    }): DecidedActionMovementEffect => {
        return {
            type: ActionEffectType.MOVEMENT,
            destination,
        }
    },
    areDecisionsRequired: (effect: DecidedActionMovementEffect): boolean => {
        return !isValidValue(effect.destination)
    },
}
