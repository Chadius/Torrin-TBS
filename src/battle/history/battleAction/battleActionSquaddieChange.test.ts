import { DegreeOfSuccess } from "../../calculator/actionCalculator/degreeOfSuccess"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "./battleActionSquaddieChange"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../../squaddie/attribute/attributeModifier"
import { describe, expect, it } from "vitest"
import { Attribute } from "../../../squaddie/attribute/attribute"

describe("BattleActionSquaddieChange", () => {
    describe("knows when the result hinders the squaddie", () => {
        it("knows when the target is not hindered", () => {
            const changes: BattleActionSquaddieChange =
                BattleActionSquaddieChangeService.new({
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    damageExplanation: DamageExplanationService.new({
                        net: 0,
                    }),
                    battleSquaddieId: "target",
                })

            expect(
                BattleActionSquaddieChangeService.isSquaddieHindered(changes)
            ).toBeFalsy()
        })
        it("knows when the target took damage", () => {
            const changes: BattleActionSquaddieChange =
                BattleActionSquaddieChangeService.new({
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    damageExplanation: DamageExplanationService.new({
                        net: 1,
                    }),
                    battleSquaddieId: "target",
                })

            expect(
                BattleActionSquaddieChangeService.isSquaddieHindered(changes)
            ).toBeTruthy()
        })
    })
    describe("knows when the result helps the squaddie", () => {
        it("knows when the target is not helped", () => {
            const changes: BattleActionSquaddieChange =
                BattleActionSquaddieChangeService.new({
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    damageExplanation: DamageExplanationService.new({
                        net: 0,
                    }),
                    battleSquaddieId: "target",
                })

            expect(
                BattleActionSquaddieChangeService.isSquaddieHelped(changes)
            ).toBeFalsy()
        })
        it("knows when the target received healing", () => {
            const changes: BattleActionSquaddieChange =
                BattleActionSquaddieChangeService.new({
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    healingReceived: 1,
                    battleSquaddieId: "target",
                })

            expect(
                BattleActionSquaddieChangeService.isSquaddieHelped(changes)
            ).toBeTruthy()
        })
    })
    it("can be cloned to a separate object", () => {
        const battleSquaddieId = "original"
        const actorDegreeOfSuccess = DegreeOfSuccess.SUCCESS
        const damageExplanation = DamageExplanationService.new({
            net: 2,
            raw: 3,
            absorbed: 1,
        })
        const healingReceived = 5
        const attributesBefore = InBattleAttributesService.new({
            currentHitPoints: 5,
            attributeModifiers: [],
        })
        const attributesAfter = InBattleAttributesService.new({
            currentHitPoints: 3,
            attributeModifiers: [
                AttributeModifierService.new({
                    type: Attribute.ARMOR,
                    amount: 5,
                    source: AttributeSource.CIRCUMSTANCE,
                }),
            ],
        })
        const chanceOfDegreeOfSuccess = 10
        const original = BattleActionSquaddieChangeService.new({
            battleSquaddieId,
            actorDegreeOfSuccess,
            damageExplanation,
            healingReceived,
            attributesBefore,
            attributesAfter,
            chanceOfDegreeOfSuccess,
        })

        const clone: BattleActionSquaddieChange =
            BattleActionSquaddieChangeService.clone(original)

        expect(clone).toEqual(original)

        original.battleSquaddieId = undefined
        original.actorDegreeOfSuccess = undefined
        original.chanceOfDegreeOfSuccess = undefined
        original.damage = undefined
        original.healingReceived = undefined
        original.attributesBefore = undefined
        original.attributesAfter = undefined

        expect(clone.battleSquaddieId).toEqual(battleSquaddieId)
        expect(clone.actorDegreeOfSuccess).toEqual(actorDegreeOfSuccess)
        expect(clone.chanceOfDegreeOfSuccess).toEqual(chanceOfDegreeOfSuccess)
        expect(clone.damage).toEqual(damageExplanation)
        expect(clone.healingReceived).toEqual(healingReceived)
        expect(clone.attributesBefore).toEqual(attributesBefore)
        expect(clone.attributesAfter).toEqual(attributesAfter)
    })
})
