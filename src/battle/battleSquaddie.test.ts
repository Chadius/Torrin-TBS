import { BattleSquaddie, BattleSquaddieService } from "./battleSquaddie"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "./stats/inBattleAttributes"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import { SquaddieMovementService } from "../squaddie/movement"
import { ArmyAttributesService } from "../squaddie/armyAttributes"

describe("BattleSquaddie", () => {
    it("throws an error if battle squaddie has no template Id", () => {
        const shouldThrowError = () => {
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "battleSquaddieId",
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow("Battle Squaddie has no Squaddie Template Id")
    })
    it("throws an error if battle squaddie has no battle Id", () => {
        const shouldThrowError = () => {
            const badBattleSquaddie: BattleSquaddie =
                BattleSquaddieService.newBattleSquaddie({
                    squaddieTemplateId: "squaddieTemplateId",
                    battleSquaddieId: "",
                    squaddieTurn: { remainingActionPoints: 3 },
                })
            BattleSquaddieService.assertBattleSquaddie(badBattleSquaddie)
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow("Battle Squaddie has no Id")
    })
    describe("attributes", () => {
        let soldierTemplate: SquaddieTemplate
        let battleSoldier: BattleSquaddie

        beforeEach(() => {
            soldierTemplate = SquaddieTemplateService.new({
                squaddieId: {
                    templateId: "soldier_static",
                    name: "Soldier",
                    affiliation: SquaddieAffiliation.PLAYER,
                    traits: { booleanTraits: {} },
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                },
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 5,
                    armorClass: 2,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                }),
            })
        })

        it("will give battle squaddie defaults", () => {
            battleSoldier = BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "soldier_dynamic",
                squaddieTemplateId: soldierTemplate.squaddieId.templateId,
            })

            const defaultInBattleAttributes: InBattleAttributes =
                InBattleAttributesService.new({})

            expect(battleSoldier.inBattleAttributes).toStrictEqual(
                defaultInBattleAttributes
            )
        })

        it("will create in battle attributes based on the army attributes given", () => {
            expect(soldierTemplate.attributes.maxHitPoints).toBe(5)
            expect(soldierTemplate.attributes.armorClass).toBe(2)

            battleSoldier = BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "soldier_dynamic",
                squaddieTemplateId: soldierTemplate.squaddieId.templateId,
            })

            BattleSquaddieService.initializeInBattleAttributes(
                battleSoldier,
                soldierTemplate.attributes
            )

            expect(battleSoldier.squaddieTemplateId).toBe(
                soldierTemplate.squaddieId.templateId
            )
            expect(battleSoldier.inBattleAttributes.currentHitPoints).toBe(
                soldierTemplate.attributes.maxHitPoints
            )
        })

        it("will create in battle attributes based on the static squaddie army attributes upon creation", () => {
            expect(soldierTemplate.attributes.maxHitPoints).toBe(5)
            expect(soldierTemplate.attributes.armorClass).toBe(2)

            battleSoldier = BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "soldier_dynamic",
                squaddieTemplate: soldierTemplate,
            })

            expect(battleSoldier.squaddieTemplateId).toBe(
                soldierTemplate.squaddieId.templateId
            )
            expect(battleSoldier.inBattleAttributes.currentHitPoints).toBe(
                soldierTemplate.attributes.maxHitPoints
            )
        })

        it("Can be created with inBattleAttributes", () => {
            const newBattleSoldier = BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "soldier_dynamic",
                squaddieTemplateId: soldierTemplate.squaddieId.templateId,
                inBattleAttributes: InBattleAttributesService.new({
                    armyAttributes: ArmyAttributesService.new({
                        maxHitPoints: 9001,
                        movement: SquaddieMovementService.new({
                            movementPerAction: 2,
                        }),
                        armorClass: 0,
                    }),
                }),
            })

            expect(
                newBattleSoldier.inBattleAttributes.armyAttributes.maxHitPoints
            ).toBe(9001)
        })
    })
})
