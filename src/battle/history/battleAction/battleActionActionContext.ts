import { AttributeTypeAndAmount } from "../../../squaddie/attributeModifier"
import { RollResult } from "../../calculator/actionCalculator/rollResult"

export interface BattleActionActionContext {
    actingSquaddieModifiers: AttributeTypeAndAmount[]
    actingSquaddieRoll: RollResult
    targetSquaddieModifiers: {
        [squaddieId: string]: AttributeTypeAndAmount[]
    }
}

export const BattleActionActionContextService = {
    new: ({
        actingSquaddieModifiers,
        actingSquaddieRoll,
        targetSquaddieModifiers,
    }: {
        actingSquaddieModifiers?: AttributeTypeAndAmount[]
        actingSquaddieRoll?: RollResult
        targetSquaddieModifiers?: {
            [squaddieId: string]: AttributeTypeAndAmount[]
        }
    }): BattleActionActionContext =>
        newBattleActionActionContext({
            actingSquaddieModifiers,
            actingSquaddieRoll,
            targetSquaddieModifiers,
        }),
    clone: (original: BattleActionActionContext): BattleActionActionContext =>
        newBattleActionActionContext({
            actingSquaddieModifiers: original.actingSquaddieModifiers,
            actingSquaddieRoll: original.actingSquaddieRoll,
            targetSquaddieModifiers: original.targetSquaddieModifiers,
        }),
}

const newBattleActionActionContext = ({
    actingSquaddieModifiers,
    actingSquaddieRoll,
    targetSquaddieModifiers,
}: {
    actingSquaddieModifiers?: AttributeTypeAndAmount[]
    actingSquaddieRoll?: RollResult
    targetSquaddieModifiers?: {
        [squaddieId: string]: AttributeTypeAndAmount[]
    }
}): BattleActionActionContext => ({
    actingSquaddieModifiers: actingSquaddieModifiers ?? [],
    targetSquaddieModifiers: targetSquaddieModifiers ?? {},
    actingSquaddieRoll: actingSquaddieRoll ?? {
        occurred: false,
        rolls: [],
    },
})
