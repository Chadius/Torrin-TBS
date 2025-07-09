import { beforeEach, describe, expect, it } from "vitest"

import {
    ActionEffectTemplateButtonIconKey,
    CampaignResources,
    CampaignResourcesService,
} from "./campaignResources"
import { HexGridMovementCost } from "../hexMap/hexGridMovementCost"

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

        it("end turn resource key", () => {
            expect(cloned.endTurnIconResourceKey).toEqual(
                original.endTurnIconResourceKey
            )
        })
    })
})
