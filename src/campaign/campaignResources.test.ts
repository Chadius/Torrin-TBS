import { beforeEach, describe, expect, it } from "vitest"

import {
    CampaignResources,
    CampaignResourcesService,
    TActionEffectTemplateButtonIconKey,
} from "./campaignResources"
import { THexGridMovementCost } from "../hexMap/hexGridMovementCost"

describe("campaign resources", () => {
    describe("can clone", () => {
        let original: CampaignResources
        let cloned: CampaignResources
        beforeEach(() => {
            original = CampaignResourcesService.default()
            cloned = CampaignResourcesService.clone(original)
        })

        it("actionEffectSquaddieTemplateButtonIcons", () => {
            Object.keys(
                original.actionEffectSquaddieTemplateButtonIcons
            ).forEach((keyString) => {
                const key: TActionEffectTemplateButtonIconKey =
                    keyString as TActionEffectTemplateButtonIconKey
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
                        const key: THexGridMovementCost =
                            keyString as THexGridMovementCost
                        expect(
                            cloned.mapTiles.defaultByTerrainCost[key]
                        ).toEqual(original.mapTiles.defaultByTerrainCost[key])
                    }
                )
            })
        })

        it("end turn resource key", () => {
            expect(cloned.endTurnIconResourceKey).toEqual(
                original.endTurnIconResourceKey
            )
        })
    })
    it("can return all resourceKeys", () => {
        let campaignResources = CampaignResourcesService.default()
        let expectedResourceKeys = new Set<string>([
            "map-tiles-basic-floor",
            "map-tiles-basic-sand",
            "map-tiles-basic-pit",
            "map-tiles-basic-wall",
            "map-tiles-basic-water",
            "decision-button-unknown",
            "decision-button-end-turn",
        ])
        let actualResourceKeys = new Set<string>(
            CampaignResourcesService.getAllResourceKeys(campaignResources)
        )
        expect(
            actualResourceKeys.isSupersetOf(expectedResourceKeys)
        ).toBeTruthy()
    })
})
