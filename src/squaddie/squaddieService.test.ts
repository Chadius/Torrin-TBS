import { SquaddieAffiliation } from "./squaddieAffiliation"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { BattleSquaddie, BattleSquaddieService } from "../battle/battleSquaddie"
import { Damage, Healing, SquaddieService } from "./squaddieService"
import { ArmyAttributesService, ProficiencyLevel } from "./armyAttributes"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import { SquaddieTurnService } from "./turn"
import { SquaddieRepositoryService } from "../utils/test/squaddie"
import { InBattleAttributesService } from "../battle/stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
} from "./attribute/attributeModifier"
import { DamageExplanation } from "../battle/history/battleAction/battleActionSquaddieChange"
import { ActionTemplateService } from "../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../action/template/actionEffectTemplate"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import { SquaddieIdService } from "./id"
import { SquaddieMovement, SquaddieMovementService } from "./movement"
import { beforeEach, describe, expect, it } from "vitest"
import { Attribute } from "./attribute/attribute"

describe("Squaddie Service", () => {
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie
    let enemyStatic: SquaddieTemplate
    let enemyDynamic: BattleSquaddie
    let squaddieRepository: ObjectRepository

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryService.new()
        ;({
            squaddieTemplate: playerSquaddieTemplate,
            battleSquaddie: playerBattleSquaddie,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            actionTemplateIds: [],
            name: "Player",
            templateId: "player",
            battleId: "player",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: squaddieRepository,
            attributes: ArmyAttributesService.new({
                armor: {
                    proficiencyLevel: ProficiencyLevel.UNTRAINED,
                    base: 3,
                },
                maxHitPoints: 5,
            }),
        }))
        ;({ squaddieTemplate: enemyStatic, battleSquaddie: enemyDynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                actionTemplateIds: [],
                name: "Enemy",
                templateId: "enemy",
                battleId: "enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: squaddieRepository,
            }))
    })

    describe("Current Armor Class", () => {
        it("Returns the net armor class as armor base bonus +6", () => {
            let { net } = SquaddieService.getArmorClass({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(net).toBe(9)
        })

        it("Adds the tier to the net armor class if the squaddie is trained", () => {
            playerSquaddieTemplate.attributes.tier = 1
            playerSquaddieTemplate.attributes.armor.proficiencyLevel =
                ProficiencyLevel.NOVICE

            let { net, initial } = SquaddieService.getArmorClass({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(initial).toBe(9)
            expect(net).toBe(11)
        })

        it("Does not add the tier to the net armor class if the squaddie is untrained", () => {
            playerSquaddieTemplate.attributes.tier = 9001
            playerSquaddieTemplate.attributes.armor.proficiencyLevel =
                ProficiencyLevel.UNTRAINED

            let { net, initial } = SquaddieService.getArmorClass({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(initial).toBe(9)
            expect(net).toBe(9)
        })

        describe("Add the armor proficiency", () => {
            const tests = [
                {
                    proficiencyLevel: ProficiencyLevel.UNTRAINED,
                    proficiencyBonus: 0,
                },
                {
                    proficiencyLevel: ProficiencyLevel.NOVICE,
                    proficiencyBonus: 1,
                },
                {
                    proficiencyLevel: ProficiencyLevel.EXPERT,
                    proficiencyBonus: 2,
                },
                {
                    proficiencyLevel: ProficiencyLevel.MASTER,
                    proficiencyBonus: 3,
                },
                {
                    proficiencyLevel: ProficiencyLevel.LEGENDARY,
                    proficiencyBonus: 4,
                },
            ]
            it.each(tests)(
                `$proficiencyLevel: $proficiencyBonus`,
                ({ proficiencyLevel, proficiencyBonus }) => {
                    playerSquaddieTemplate.attributes.armor.proficiencyLevel =
                        proficiencyLevel

                    let { net, initial } = SquaddieService.getArmorClass({
                        squaddieTemplate: playerSquaddieTemplate,
                        battleSquaddie: playerBattleSquaddie,
                    })

                    expect(initial).toBe(9)
                    expect(net).toBe(9 + proficiencyBonus)
                }
            )
        })
    })

    describe("Attack bonus against armor", () => {
        it("should not apply tier if the squaddie is untrained", () => {
            playerSquaddieTemplate.attributes.tier = 1
            playerSquaddieTemplate.attributes.versusProficiencyLevels[
                VersusSquaddieResistance.ARMOR
            ] = ProficiencyLevel.UNTRAINED

            let { net, initial } =
                SquaddieService.getVersusSquaddieResistanceProficiencyBonus({
                    squaddieTemplate: playerSquaddieTemplate,
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                })

            expect(initial).toBe(0)
            expect(net).toBe(0)
        })

        const tests = [
            {
                proficiencyLevel: ProficiencyLevel.NOVICE,
                proficiencyBonus: 1,
            },
            {
                proficiencyLevel: ProficiencyLevel.EXPERT,
                proficiencyBonus: 2,
            },
            {
                proficiencyLevel: ProficiencyLevel.MASTER,
                proficiencyBonus: 3,
            },
            {
                proficiencyLevel: ProficiencyLevel.LEGENDARY,
                proficiencyBonus: 4,
            },
        ]
        it.each(tests)(
            `$proficiencyLevel: $proficiencyBonus`,
            ({ proficiencyLevel, proficiencyBonus }) => {
                playerSquaddieTemplate.attributes.tier = 1
                playerSquaddieTemplate.attributes.versusProficiencyLevels[
                    VersusSquaddieResistance.ARMOR
                ] = proficiencyLevel

                let { net, initial } =
                    SquaddieService.getVersusSquaddieResistanceProficiencyBonus(
                        {
                            squaddieTemplate: playerSquaddieTemplate,
                            versusSquaddieResistance:
                                VersusSquaddieResistance.ARMOR,
                        }
                    )

                expect(initial).toBe(1)
                expect(net).toBe(1 + proficiencyBonus)
            }
        )
    })

    describe("Current Hit Points", () => {
        it("Returns the maximum HP", () => {
            let { maxHitPoints, currentHitPoints } =
                SquaddieService.getHitPoints({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                })

            expect(maxHitPoints).toBe(maxHitPoints)
            expect(currentHitPoints).toBe(maxHitPoints)
        })
        it("can deal damage to the squaddie", () => {
            const { net: damageTaken } = InBattleAttributesService.takeDamage({
                inBattleAttributes: playerBattleSquaddie.inBattleAttributes,
                damageToTake: 1,
                damageType: Damage.BODY,
            })

            expect(damageTaken).toBe(1)

            let { maxHitPoints, currentHitPoints } =
                SquaddieService.getHitPoints({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                })

            expect(maxHitPoints).toBe(maxHitPoints)
            expect(currentHitPoints).toBe(maxHitPoints - damageTaken)
        })
        it("can calculate the dealt damage without changing the squaddie resources", () => {
            InBattleAttributesService.addActiveAttributeModifier(
                playerBattleSquaddie.inBattleAttributes,
                AttributeModifierService.new({
                    type: Attribute.ABSORB,
                    amount: 1,
                    source: AttributeSource.CIRCUMSTANCE,
                })
            )
            let attributeTypeAndAmounts =
                InBattleAttributesService.calculateCurrentAttributeModifiers(
                    playerBattleSquaddie.inBattleAttributes
                )
            expect(
                attributeTypeAndAmounts.find((a) => a.type === Attribute.ABSORB)
                    .amount
            ).toBe(1)

            let damageExplanation: DamageExplanation =
                SquaddieService.calculateDealtDamageToTheSquaddie({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                    damage: 1,
                    damageType: Damage.BODY,
                })
            expect(damageExplanation.raw).toBe(1)
            expect(damageExplanation.absorbed).toBe(1)
            expect(damageExplanation.net).toBe(0)
            expect(damageExplanation.willKo).toBeFalsy()

            let { maxHitPoints, currentHitPoints } =
                SquaddieService.getHitPoints({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                })

            expect(maxHitPoints).toBe(maxHitPoints)
            expect(currentHitPoints).toBe(maxHitPoints)

            attributeTypeAndAmounts =
                InBattleAttributesService.calculateCurrentAttributeModifiers(
                    playerBattleSquaddie.inBattleAttributes
                )
            expect(
                attributeTypeAndAmounts.find((a) => a.type === Attribute.ABSORB)
                    .amount
            ).toBe(1)
        })
        it("can give healing to the squaddie", () => {
            InBattleAttributesService.takeDamage({
                inBattleAttributes: playerBattleSquaddie.inBattleAttributes,
                damageToTake: 2,
                damageType: Damage.BODY,
            })

            let { healingReceived } = SquaddieService.giveHealingToTheSquaddie({
                battleSquaddie: playerBattleSquaddie,
                healingAmount: 1,
                healingType: Healing.LOST_HIT_POINTS,
            })
            expect(healingReceived).toBe(1)

            let { maxHitPoints, currentHitPoints } =
                SquaddieService.getHitPoints({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                })

            expect(maxHitPoints).toBe(maxHitPoints)
            expect(currentHitPoints).toBe(maxHitPoints - 2 + 1)
            ;({ healingReceived } = SquaddieService.giveHealingToTheSquaddie({
                battleSquaddie: playerBattleSquaddie,
                healingAmount: 9001,
                healingType: Healing.LOST_HIT_POINTS,
            }))
            expect(healingReceived).toBe(1)
            ;({ currentHitPoints } = SquaddieService.getHitPoints({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            }))

            expect(currentHitPoints).toBe(maxHitPoints)
        })
    })

    describe("Squaddie is Dead", () => {
        it("knows squaddies are alive by default", () => {
            const squaddieIsAlive = SquaddieService.isSquaddieAlive({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(squaddieIsAlive).toBeTruthy()
        })
        it("knows the squaddie is dead due to zero Hit Points", () => {
            InBattleAttributesService.takeDamage({
                inBattleAttributes: playerBattleSquaddie.inBattleAttributes,
                damageToTake:
                    playerBattleSquaddie.inBattleAttributes.currentHitPoints *
                    2,
                damageType: Damage.BODY,
            })

            const squaddieIsAlive = SquaddieService.isSquaddieAlive({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(squaddieIsAlive).toBeFalsy()
        })
    })

    describe("Squaddie can still act", () => {
        it("can act by default", () => {
            let { canAct, isDead } = SquaddieService.canSquaddieActRightNow({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(canAct).toBeTruthy()
            expect(isDead).toBeFalsy()
        })
        it("cannot act because it is out of refundable action points", () => {
            SquaddieTurnService.setSpentMovementActionPointsAsNotRefundable({
                squaddieTurn: playerBattleSquaddie.squaddieTurn,
                endTurn: true,
            })
            let { canAct } = SquaddieService.canSquaddieActRightNow({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(canAct).toBeFalsy()
        })
        it("can act because it has action points it can refund", () => {
            SquaddieTurnService.setMovementActionPointsSpentButCanBeRefunded({
                squaddieTurn: playerBattleSquaddie.squaddieTurn,
                actionPoints: 3,
            })
            let { canAct } = SquaddieService.canSquaddieActRightNow({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(canAct).toBe(true)
        })
        it("knows a squaddie without hit points cannot act", () => {
            InBattleAttributesService.takeDamage({
                inBattleAttributes: playerBattleSquaddie.inBattleAttributes,
                damageToTake:
                    playerBattleSquaddie.inBattleAttributes.currentHitPoints *
                    2,
                damageType: Damage.BODY,
            })

            let { canAct, isDead } = SquaddieService.canSquaddieActRightNow({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(canAct).toBeFalsy()
            expect(isDead).toBeTruthy()
        })
    })

    describe("Player can control", () => {
        it("checks when the player controlled squaddie has actions", () => {
            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
                squaddieIsNormallyControllableByPlayer,
            } = SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(squaddieHasThePlayerControlledAffiliation).toBeTruthy()
            expect(squaddieCanCurrentlyAct).toBeTruthy()
            expect(playerCanControlThisSquaddieRightNow).toBeTruthy()
            expect(squaddieIsNormallyControllableByPlayer).toBeTruthy()
        })
        it("checks when the player controlled squaddie has no actions", () => {
            SquaddieTurnService.spendPreviewedMovementActionPointsToRefundable({
                squaddieTurn: playerBattleSquaddie.squaddieTurn,
            })
            SquaddieTurnService.setSpentMovementActionPointsAsNotRefundable({
                squaddieTurn: playerBattleSquaddie.squaddieTurn,
                endTurn: true,
            })
            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
                squaddieIsNormallyControllableByPlayer,
            } = SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })
            expect(squaddieHasThePlayerControlledAffiliation).toBeTruthy()
            expect(squaddieCanCurrentlyAct).toBeFalsy()
            expect(playerCanControlThisSquaddieRightNow).toBeFalsy()
            expect(squaddieIsNormallyControllableByPlayer).toBeTruthy()
        })
        it("checks when the enemy controlled squaddie has actions", () => {
            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
                squaddieIsNormallyControllableByPlayer,
            } = SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate: enemyStatic,
                battleSquaddie: enemyDynamic,
            })
            expect(squaddieHasThePlayerControlledAffiliation).toBeFalsy()
            expect(squaddieCanCurrentlyAct).toBeTruthy()
            expect(playerCanControlThisSquaddieRightNow).toBeFalsy()
            expect(squaddieIsNormallyControllableByPlayer).toBeFalsy()
        })
        it("knows a squaddie without hit points cannot be controlled", () => {
            InBattleAttributesService.takeDamage({
                inBattleAttributes: playerBattleSquaddie.inBattleAttributes,
                damageToTake:
                    playerBattleSquaddie.inBattleAttributes.currentHitPoints *
                    2,
                damageType: Damage.BODY,
            })

            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
                squaddieIsNormallyControllableByPlayer,
            } = SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(squaddieHasThePlayerControlledAffiliation).toBeTruthy()
            expect(squaddieCanCurrentlyAct).toBeFalsy()
            expect(playerCanControlThisSquaddieRightNow).toBeFalsy()
            expect(squaddieIsNormallyControllableByPlayer).toBeFalsy()
        })
    })

    describe("Can return actions aimed at different types of squaddies", () => {
        let objectRepository: ObjectRepository
        let squaddieTemplate: SquaddieTemplate
        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.new({
                    id: "targetSelf",
                    name: "targetSelf",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                            },
                        }),
                    ],
                })
            )
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.new({
                    id: "targetFoe",
                    name: "targetFoe",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                            },
                        }),
                    ],
                })
            )
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.new({
                    id: "targetAlly",
                    name: "targetAlly",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                            },
                        }),
                    ],
                })
            )
            ;({ squaddieTemplate } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    templateId: "playerSquaddie",
                    battleId: "playerSquaddie",
                    name: "playerSquaddie",
                    affiliation: SquaddieAffiliation.PLAYER,
                    actionTemplateIds: [
                        "targetSelf",
                        "targetAlly",
                        "targetFoe",
                    ],
                }))
        })

        it("can get squaddies that aim at allies", () => {
            expect(
                SquaddieService.getActionsThatTargetAlly({
                    objectRepository,
                    squaddieTemplate,
                })
            ).toEqual(["targetAlly"])
        })

        it("can get squaddies that aim at foes", () => {
            expect(
                SquaddieService.getActionsThatTargetFoe({
                    objectRepository,
                    squaddieTemplate,
                })
            ).toEqual(["targetFoe"])
        })

        it("can get squaddies that aim at self", () => {
            expect(
                SquaddieService.getActionsThatTargetSelf({
                    objectRepository,
                    squaddieTemplate,
                })
            ).toEqual(["targetSelf"])
        })
    })

    describe("Can give current movement attributes", () => {
        const createSquaddieWithSquaddieMovement = (
            movement: SquaddieMovement
        ) => {
            const squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    squaddieTemplateId: "battleSquaddie",
                    name: "battleSquaddie",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                attributes: ArmyAttributesService.new({
                    movement,
                }),
            })
            const battleSquaddie = BattleSquaddieService.new({
                squaddieTemplateId: "battleSquaddie",
                battleSquaddieId: "battleSquaddie",
            })

            return {
                battleSquaddie,
                squaddieTemplate,
            }
        }

        it("gives the squaddie template movement attributes by default", () => {
            const {
                squaddieTemplate: squaddieTemplateWithNormalMovement,
                battleSquaddie: battleSquaddieWithNormalMovement,
            } = createSquaddieWithSquaddieMovement(
                SquaddieMovementService.new({
                    movementPerAction: 9001,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.CROSS_OVER_PITS]: false,
                        [Trait.PASS_THROUGH_WALLS]: false,
                    }),
                })
            )

            const squaddieMovementAttributes =
                SquaddieService.getSquaddieMovementAttributes({
                    battleSquaddie: battleSquaddieWithNormalMovement,
                    squaddieTemplate: squaddieTemplateWithNormalMovement,
                })

            expect(squaddieMovementAttributes).toEqual({
                initial: {
                    movementPerAction: 9001,
                    crossOverPits: false,
                    passThroughWalls: false,
                    ignoreTerrainCost: false,
                },
                net: {
                    movementPerAction: 9001,
                    crossOverPits: false,
                    passThroughWalls: false,
                    ignoreTerrainCost: false,
                },
            })
        })

        it("uses the MOVEMENT attribute modifier to increase movement", () => {
            const {
                squaddieTemplate: squaddieTemplateWithMovementUp2,
                battleSquaddie: battleSquaddieWithMovementUp2,
            } = createSquaddieWithSquaddieMovement(
                SquaddieMovementService.new({
                    movementPerAction: 1,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.CROSS_OVER_PITS]: true,
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                })
            )

            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddieWithMovementUp2.inBattleAttributes,
                AttributeModifierService.new({
                    type: Attribute.MOVEMENT,
                    duration: 1,
                    amount: 2,
                    source: AttributeSource.CIRCUMSTANCE,
                })
            )

            const squaddieMovementAttributes =
                SquaddieService.getSquaddieMovementAttributes({
                    battleSquaddie: battleSquaddieWithMovementUp2,
                    squaddieTemplate: squaddieTemplateWithMovementUp2,
                })

            expect(squaddieMovementAttributes).toEqual({
                initial: {
                    movementPerAction: 1,
                    crossOverPits: true,
                    passThroughWalls: true,
                    ignoreTerrainCost: false,
                },
                net: {
                    movementPerAction: 3,
                    crossOverPits: true,
                    passThroughWalls: true,
                    ignoreTerrainCost: false,
                },
            })
        })

        it("uses HUSTLE attribute modifier to modify net movement", () => {
            const {
                squaddieTemplate: squaddieTemplateWithIgnoreTerrainCost,
                battleSquaddie: battleSquaddieWithIgnoreTerrainCost,
            } = createSquaddieWithSquaddieMovement(
                SquaddieMovementService.new({
                    movementPerAction: 1,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.CROSS_OVER_PITS]: false,
                        [Trait.PASS_THROUGH_WALLS]: false,
                    }),
                })
            )

            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddieWithIgnoreTerrainCost.inBattleAttributes,
                AttributeModifierService.new({
                    type: Attribute.HUSTLE,
                    duration: 1,
                    amount: 1,
                    source: AttributeSource.CIRCUMSTANCE,
                })
            )

            const squaddieMovementAttributes =
                SquaddieService.getSquaddieMovementAttributes({
                    battleSquaddie: battleSquaddieWithIgnoreTerrainCost,
                    squaddieTemplate: squaddieTemplateWithIgnoreTerrainCost,
                })

            expect(squaddieMovementAttributes).toEqual({
                initial: {
                    movementPerAction: 1,
                    crossOverPits: false,
                    passThroughWalls: false,
                    ignoreTerrainCost: false,
                },
                net: {
                    movementPerAction: 1,
                    crossOverPits: false,
                    passThroughWalls: false,
                    ignoreTerrainCost: true,
                },
            })
        })
    })
})
