import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
    AttributeTypeAndAmount,
} from "../../../squaddie/attributeModifier"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "./battleActionSquaddieChange"
import { RollResultService } from "../../calculator/actionCalculator/rollResult"
import {
    BattleActionActionContext,
    BattleActionActionContextService,
} from "./battleActionActionContext"

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

        original.actingSquaddieModifiers = undefined
        original.actingSquaddieRoll = undefined
        original.targetSquaddieModifiers = undefined

        expect(clone.actingSquaddieModifiers).toEqual(actingSquaddieModifiers)
        expect(clone.actingSquaddieRoll).toEqual(actingSquaddieRoll)
        expect(clone.targetSquaddieModifiers).toEqual(targetSquaddieModifiers)
    })
})
