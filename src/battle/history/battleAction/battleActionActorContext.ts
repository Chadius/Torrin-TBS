import {
    RollResult,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"
import { AttributeTypeAndAmount } from "../../../squaddie/attribute/attributeType"

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
            actingSquaddieModifiers,
            actingSquaddieRoll,
            targetSquaddieModifiers,
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
        [_: string]: AttributeTypeAndAmount[]
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
