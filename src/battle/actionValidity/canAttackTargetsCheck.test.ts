import { beforeEach, describe, expect, it } from "vitest"
import { ObjectRepository } from "../objectRepository"
import { MissionMap } from "../../missionMap/missionMap"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../action/template/actionEffectTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { MapSearchTestUtils } from "../../hexMap/pathfinder/pathGeneration/mapSearchTests/mapSearchTestUtils"
import { ActionValidityTestUtils } from "./commonTest"
import { CoordinateGeneratorShape } from "../targeting/coordinateGenerator"
import { DamageType, HealingType } from "../../squaddie/squaddieService"
import { CanAttackTargetsCheck } from "./canAttackTargetsCheck"
import { ActionPerformFailureReason } from "../../squaddie/turn"

describe("canAttackTargetsCheck", () => {
    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    beforeEach(() => {
        missionMap = MapSearchTestUtils.create1row5columnsAllFlatTerrain()
        objectRepository = ActionValidityTestUtils.setup({
            missionMap,
            actorSquaddie: {
                name: "actor",
                mapCoordinate: { q: 0, r: 1 },
                affiliation: SquaddieAffiliation.PLAYER,
            },
            otherSquaddies: [
                {
                    name: "ally",
                    affiliation: SquaddieAffiliation.ALLY,
                    mapCoordinate: { q: 0, r: 0 },
                },
                {
                    name: "enemy",
                    affiliation: SquaddieAffiliation.ENEMY,
                    mapCoordinate: { q: 0, r: 2 },
                },
            ],
        })
    })

    it("is valid if the action does not target foes", () => {
        let healingAction = ActionTemplateService.new({
            id: "healingAction",
            name: "healingAction",
            targetConstraints: {
                maximumRange: 1,
                minimumRange: 0,
                coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
            },
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: false,
                    },
                    healingDescriptions: {
                        [HealingType.LOST_HIT_POINTS]: 2,
                    },
                }),
            ],
        })
        ActionValidityTestUtils.addActionTemplateToSquaddie({
            objectRepository,
            actionTemplate: healingAction,
            actorSquaddieName: "actor",
        })

        expect(
            CanAttackTargetsCheck.targetsAreInRangeOfThisAttack({
                missionMap,
                actorSquaddieId: "actor",
                actionTemplateId: healingAction.id,
                objectRepository,
            })
        ).toEqual({
            isValid: true,
        })
    })

    describe("Deals damage actions", () => {
        let dealsDamageAction: ActionTemplate
        beforeEach(() => {
            dealsDamageAction = ActionTemplateService.new({
                id: "attackAction",
                name: "attackAction",
                targetConstraints: {
                    maximumRange: 1,
                    minimumRange: 0,
                    coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
                },
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                false,
                            [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
                                false,
                            [TargetBySquaddieAffiliationRelation.TARGET_FOE]:
                                true,
                        },
                        damageDescriptions: {
                            [DamageType.BODY]: 2,
                        },
                    }),
                ],
            })
            ActionValidityTestUtils.addActionTemplateToSquaddie({
                objectRepository,
                actionTemplate: dealsDamageAction,
                actorSquaddieName: "actor",
            })
        })

        it("is valid if one target matches affiliation targeting", () => {
            expect(
                CanAttackTargetsCheck.targetsAreInRangeOfThisAttack({
                    missionMap,
                    actorSquaddieId: "actor",
                    actionTemplateId: dealsDamageAction.id,
                    objectRepository,
                })
            ).toEqual({
                isValid: true,
            })
        })

        it("is not valid if targets do not match affiliation targeting", () => {
            expect(
                CanAttackTargetsCheck.targetsAreInRangeOfThisAttack({
                    missionMap,
                    actorSquaddieId: "ally",
                    actionTemplateId: dealsDamageAction.id,
                    objectRepository,
                })
            ).toEqual({
                isValid: false,
                reason: ActionPerformFailureReason.NO_TARGETS_IN_RANGE,
                message: "No targets in range",
            })
        })
    })
})
