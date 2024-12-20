import {
    AttributeType,
    AttributeTypeAndAmount,
} from "../../../squaddie/attributeModifier"
import { RollResultService } from "../../calculator/actionCalculator/rollResult"
import {
    BattleActionActionContext,
    BattleActionActionContextService,
} from "./battleActionActionContext"
import { describe, expect, it } from "vitest"

describe("Battle Action Action Context", () => {
    it("can be cloned to a separate object", () => {
        const actingSquaddieModifiers: AttributeTypeAndAmount[] = [
            {
                type: AttributeType.ARMOR,
                amount: 1,
            },
        ]

        const actingSquaddieRoll = RollResultService.new({
            occurred: true,
            rolls: [1, 3],
        })

        const targetSquaddieModifiers: {
            [squaddieId: string]: AttributeTypeAndAmount[]
        } = {
            target0: [
                {
                    type: AttributeType.ABSORB,
                    amount: 2,
                },
            ],
            target1: [
                {
                    type: AttributeType.ARMOR,
                    amount: 3,
                },
            ],
        }

        const original = BattleActionActionContextService.new({
            actingSquaddieModifiers,
            actingSquaddieRoll,
            targetSquaddieModifiers,
        })

        const clone: BattleActionActionContext =
            BattleActionActionContextService.clone(original)

        expect(clone).toEqual(original)

        original.actorAttributeModifiers = undefined
        original.actorRoll = undefined
        original.targetAttributeModifiers = undefined

        expect(clone.actorAttributeModifiers).toEqual(actingSquaddieModifiers)
        expect(clone.actorRoll).toEqual(actingSquaddieRoll)
        expect(clone.targetAttributeModifiers).toEqual(targetSquaddieModifiers)
    })
})
