import {
    RollResult,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"
import { AttributeTypeAndAmount } from "../../../squaddie/attribute/attribute"

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
            [_: string]: AttributeTypeAndAmount[]
        }
    }): BattleActionActorContext =>
        newBattleActionActionContext({
            actingAttributeModifiers: actingSquaddieModifiers,
            actingSquaddieRoll,
            targetAttributeModifiers: targetSquaddieModifiers,
        }),
}

const newBattleActionActionContext = ({
    actingAttributeModifiers,
    actingSquaddieRoll,
    targetAttributeModifiers,
}: {
    actingAttributeModifiers?: AttributeTypeAndAmount[]
    actingSquaddieRoll?: RollResult
    targetAttributeModifiers?: {
        [_: string]: AttributeTypeAndAmount[]
    }
}): BattleActionActorContext => ({
    actorAttributeModifiers: actingAttributeModifiers ?? [],
    targetAttributeModifiers: targetAttributeModifiers ?? {},
    actorRoll:
        actingSquaddieRoll ??
        RollResultService.new({
            occurred: false,
            rolls: [],
        }),
})
