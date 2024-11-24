import { AttributeTypeAndAmount } from "../../../squaddie/attributeModifier"
import {
    RollResult,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"

export interface BattleActionActionContext {
    actorAttributeModifiers: AttributeTypeAndAmount[]
    actorRoll: RollResult
    targetAttributeModifiers: {
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
            actingSquaddieModifiers: original.actorAttributeModifiers,
            actingSquaddieRoll: original.actorRoll,
            targetSquaddieModifiers: original.targetAttributeModifiers,
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
    actorAttributeModifiers: actingSquaddieModifiers ?? [],
    targetAttributeModifiers: targetSquaddieModifiers ?? {},
    actorRoll:
        actingSquaddieRoll ??
        RollResultService.new({
            occurred: false,
            rolls: [],
        }),
})
