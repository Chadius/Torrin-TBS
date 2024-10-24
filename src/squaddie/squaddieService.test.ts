import { SquaddieAffiliation } from "./squaddieAffiliation"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { BattleSquaddie } from "../battle/battleSquaddie"
import { DamageType, HealingType, SquaddieService } from "./squaddieService"
import { DefaultArmyAttributes } from "./armyAttributes"
import { SquaddieTemplate } from "../campaign/squaddieTemplate"
import { SquaddieTurnService } from "./turn"
import { SquaddieRepositoryService } from "../utils/test/squaddie"
import { InBattleAttributesService } from "../battle/stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "./attributeModifier"
import { DamageExplanation } from "../battle/history/battleAction/battleActionSquaddieChange"

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
            attributes: {
                ...DefaultArmyAttributes(),
                ...{
                    armorClass: 3,
                    maxHitPoints: 5,
                },
            },
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

    describe("Turns Remaining", () => {
        it("returns the number of action points", () => {
            let { actionPointsRemaining } =
                SquaddieService.getNumberOfActionPoints({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                })
            expect(actionPointsRemaining).toBe(3)

            SquaddieTurnService.spendActionPoints(
                playerBattleSquaddie.squaddieTurn,
                1
            )
            ;({ actionPointsRemaining: actionPointsRemaining } =
                SquaddieService.getNumberOfActionPoints({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                }))
            expect(actionPointsRemaining).toBe(2)
        })
    })

    describe("Current Armor Class", () => {
        it("Returns the normal armor class", () => {
            let { normalArmorClass } = SquaddieService.getArmorClass({
                squaddieTemplate: playerSquaddieTemplate,
                battleSquaddie: playerBattleSquaddie,
            })

            expect(normalArmorClass).toBe(3)
        })
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
                damageType: DamageType.BODY,
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
                    type: AttributeType.ABSORB,
                    amount: 1,
                    source: AttributeSource.CIRCUMSTANCE,
                })
            )
            let attributeTypeAndAmounts =
                InBattleAttributesService.calculateCurrentAttributeModifiers(
                    playerBattleSquaddie.inBattleAttributes
                )
            expect(
                attributeTypeAndAmounts.find(
                    (a) => a.type === AttributeType.ABSORB
                ).amount
            ).toBe(1)

            let damageExplanation: DamageExplanation =
                SquaddieService.calculateDealtDamageToTheSquaddie({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                    damage: 1,
                    damageType: DamageType.BODY,
                })
            expect(damageExplanation.raw).toBe(1)
            expect(damageExplanation.absorbed).toBe(1)
            expect(damageExplanation.net).toBe(0)

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
                attributeTypeAndAmounts.find(
                    (a) => a.type === AttributeType.ABSORB
                ).amount
            ).toBe(1)
        })
        it("can give healing to the squaddie", () => {
            InBattleAttributesService.takeDamage({
                inBattleAttributes: playerBattleSquaddie.inBattleAttributes,
                damageToTake: 2,
                damageType: DamageType.BODY,
            })

            let { healingReceived } = SquaddieService.giveHealingToTheSquaddie({
                battleSquaddie: playerBattleSquaddie,
                healingAmount: 1,
                healingType: HealingType.LOST_HIT_POINTS,
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
                healingType: HealingType.LOST_HIT_POINTS,
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
                damageType: DamageType.BODY,
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
            let { canAct, hasActionPointsRemaining, isDead } =
                SquaddieService.canSquaddieActRightNow({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                })

            expect(canAct).toBeTruthy()
            expect(hasActionPointsRemaining).toBeTruthy()
            expect(isDead).toBeFalsy()
        })
        it("cannot act because it is out of actions", () => {
            SquaddieTurnService.spendActionPoints(
                playerBattleSquaddie.squaddieTurn,
                3
            )
            let { canAct, hasActionPointsRemaining } =
                SquaddieService.canSquaddieActRightNow({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                })

            expect(canAct).toBeFalsy()
            expect(hasActionPointsRemaining).toBeFalsy()
        })
        it("knows a squaddie without hit points cannot act", () => {
            InBattleAttributesService.takeDamage({
                inBattleAttributes: playerBattleSquaddie.inBattleAttributes,
                damageToTake:
                    playerBattleSquaddie.inBattleAttributes.currentHitPoints *
                    2,
                damageType: DamageType.BODY,
            })

            let { canAct, hasActionPointsRemaining, isDead } =
                SquaddieService.canSquaddieActRightNow({
                    squaddieTemplate: playerSquaddieTemplate,
                    battleSquaddie: playerBattleSquaddie,
                })

            expect(canAct).toBeFalsy()
            expect(hasActionPointsRemaining).toBeFalsy()
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
            SquaddieTurnService.spendActionPoints(
                playerBattleSquaddie.squaddieTurn,
                3
            )
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
                damageType: DamageType.BODY,
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
})
