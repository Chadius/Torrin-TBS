import { ObjectRepositoryService } from "../objectRepository"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { BuffSelfCheck } from "./buffSelfCheck"
import { DamageType, HealingType } from "../../squaddie/squaddieService"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../squaddie/attribute/attributeModifier"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { ActionPerformFailureReason } from "../../squaddie/turn"
import { beforeEach, describe, expect, it } from "vitest"
import { AttributeType } from "../../squaddie/attribute/attributeType"

describe("Buff Self Checker", () => {
    let raiseShield: ActionTemplate
    let healSelf: ActionTemplate
    beforeEach(() => {
        healSelf = ActionTemplateService.new({
            id: "healSelf",
            name: "healSelf",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                    },
                    healingDescriptions: {
                        [HealingType.LOST_HIT_POINTS]: 1,
                    },
                }),
            ],
        })
        raiseShield = ActionTemplateService.new({
            id: "raiseShield",
            name: "raiseShield",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                    },
                    attributeModifiers: [
                        AttributeModifierService.new({
                            type: AttributeType.ARMOR,
                            source: AttributeSource.CIRCUMSTANCE,
                            amount: 1,
                        }),
                    ],
                }),
            ],
        })
    })

    const setup = ({
        actionTemplates,
    }: {
        actionTemplates: ActionTemplate[]
    }) => {
        const objectRepository = ObjectRepositoryService.new()
        actionTemplates.forEach((actionTemplate) => {
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                actionTemplate
            )
        })

        const { battleSquaddie, squaddieTemplate } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                affiliation: SquaddieAffiliation.PLAYER,
                battleId: "battleId",
                templateId: "squaddieTemplateId",
                name: "squaddieName",
                objectRepository: objectRepository,
                actionTemplateIds: actionTemplates.map(
                    (actionTemplate) => actionTemplate.id
                ),
            })

        return {
            objectRepository,
            battleSquaddie,
            squaddieTemplate,
        }
    }

    it("returns nothing on actions that affect others", () => {
        const attackOthers = ActionTemplateService.new({
            id: "attackOthers",
            name: "attackOthers",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })

        const { objectRepository, battleSquaddie, squaddieTemplate } = setup({
            actionTemplates: [attackOthers],
        })

        expect(
            BuffSelfCheck.willBuffUser({
                battleSquaddie,
                actionTemplateId: attackOthers.id,
                objectRepository,
                squaddieTemplate,
            })
        ).toEqual({
            isValid: true,
        })
    })

    it("is valid if the ability adds attributes", () => {
        const { objectRepository, battleSquaddie, squaddieTemplate } = setup({
            actionTemplates: [raiseShield],
        })

        expect(
            BuffSelfCheck.willBuffUser({
                battleSquaddie,
                actionTemplateId: raiseShield.id,
                objectRepository,
                squaddieTemplate,
            })
        ).toEqual({
            isValid: true,
        })
    })

    it("is valid if the ability heals the user", () => {
        const { objectRepository, battleSquaddie, squaddieTemplate } = setup({
            actionTemplates: [healSelf],
        })

        InBattleAttributesService.takeDamage({
            inBattleAttributes: battleSquaddie.inBattleAttributes,
            damageToTake: 1,
            damageType: DamageType.BODY,
        })

        expect(
            BuffSelfCheck.willBuffUser({
                battleSquaddie,
                actionTemplateId: healSelf.id,
                objectRepository,
                squaddieTemplate,
            })
        ).toEqual({
            isValid: true,
        })
    })

    it("is invalid if the ability does not heal the user and does not add attributes", () => {
        const { objectRepository, battleSquaddie, squaddieTemplate } = setup({
            actionTemplates: [healSelf, raiseShield],
        })

        InBattleAttributesService.addActiveAttributeModifier(
            battleSquaddie.inBattleAttributes,
            AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 1,
            })
        )

        expect(
            BuffSelfCheck.willBuffUser({
                battleSquaddie,
                actionTemplateId: healSelf.id,
                objectRepository,
                squaddieTemplate,
            })
        ).toEqual({
            isValid: false,
            reason: ActionPerformFailureReason.BUFF_HAS_NO_EFFECT,
            message: "squaddieName is already at full health",
        })

        expect(
            BuffSelfCheck.willBuffUser({
                battleSquaddie,
                actionTemplateId: raiseShield.id,
                objectRepository,
                squaddieTemplate,
            })
        ).toEqual({
            isValid: false,
            reason: ActionPerformFailureReason.BUFF_HAS_NO_EFFECT,
            message: "Will have no effect on squaddieName",
        })
    })
})
