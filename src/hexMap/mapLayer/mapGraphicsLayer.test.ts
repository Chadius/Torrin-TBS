import {
    MapGraphicsLayer,
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "./mapGraphicsLayer"
import { HIGHLIGHT_PULSE_COLOR } from "../hexDrawingUtils"
import { beforeEach, describe, expect, it } from "vitest"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../action/template/actionEffectTemplate"
import { Damage, Healing } from "../../squaddie/squaddieService"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../battle/objectRepository"

describe("Map Graphics Layer", () => {
    it("has an Id", () => {
        const mapGraphicsLayerWithId = MapGraphicsLayerService.new({
            id: "wow",
            type: MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE,
        })

        expect(mapGraphicsLayerWithId.id).toEqual("wow")
        expect(mapGraphicsLayerWithId.type).toEqual(
            MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE
        )
    })

    describe("Adding colors and graphics", () => {
        let mapGraphicsLayer: MapGraphicsLayer
        beforeEach(() => {
            mapGraphicsLayer = MapGraphicsLayerService.new({
                id: "wow",
                highlightedTileDescriptions: [
                    {
                        coordinates: [
                            { q: 0, r: 0 },
                            { q: 0, r: 1 },
                        ],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                    },
                ],
                type: MapGraphicsLayerType.UNKNOWN,
            })

            MapGraphicsLayerService.addHighlightedTileDescription(
                mapGraphicsLayer,
                {
                    coordinates: [{ q: 0, r: 2 }],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                }
            )
        })
        it("can get a list of tiles with their coordinates and image and pulse color", () => {
            const tiles =
                MapGraphicsLayerService.getHighlights(mapGraphicsLayer)
            expect(tiles).toHaveLength(3)
            expect(tiles).toEqual(
                expect.arrayContaining([
                    {
                        coordinate: { q: 0, r: 0 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                    },
                    {
                        coordinate: { q: 0, r: 1 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                    },
                    {
                        coordinate: { q: 0, r: 2 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                    },
                ])
            )
        })
        it("gets the coordinates highlighted", () => {
            const coordinates =
                MapGraphicsLayerService.getCoordinates(mapGraphicsLayer)
            expect(coordinates).toHaveLength(3)
            expect(coordinates).toEqual(
                expect.arrayContaining([
                    { q: 0, r: 0 },
                    { q: 0, r: 1 },
                    { q: 0, r: 2 },
                ])
            )
        })
        it("knows if a coordinate is highlighted", () => {
            expect(
                MapGraphicsLayerService.hasCoordinate(mapGraphicsLayer, {
                    q: 0,
                    r: 0,
                })
            ).toBeTruthy()
            expect(
                MapGraphicsLayerService.hasCoordinate(mapGraphicsLayer, {
                    q: 0,
                    r: 1,
                })
            ).toBeTruthy()
            expect(
                MapGraphicsLayerService.hasCoordinate(mapGraphicsLayer, {
                    q: 0,
                    r: 2,
                })
            ).toBeTruthy()
            expect(
                MapGraphicsLayerService.hasCoordinate(mapGraphicsLayer, {
                    q: 1,
                    r: 0,
                })
            ).toBeFalsy()
            expect(
                MapGraphicsLayerService.hasCoordinate(mapGraphicsLayer, {
                    q: 2,
                    r: 0,
                })
            ).toBeFalsy()
        })
    })

    describe("get the action template color", () => {
        let healSelf: ActionEffectTemplate
        let hurtOthers: ActionEffectTemplate
        let objectRepository: ObjectRepository

        beforeEach(() => {
            healSelf = ActionEffectTemplateService.new({
                healingDescriptions: {
                    [Healing.LOST_HIT_POINTS]: 1,
                },
                squaddieAffiliationRelation: {
                    [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                },
            })
            hurtOthers = ActionEffectTemplateService.new({
                damageDescriptions: {
                    [Damage.BODY]: 2,
                },
                squaddieAffiliationRelation: {
                    [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                },
            })
            objectRepository = ObjectRepositoryService.new()
        })

        it("if the first template targets foes the color is attack colored", () => {
            const hurtThenHeal = ActionTemplateService.new({
                id: "hurtThenHeal",
                name: "hurtThenHeal",
                actionEffectTemplates: [hurtOthers, healSelf],
            })
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                hurtThenHeal
            )
            expect(
                MapGraphicsLayerService.getActionTemplateHighlightedTileDescriptionColor(
                    {
                        objectRepository,
                        actionTemplateId: hurtThenHeal.id,
                    }
                )
            ).toEqual(HIGHLIGHT_PULSE_COLOR.RED)
        })

        it("if the first template does not target foes the color is assist colored", () => {
            const healThenHurt = ActionTemplateService.new({
                id: "healThenHurt",
                name: "healThenHurt",
                actionEffectTemplates: [healSelf, hurtOthers],
            })
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                healThenHurt
            )
            expect(
                MapGraphicsLayerService.getActionTemplateHighlightedTileDescriptionColor(
                    {
                        objectRepository,
                        actionTemplateId: healThenHurt.id,
                    }
                )
            ).toEqual(HIGHLIGHT_PULSE_COLOR.GREEN)
        })
    })
})
