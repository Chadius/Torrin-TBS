import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie } from "../battleSquaddie"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { ActionResultTextService } from "./actionResultTextService"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../../action/template/actionEffectTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../history/battleAction/battleActionSquaddieChange"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../squaddie/attribute/attributeModifier"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { BattleActionActorContextService } from "../history/battleAction/battleActionActorContext"
import { TargetConstraintsService } from "../../action/targetConstraints"
import {
    RollModifierEnum,
    RollResultService,
} from "../calculator/actionCalculator/rollResult"
import { ActionResourceCostService } from "../../action/actionResourceCost"
import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieService } from "../../squaddie/squaddieService"
import { Attribute } from "../../squaddie/attribute/attribute"

describe("Action Result Text Writer", () => {
    let squaddieRepository: ObjectRepository = ObjectRepositoryService.new()
    let knightStatic: SquaddieTemplate
    let knightDynamic: BattleSquaddie
    let citizenBattleSquaddie: BattleSquaddie
    let thiefStatic: SquaddieTemplate
    let thiefDynamic: BattleSquaddie
    let rogueStatic: SquaddieTemplate
    let rogueDynamic: BattleSquaddie
    let battleMap: MissionMap
    let longswordSweepAction: ActionTemplate
    let bandageWoundsAction: ActionTemplate

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryService.new()
        battleMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })

        longswordSweepAction = ActionTemplateService.new({
            id: "longsword",
            name: "Longsword Sweep",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })

        bandageWoundsAction = ActionTemplateService.new({
            id: "Bandages",
            name: "Bandage Wounds",
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.HEALING]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                    }),
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                    },
                }),
            ],
        })
        ;({ squaddieTemplate: knightStatic, battleSquaddie: knightDynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Knight",
                templateId: "Knight",
                battleId: "Knight 0",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: squaddieRepository,
                actionTemplateIds: [
                    longswordSweepAction.id,
                    bandageWoundsAction.id,
                ],
            }))

        MissionMapService.addSquaddie({
            missionMap: battleMap,
            battleSquaddieId: knightDynamic.battleSquaddieId,
            squaddieTemplateId: knightStatic.squaddieId.templateId,
            originMapCoordinate: { q: 1, r: 1 },
        })
        ;({ battleSquaddie: citizenBattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Citizen",
                templateId: "Citizen",
                battleId: "Citizen 0",
                affiliation: SquaddieAffiliation.ALLY,
                objectRepository: squaddieRepository,
                actionTemplateIds: [],
            }))
        ;({ squaddieTemplate: thiefStatic, battleSquaddie: thiefDynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Thief",
                templateId: "Thief",
                battleId: "Thief 0",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: squaddieRepository,
                actionTemplateIds: [],
            }))

        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: thiefStatic.squaddieId.templateId,
            battleSquaddieId: thiefDynamic.battleSquaddieId,
            originMapCoordinate: { q: 1, r: 2 },
        })
        ;({ squaddieTemplate: rogueStatic, battleSquaddie: rogueDynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Rogue",
                templateId: "Rogue",
                battleId: "Rogue 1",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: squaddieRepository,
                actionTemplateIds: [],
            }))

        MissionMapService.addSquaddie({
            missionMap: battleMap,
            battleSquaddieId: rogueStatic.squaddieId.templateId,
            squaddieTemplateId: rogueDynamic.battleSquaddieId,
            originMapCoordinate: { q: 1, r: 2 },
        })
    })

    it("Explains how much damage occurred", () => {
        const damagingChanges: BattleActionSquaddieChange[] = [
            BattleActionSquaddieChangeService.new({
                battleSquaddieId: thiefDynamic.battleSquaddieId,
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 1,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
            }),
            BattleActionSquaddieChangeService.new({
                battleSquaddieId: rogueDynamic.battleSquaddieId,
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 1,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
            }),
        ]

        const outputStrings: string[] =
            ActionResultTextService.outputResultForTextOnly({
                actionTemplateName: longswordSweepAction.name,
                currentActionEffectTemplate:
                    longswordSweepAction.actionEffectTemplates[0],
                battleActionSquaddieChanges: damagingChanges,
                squaddieRepository,
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: true,
                        rolls: [2, 6],
                    }),
                    actingSquaddieModifiers: [],
                }),
            })

        expect(outputStrings).toHaveLength(5)
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
        expect(outputStrings[1]).toBe("   rolls (2, 6)")
        expect(outputStrings[2]).toBe(" Total 8")
        expect(outputStrings[3]).toBe("Thief takes 1 damage")
        expect(outputStrings[4]).toBe("Rogue takes 1 damage")
    })

    it("Explains how much healing was received", () => {
        const healingChanges = [
            BattleActionSquaddieChangeService.new({
                battleSquaddieId: knightDynamic.battleSquaddieId,
                damageExplanation: DamageExplanationService.new({
                    net: 0,
                }),
                healingReceived: 1,
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
            }),
            BattleActionSquaddieChangeService.new({
                battleSquaddieId: citizenBattleSquaddie.battleSquaddieId,
                damageExplanation: DamageExplanationService.new({
                    net: 0,
                }),
                healingReceived: 2,
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
            }),
        ]

        const outputStrings: string[] =
            ActionResultTextService.outputResultForTextOnly({
                actionTemplateName: bandageWoundsAction.name,
                currentActionEffectTemplate:
                    bandageWoundsAction.actionEffectTemplates[0],
                battleActionSquaddieChanges: healingChanges,
                squaddieRepository,
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: false,
                        rolls: [],
                    }),
                    actingSquaddieModifiers: [],
                }),
            })

        expect(outputStrings).toHaveLength(3)
        expect(outputStrings[0]).toBe("Knight uses Bandage Wounds")
        expect(outputStrings[1]).toBe("Knight receives 1 healing")
        expect(outputStrings[2]).toBe("Citizen receives 2 healing")
    })

    describe("Add Armor buff", () => {
        let raiseShieldAction: ActionTemplate

        beforeEach(() => {
            raiseShieldAction = ActionTemplateService.new({
                id: "raiseShield",
                name: "Raise Shield",
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                true,
                        },
                        attributeModifiers: [
                            AttributeModifierService.new({
                                type: Attribute.ARMOR,
                                source: AttributeSource.CIRCUMSTANCE,
                                amount: 1,
                            }),
                        ],
                    }),
                ],
            })
        })

        it("Shows Armor bonus was applied", () => {
            const armorBonusChanges = [
                BattleActionSquaddieChangeService.new({
                    battleSquaddieId: knightDynamic.battleSquaddieId,
                    damageExplanation: DamageExplanationService.new({
                        net: 0,
                    }),
                    healingReceived: 0,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    attributesAfter: InBattleAttributesService.new({
                        attributeModifiers: [
                            AttributeModifierService.new({
                                type: Attribute.ARMOR,
                                source: AttributeSource.CIRCUMSTANCE,
                                amount: 1,
                            }),
                        ],
                    }),
                }),
            ]

            const outputStrings: string[] =
                ActionResultTextService.outputResultForTextOnly({
                    actionTemplateName: "Raise Shield",
                    currentActionEffectTemplate:
                        raiseShieldAction.actionEffectTemplates[0],
                    battleActionSquaddieChanges: armorBonusChanges,
                    squaddieRepository,
                    actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                    actorContext: BattleActionActorContextService.new({
                        actingSquaddieRoll: RollResultService.new({
                            occurred: false,
                            rolls: [],
                        }),
                        actingSquaddieModifiers: [],
                    }),
                })

            expect(outputStrings).toHaveLength(2)
            expect(outputStrings[0]).toBe("Knight uses Raise Shield")
            expect(outputStrings[1]).toBe(
                "Knight Armor +1 (Circumstance): Harder to hit"
            )
        })
        it("Shows No Change if there is no change in bonus", () => {
            const armorBonusChanges = [
                BattleActionSquaddieChangeService.new({
                    battleSquaddieId: knightDynamic.battleSquaddieId,
                    damageExplanation: DamageExplanationService.new({
                        net: 0,
                    }),
                    healingReceived: 0,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    attributesBefore: InBattleAttributesService.new({
                        attributeModifiers: [
                            AttributeModifierService.new({
                                type: Attribute.ARMOR,
                                source: AttributeSource.CIRCUMSTANCE,
                                amount: 1,
                            }),
                        ],
                    }),
                    attributesAfter: InBattleAttributesService.new({
                        attributeModifiers: [
                            AttributeModifierService.new({
                                type: Attribute.ARMOR,
                                source: AttributeSource.CIRCUMSTANCE,
                                amount: 1,
                            }),
                        ],
                    }),
                }),
            ]

            const outputStrings: string[] =
                ActionResultTextService.outputResultForTextOnly({
                    actionTemplateName: "Raise Shield",
                    currentActionEffectTemplate:
                        raiseShieldAction.actionEffectTemplates[0],
                    battleActionSquaddieChanges: armorBonusChanges,
                    squaddieRepository,
                    actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                    actorContext: BattleActionActorContextService.new({
                        actingSquaddieRoll: RollResultService.new({
                            occurred: false,
                            rolls: [],
                        }),
                        actingSquaddieModifiers: [],
                    }),
                })

            expect(outputStrings).toHaveLength(2)
            expect(outputStrings[0]).toBe("Knight uses Raise Shield")
            expect(outputStrings[1]).toBe("Knight Armor NO CHANGE")
        })
    })

    describe("Add Movement buff", () => {
        let dashAction: ActionTemplate

        beforeEach(() => {
            dashAction = ActionTemplateService.new({
                id: "dash",
                name: "dash",
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                true,
                        },
                        attributeModifiers: [
                            AttributeModifierService.new({
                                type: Attribute.MOVEMENT,
                                source: AttributeSource.MARTIAL,
                                amount: 1,
                            }),
                            AttributeModifierService.new({
                                type: Attribute.HUSTLE,
                                source: AttributeSource.SPIRITUAL,
                                amount: 1,
                            }),
                        ],
                    }),
                ],
            })
        })

        it("Shows Movement bonus was applied", () => {
            const movementChanges = [
                BattleActionSquaddieChangeService.new({
                    battleSquaddieId: knightDynamic.battleSquaddieId,
                    damageExplanation: DamageExplanationService.new({
                        net: 0,
                    }),
                    healingReceived: 0,
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    attributesAfter: InBattleAttributesService.new({
                        attributeModifiers: [
                            AttributeModifierService.new({
                                type: Attribute.MOVEMENT,
                                source: AttributeSource.ELEMENTAL,
                                amount: 1,
                            }),
                            AttributeModifierService.new({
                                type: Attribute.HUSTLE,
                                source: AttributeSource.MARTIAL,
                                amount: 1,
                            }),
                        ],
                    }),
                }),
            ]

            const outputStrings: string[] =
                ActionResultTextService.outputResultForTextOnly({
                    actionTemplateName: "dash",
                    currentActionEffectTemplate:
                        dashAction.actionEffectTemplates[0],
                    battleActionSquaddieChanges: movementChanges,
                    squaddieRepository,
                    actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                    actorContext: BattleActionActorContextService.new({
                        actingSquaddieRoll: RollResultService.new({
                            occurred: false,
                            rolls: [],
                        }),
                        actingSquaddieModifiers: [],
                    }),
                })

            expect(outputStrings).toHaveLength(3)
            expect(outputStrings[0]).toBe("Knight uses dash")
            expect(outputStrings[1]).toBe(
                "Knight Movement +1 (Elemental): Travel further per action point"
            )
            expect(outputStrings[2]).toBe(
                "Knight Hustle (Martial): Ignore rough terrain movement cost"
            )
        })
    })

    it("Explains intent to use a power", () => {
        const outputStrings: string[] =
            ActionResultTextService.outputIntentForTextOnly({
                actionTemplate: longswordSweepAction,
                currentActionEffectTemplate:
                    longswordSweepAction.actionEffectTemplates[0],
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                squaddieRepository,
                rollModifiers: {},
                actingSquaddieModifiers: [],
            })

        expect(outputStrings).toHaveLength(1)
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
    })

    it("Explains attack modifiers with intent", () => {
        const outputStrings: string[] =
            ActionResultTextService.outputIntentForTextOnly({
                actionTemplate: longswordSweepAction,
                currentActionEffectTemplate:
                    longswordSweepAction.actionEffectTemplates[0],
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                squaddieRepository,
                rollModifiers: {
                    [RollModifierEnum.MULTIPLE_ATTACK_PENALTY]: -6,
                },
                actingSquaddieModifiers: [],
            })

        expect(outputStrings).toHaveLength(2)
        expect(outputStrings[1]).toBe("   -6: Multiple attack penalty")
    })

    it("Explains action but does not show attack modifiers if the action always succeeds", () => {
        const outputStrings: string[] =
            ActionResultTextService.outputIntentForTextOnly({
                actionTemplate: bandageWoundsAction,
                currentActionEffectTemplate:
                    bandageWoundsAction.actionEffectTemplates[0],
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                squaddieRepository,
                rollModifiers: {
                    [RollModifierEnum.MULTIPLE_ATTACK_PENALTY]: -6,
                },
                actingSquaddieModifiers: [],
            })

        expect(outputStrings).toHaveLength(1)
        expect(outputStrings[0]).toBe("Knight uses Bandage Wounds")
    })

    it("Will mention the actor roll, if the actor rolled", () => {
        const damagingResult = [
            BattleActionSquaddieChangeService.new({
                battleSquaddieId: thiefDynamic.battleSquaddieId,
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 1,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
            }),
            BattleActionSquaddieChangeService.new({
                battleSquaddieId: rogueDynamic.battleSquaddieId,
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 1,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
            }),
        ]

        const outputStrings: string[] =
            ActionResultTextService.outputResultForTextOnly({
                actionTemplateName: longswordSweepAction.name,
                currentActionEffectTemplate:
                    longswordSweepAction.actionEffectTemplates[0],
                battleActionSquaddieChanges: damagingResult,
                squaddieRepository,
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: true,
                        rolls: [2, 6],
                    }),
                    actingSquaddieModifiers: [],
                }),
            })

        expect(outputStrings).toHaveLength(5)
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
        expect(outputStrings[1]).toBe("   rolls (2, 6)")
        expect(outputStrings[2]).toBe(" Total 8")
        expect(outputStrings[3]).toBe("Thief takes 1 damage")
        expect(outputStrings[4]).toBe("Rogue takes 1 damage")
    })

    it("Will mention if the attacker missed or did no damage", () => {
        const damagingResult = [
            BattleActionSquaddieChangeService.new({
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 0,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.FAILURE,
                battleSquaddieId: thiefDynamic.battleSquaddieId,
            }),
            BattleActionSquaddieChangeService.new({
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 0,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                battleSquaddieId: rogueDynamic.battleSquaddieId,
            }),
        ]

        const outputStrings: string[] =
            ActionResultTextService.outputResultForTextOnly({
                actionTemplateName: longswordSweepAction.name,
                currentActionEffectTemplate:
                    longswordSweepAction.actionEffectTemplates[0],
                battleActionSquaddieChanges: damagingResult,
                squaddieRepository,
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: true,
                        rolls: [1, 2],
                    }),
                    actingSquaddieModifiers: [],
                }),
            })

        expect(outputStrings).toHaveLength(5)
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
        expect(outputStrings[1]).toBe("   rolls (1, 2)")
        expect(outputStrings[2]).toBe(" Total 3")
        expect(outputStrings[3]).toBe("Thief: MISS!")
        expect(outputStrings[4]).toBe("Rogue: NO DAMAGE")
    })

    it("will mention if the attack was a critical hit and dealt double damage", () => {
        const damagingResult = [
            BattleActionSquaddieChangeService.new({
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 4,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
                battleSquaddieId: thiefDynamic.battleSquaddieId,
            }),
        ]

        const outputStrings: string[] =
            ActionResultTextService.outputResultForTextOnly({
                actionTemplateName: longswordSweepAction.name,
                currentActionEffectTemplate:
                    longswordSweepAction.actionEffectTemplates[0],
                battleActionSquaddieChanges: damagingResult,
                squaddieRepository,
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: true,
                        rolls: [6, 6],
                    }),
                    actingSquaddieModifiers: [],
                }),
            })

        expect(outputStrings).toHaveLength(4)
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
        expect(outputStrings[1]).toBe("   rolls (6, 6)")
        expect(outputStrings[2]).toBe(" Total 12")
        expect(outputStrings[3]).toBe("Thief: CRITICAL HIT! 4 damage")
    })

    it("will mention if the attack was a critical miss", () => {
        const damagingResult = [
            BattleActionSquaddieChangeService.new({
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 0,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
                battleSquaddieId: thiefDynamic.battleSquaddieId,
            }),
        ]

        const outputStrings: string[] =
            ActionResultTextService.outputResultForTextOnly({
                actionTemplateName: longswordSweepAction.name,
                currentActionEffectTemplate:
                    longswordSweepAction.actionEffectTemplates[0],
                battleActionSquaddieChanges: damagingResult,
                squaddieRepository,
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: true,
                        rolls: [1, 1],
                    }),
                    actingSquaddieModifiers: [],
                }),
            })

        expect(outputStrings).toHaveLength(4)
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
        expect(outputStrings[1]).toBe("   rolls (1, 1)")
        expect(outputStrings[2]).toBe(" Total 2")
        expect(outputStrings[3]).toBe("Thief: CRITICAL MISS!!")
    })

    it("will show the total attack roll and multiple attack penalty", () => {
        const damagingResult = [
            BattleActionSquaddieChangeService.new({
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 1,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                battleSquaddieId: thiefDynamic.battleSquaddieId,
            }),
            BattleActionSquaddieChangeService.new({
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 1,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                battleSquaddieId: rogueDynamic.battleSquaddieId,
            }),
        ]

        const outputStrings: string[] =
            ActionResultTextService.outputResultForTextOnly({
                actionTemplateName: longswordSweepAction.name,
                currentActionEffectTemplate:
                    longswordSweepAction.actionEffectTemplates[0],
                battleActionSquaddieChanges: damagingResult,
                squaddieRepository,
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: true,
                        rolls: [2, 6],
                        rollModifiers: {
                            [RollModifierEnum.MULTIPLE_ATTACK_PENALTY]: -3,
                        },
                    }),
                    actingSquaddieModifiers: [],
                }),
            })

        expect(outputStrings).toHaveLength(6)
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
        expect(outputStrings[1]).toBe("   rolls (2, 6)")
        expect(outputStrings[2]).toBe("   -3: Multiple attack penalty")
        expect(outputStrings[3]).toBe(" Total 5")
        expect(outputStrings[4]).toBe("Thief takes 1 damage")
        expect(outputStrings[5]).toBe("Rogue takes 1 damage")
    })

    it("will hide the total and attack penalties if no roll was used", () => {
        const damagingResult = [
            BattleActionSquaddieChangeService.new({
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 1,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                battleSquaddieId: thiefDynamic.battleSquaddieId,
            }),
            BattleActionSquaddieChangeService.new({
                healingReceived: 0,
                damageExplanation: DamageExplanationService.new({
                    net: 1,
                }),
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                battleSquaddieId: rogueDynamic.battleSquaddieId,
            }),
        ]

        const outputStrings: string[] =
            ActionResultTextService.outputResultForTextOnly({
                actionTemplateName: longswordSweepAction.name,
                currentActionEffectTemplate:
                    longswordSweepAction.actionEffectTemplates[0],
                battleActionSquaddieChanges: damagingResult,
                squaddieRepository,
                actingBattleSquaddieId: knightDynamic.battleSquaddieId,
                actorContext: BattleActionActorContextService.new({
                    actingSquaddieRoll: RollResultService.new({
                        occurred: false,
                        rolls: [],
                        rollModifiers: {
                            [RollModifierEnum.MULTIPLE_ATTACK_PENALTY]: -3,
                        },
                    }),
                    actingSquaddieModifiers: [],
                }),
            })

        expect(outputStrings).toHaveLength(3)
        expect(outputStrings[0]).toBe("Knight uses Longsword Sweep")
        expect(outputStrings[1]).toBe("Thief takes 1 damage")
        expect(outputStrings[2]).toBe("Rogue takes 1 damage")
    })

    describe("Armor bonus", () => {
        beforeEach(() => {
            thiefDynamic.inBattleAttributes.attributeModifiers.push(
                AttributeModifierService.new({
                    type: Attribute.ARMOR,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 9001,
                    duration: 1,
                    description: "Impenetrable Armor",
                })
            )
        })
        it("Shows Armor bonuses against attacks", () => {
            const outputString: string =
                ActionResultTextService.getBeforeActionText({
                    targetTemplate: thiefStatic,
                    targetBattle: thiefDynamic,
                    actionEffectSquaddieTemplate:
                        longswordSweepAction.actionEffectTemplates[0],
                })

            const thiefNetArmorClass = SquaddieService.getArmorClass({
                squaddieTemplate: thiefStatic,
                battleSquaddie: thiefDynamic,
            }).net

            expect(outputString).toContain(`Armor ${thiefNetArmorClass + 9001}`)
            expect(outputString).toContain(`+9001 Armor`)
        })
        it("Does not show Armor bonuses against non attacks", () => {
            const outputString: string =
                ActionResultTextService.getBeforeActionText({
                    targetTemplate: thiefStatic,
                    targetBattle: thiefDynamic,
                    actionEffectSquaddieTemplate:
                        bandageWoundsAction.actionEffectTemplates[0],
                })

            const thiefInitialArmorClass = SquaddieService.getArmorClass({
                squaddieTemplate: thiefStatic,
                battleSquaddie: thiefDynamic,
            }).initial

            expect(outputString).not.toContain(
                `Armor ${thiefInitialArmorClass + 9001}`
            )
            expect(outputString).not.toContain(`${thiefInitialArmorClass}`)
            expect(outputString).not.toContain(`+9001 Armor`)
        })
    })

    describe("Tier bonus", () => {
        beforeEach(() => {
            thiefStatic.attributes.tier = 1
        })
        it("Shows Tier bonuses against attacks", () => {
            const outputString: string =
                ActionResultTextService.getBeforeActionText({
                    targetTemplate: thiefStatic,
                    targetBattle: thiefDynamic,
                    actionEffectSquaddieTemplate:
                        longswordSweepAction.actionEffectTemplates[0],
                })

            const thiefNetArmorClass = SquaddieService.getArmorClass({
                squaddieTemplate: thiefStatic,
                battleSquaddie: thiefDynamic,
            }).net

            expect(outputString).toContain(`Armor ${thiefNetArmorClass}`)
            expect(outputString).toContain(`+1 Tier`)
        })
        it("Does not shows Armor bonuses against non attacks", () => {
            const outputString: string =
                ActionResultTextService.getBeforeActionText({
                    targetTemplate: thiefStatic,
                    targetBattle: thiefDynamic,
                    actionEffectSquaddieTemplate:
                        bandageWoundsAction.actionEffectTemplates[0],
                })

            const thiefNetArmorClass = SquaddieService.getArmorClass({
                squaddieTemplate: thiefStatic,
                battleSquaddie: thiefDynamic,
            }).net

            expect(outputString).not.toContain(`Armor ${thiefNetArmorClass}`)
            expect(outputString).not.toContain(`+1 Tier`)
        })
    })
})
