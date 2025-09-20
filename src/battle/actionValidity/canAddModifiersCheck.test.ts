import { beforeEach, describe, expect, it } from "vitest"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
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
import { getResultOrThrowError } from "../../utils/resultOrError"
import { ActionPerformFailureReason } from "../../squaddie/turn"
import { CoordinateGeneratorShape } from "../targeting/coordinateGenerator"
import { Damage } from "../../squaddie/squaddieService"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { ActionValidityTestUtils } from "./commonTest"
import {
    TargetingResults,
    TargetingResultsService,
} from "../targeting/targetingService"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../squaddie/attribute/attributeModifier"
import { Attribute } from "../../squaddie/attribute/attribute"
import { CanAddModifiersCheck } from "./canAddModifiersCheck"

describe("can add modifiers check", () => {
    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    let validTargetResults: TargetingResults
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
        validTargetResults = TargetingResultsService.new()
    })

    it("is valid if the action does not apply modifiers", () => {
        let attackAction = ActionTemplateService.new({
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
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: false,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: false,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                    damageDescriptions: {
                        [Damage.BODY]: 2,
                    },
                }),
            ],
        })
        ActionValidityTestUtils.addActionTemplateToSquaddie({
            objectRepository,
            actionTemplate: attackAction,
            actorSquaddieName: "actor",
        })

        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                "actor"
            )
        )
        InBattleAttributesService.takeDamage({
            inBattleAttributes: battleSquaddie.inBattleAttributes,
            damageToTake: 1,
            damageType: Damage.BODY,
        })

        expect(
            CanAddModifiersCheck.canAddAttributeModifiers({
                actionTemplate: attackAction,
                objectRepository,
                validTargetResults,
            })
        ).toEqual({
            isValid: true,
        })
    })

    describe("Add a modifier", () => {
        let addArmorAction: ActionTemplate
        beforeEach(() => {
            addArmorAction = ActionTemplateService.new({
                id: "raiseBarrier",
                name: "raiseBarrier",
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
                        attributeModifiers: [
                            AttributeModifierService.new({
                                type: Attribute.ARMOR,
                                amount: 1,
                                source: AttributeSource.CIRCUMSTANCE,
                            }),
                        ],
                    }),
                ],
            })
            ActionValidityTestUtils.addActionTemplateToSquaddie({
                objectRepository,
                actionTemplate: addArmorAction,
                actorSquaddieName: "actor",
            })
        })

        describe("is not valid if the target already has the attributes", () => {
            beforeEach(() => {
                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        "actor"
                    )
                )
                InBattleAttributesService.addActiveAttributeModifier(
                    battleSquaddie.inBattleAttributes,
                    AttributeModifierService.new({
                        type: Attribute.ARMOR,
                        amount: 1,
                        source: AttributeSource.CIRCUMSTANCE,
                    })
                )

                validTargetResults =
                    TargetingResultsService.withBattleSquaddieIdsInRange(
                        validTargetResults,
                        ["actor"]
                    )
            })
            it("reports attributes will not be added", () => {
                const { battleSquaddie, squaddieTemplate } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            "actor"
                        )
                    )

                expect(
                    CanAddModifiersCheck.willAddModifiersToTarget({
                        actionTemplate: addArmorAction,
                        battleSquaddie,
                        squaddieTemplate,
                    })
                ).toBeFalsy()
            })
            it("is not valid if no targets can benefit from the attributes", () => {
                expect(
                    CanAddModifiersCheck.canAddAttributeModifiers({
                        actionTemplate: addArmorAction,
                        objectRepository,
                        validTargetResults,
                    })
                ).toEqual({
                    isValid: false,
                    reason: ActionPerformFailureReason.NO_ATTRIBUTES_WILL_BE_ADDED,
                    message: "No modifiers will be added",
                })
            })
        })
        describe("is valid if a target would gain the attribute", () => {
            beforeEach(() => {
                validTargetResults =
                    TargetingResultsService.withBattleSquaddieIdsInRange(
                        validTargetResults,
                        ["actor"]
                    )
            })
            it("reports attributes will be added", () => {
                const { battleSquaddie, squaddieTemplate } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            "actor"
                        )
                    )

                expect(
                    CanAddModifiersCheck.willAddModifiersToTarget({
                        actionTemplate: addArmorAction,
                        battleSquaddie,
                        squaddieTemplate,
                    })
                ).toBeTruthy()
            })
            it("is valid if at least 1 target could use the attribute", () => {
                expect(
                    CanAddModifiersCheck.canAddAttributeModifiers({
                        actionTemplate: addArmorAction,
                        objectRepository,
                        validTargetResults,
                    })
                ).toEqual({
                    isValid: true,
                })
            })
        })
    })
})
