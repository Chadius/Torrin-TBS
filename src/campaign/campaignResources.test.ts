import { beforeEach, describe, expect, it } from "vitest"

import {
    ActionEffectTemplateButtonIconKey,
    CampaignResources,
    CampaignResourcesService,
    MissionAttributeIconKey,
    MissionMapAttackIconKey,
    MissionMapMovementIconKey,
} from "./campaignResources"
import { AttributeType } from "../squaddie/attribute/attributeType"
import { HexGridMovementCost } from "../hexMap/hexGridMovementCost"

describe("campaign resources", () => {
    describe("can clone", () => {
        let original: CampaignResources
        let cloned: CampaignResources
        beforeEach(() => {
            original = CampaignResourcesService.default()
            cloned = CampaignResourcesService.clone(original)
        })

        it("missionMapMovementIconResourceKeys", () => {
            Object.keys(original.missionMapMovementIconResourceKeys).forEach(
                (keyString) => {
                    const key: MissionMapMovementIconKey =
                        keyString as MissionMapMovementIconKey
                    expect(
                        cloned.missionMapMovementIconResourceKeys[key]
                    ).toEqual(original.missionMapMovementIconResourceKeys[key])
                }
            )
        })

        it("missionMapAttackIconResourceKeys", () => {
            Object.keys(original.missionMapAttackIconResourceKeys).forEach(
                (keyString) => {
                    const key: MissionMapAttackIconKey =
                        keyString as MissionMapAttackIconKey
                    expect(
                        cloned.missionMapAttackIconResourceKeys[key]
                    ).toEqual(original.missionMapAttackIconResourceKeys[key])
                }
            )
        })

        it("missionAttributeIconResourceKeys", () => {
            Object.keys(original.missionAttributeIconResourceKeys).forEach(
                (keyString) => {
                    const key: MissionAttributeIconKey =
                        keyString as MissionAttributeIconKey
                    expect(
                        cloned.missionAttributeIconResourceKeys[key]
                    ).toEqual(original.missionAttributeIconResourceKeys[key])
                }
            )
        })

        it("actionEffectSquaddieTemplateButtonIcons", () => {
            Object.keys(
                original.actionEffectSquaddieTemplateButtonIcons
            ).forEach((keyString) => {
                const key: ActionEffectTemplateButtonIconKey =
                    keyString as ActionEffectTemplateButtonIconKey
                expect(
                    cloned.actionEffectSquaddieTemplateButtonIcons[key]
                ).toEqual(original.actionEffectSquaddieTemplateButtonIcons[key])
            })
        })

        describe("mapTiles", () => {
            it("resourceKeys", () => {
                expect(original.mapTiles.resourceKeys).toEqual(
                    cloned.mapTiles.resourceKeys
                )
            })

            it("defaultByTerrainCost", () => {
                Object.keys(original.mapTiles.defaultByTerrainCost).forEach(
                    (keyString) => {
                        const key: HexGridMovementCost =
                            keyString as HexGridMovementCost
                        expect(
                            cloned.mapTiles.defaultByTerrainCost[key]
                        ).toEqual(original.mapTiles.defaultByTerrainCost[key])
                    }
                )
            })
        })

        it("attributeComparisons", () => {
            Object.keys(original.attributeComparisons).forEach((key) => {
                expect(["up", "down"]).includes(key)
                if (key === "up" || key === "down") {
                    expect(cloned.attributeComparisons[key]).toEqual(
                        original.attributeComparisons[key]
                    )
                }
            })
        })

        it("attributeIcons", () => {
            Object.keys(original.attributeIcons).forEach((key) => {
                const attributeType: AttributeType = key as AttributeType
                expect(cloned.attributeIcons[attributeType]).toEqual(
                    original.attributeIcons[attributeType]
                )
            })
        })

        it("end turn resource key", () => {
            expect(cloned.endTurnIconResourceKey).toEqual(
                original.endTurnIconResourceKey
            )
        })
    })
})
