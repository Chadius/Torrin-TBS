import { AttributeTypeAndAmount } from "../../../squaddie/attributeModifier"
import {
    RollResult,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"

export interface BattleActionActorContext {
    actorAttributeModifiers: AttributeTypeAndAmount[]
    actorRoll: RollResult
    targetAttributeModifiers: {
        [squaddieId: string]: AttributeTypeAndAmount[]
    }
}

export const BattleActionActorContextService = {
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
    }): BattleActionActorContext =>
        newBattleActionActionContext({
            actingSquaddieModifiers,
            actingSquaddieRoll,
            targetSquaddieModifiers,
        }),
    clone: (original: BattleActionActorContext): BattleActionActorContext =>
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
}): BattleActionActorContext => ({
    actorAttributeModifiers: actingSquaddieModifiers ?? [],
    targetAttributeModifiers: targetSquaddieModifiers ?? {},
    actorRoll:
        actingSquaddieRoll ??
        RollResultService.new({
            occurred: false,
            rolls: [],
        }),
})
