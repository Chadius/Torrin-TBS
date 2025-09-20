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
import { Damage, Healing } from "../../squaddie/squaddieService"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { CanHealTargetCheck } from "./canHealTargetCheck"
import { ActionValidityTestUtils } from "./commonTest"
import {
    TargetingResults,
    TargetingResultsService,
} from "../targeting/targetingService"

describe("can heal targets", () => {
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

    it("is valid if the action does not heal", () => {
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
            CanHealTargetCheck.targetInRangeCanBeAffected({
                actionTemplate: attackAction,
                objectRepository,
                validTargetResults,
            })
        ).toEqual({
            isValid: true,
        })
    })

    describe("Restore Lost Hit Points", () => {
        let healingAction: ActionTemplate
        beforeEach(() => {
            healingAction = ActionTemplateService.new({
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
                            [Healing.LOST_HIT_POINTS]: 2,
                        },
                    }),
                ],
            })
            ActionValidityTestUtils.addActionTemplateToSquaddie({
                objectRepository,
                actionTemplate: healingAction,
                actorSquaddieName: "actor",
            })
        })

        describe("no targets took damage", () => {
            beforeEach(() => {
                validTargetResults =
                    TargetingResultsService.withBattleSquaddieIdsInRange(
                        validTargetResults,
                        ["actor"]
                    )
            })

            it("will calculate 0 healing", () => {
                const { battleSquaddie, squaddieTemplate } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            "actor"
                        )
                    )

                expect(
                    CanHealTargetCheck.calculateHealingOnTarget({
                        actionTemplate: healingAction,
                        battleSquaddie,
                        squaddieTemplate,
                    })
                ).toEqual(0)
            })

            it("is not valid if no targets have taken damage", () => {
                expect(
                    CanHealTargetCheck.targetInRangeCanBeAffected({
                        actionTemplate: healingAction,
                        objectRepository,
                        validTargetResults,
                    })
                ).toEqual({
                    isValid: false,
                    reason: ActionPerformFailureReason.HEAL_HAS_NO_EFFECT,
                    message: "No one needs healing",
                })
            })
        })
        describe("1 target took damage", () => {
            beforeEach(() => {
                validTargetResults =
                    TargetingResultsService.withBattleSquaddieIdsInRange(
                        validTargetResults,
                        ["actor"]
                    )
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
            })
            it("will calculate healing amount", () => {
                const { battleSquaddie, squaddieTemplate } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            "actor"
                        )
                    )

                expect(
                    CanHealTargetCheck.calculateHealingOnTarget({
                        actionTemplate: healingAction,
                        battleSquaddie,
                        squaddieTemplate,
                    })
                ).toEqual(1)
            })

            it("is valid if at least 1 target has taken damage", () => {
                expect(
                    CanHealTargetCheck.targetInRangeCanBeAffected({
                        actionTemplate: healingAction,
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
