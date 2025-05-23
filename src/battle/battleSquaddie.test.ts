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
import {
    ArmyAttributesService,
    ProficiencyLevel,
} from "../squaddie/armyAttributes"
import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieTurnService } from "../squaddie/turn"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"

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
                    squaddieTurn: SquaddieTurnService.new(),
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
                armor: {
                    proficiencyLevel: ProficiencyLevel.UNTRAINED,
                    base: 2,
                },
                movement: SquaddieMovementService.new({
                    movementPerAction: 2,
                }),
            }),
        })
    })

    describe("attributes", () => {
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
                    }),
                }),
            })

            expect(
                newBattleSoldier.inBattleAttributes.armyAttributes.maxHitPoints
            ).toBe(9001)
        })
    })
    describe("Begin New Turn", () => {
        let actionTemplate: ActionTemplate
        beforeEach(() => {
            actionTemplate = ActionTemplateService.new({
                id: "action",
                name: "action",
            })
            battleSoldier = BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "soldier_dynamic",
                squaddieTemplateId: soldierTemplate.squaddieId.templateId,
            })
        })

        it("will reduce cooldowns of all actions", () => {
            InBattleAttributesService.addActionCooldown({
                inBattleAttributes: battleSoldier.inBattleAttributes,
                actionTemplateId: actionTemplate.id,
                numberOfCooldownTurns: 3,
            })
            expect(
                InBattleAttributesService.getActionTurnsOfCooldown({
                    inBattleAttributes: battleSoldier.inBattleAttributes,
                    actionTemplateId: actionTemplate.id,
                })
            ).toEqual(3)
            BattleSquaddieService.beginNewTurn(battleSoldier)
            expect(
                InBattleAttributesService.getActionTurnsOfCooldown({
                    inBattleAttributes: battleSoldier.inBattleAttributes,
                    actionTemplateId: actionTemplate.id,
                })
            ).toEqual(2)
        })
    })
})
