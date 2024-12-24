import {
    MapGraphicsLayer,
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "./mapGraphicsLayer"
import { HIGHLIGHT_PULSE_COLOR } from "./hexDrawingUtils"
import { beforeEach, describe, expect, it } from "vitest"

describe("Map Graphics Layer", () => {
    it("has an Id", () => {
        const mapGraphicsLayerWithId = MapGraphicsLayerService.new({
            id: "wow",
            type: MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE,
        })

        expect(mapGraphicsLayerWithId.id).toEqual("wow")
        expect(mapGraphicsLayerWithId.type).toEqual(
            MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE
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
                        overlayImageResourceName: "1 move icon",
                    },
                ],
                type: MapGraphicsLayerType.UNKNOWN,
            })

            MapGraphicsLayerService.addHighlightedTileDescription(
                mapGraphicsLayer,
                {
                    coordinates: [{ q: 0, r: 2 }],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                    overlayImageResourceName: "1 move attack",
                }
            )
        })
        it("can get highlighted tile descriptions", () => {
            const coordinatesByResourceName =
                MapGraphicsLayerService.getHighlightedTileDescriptions(
                    mapGraphicsLayer
                )

            expect(coordinatesByResourceName).toHaveLength(2)
            expect(coordinatesByResourceName).toEqual(
                expect.arrayContaining([
                    {
                        coordinates: [
                            { q: 0, r: 0 },
                            { q: 0, r: 1 },
                        ],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        overlayImageResourceName: "1 move icon",
                    },
                    {
                        coordinates: [{ q: 0, r: 2 }],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                        overlayImageResourceName: "1 move attack",
                    },
                ])
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
                        overlayImageResourceName: "1 move icon",
                    },
                    {
                        coordinate: { q: 0, r: 1 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        overlayImageResourceName: "1 move icon",
                    },
                    {
                        coordinate: { q: 0, r: 2 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                        overlayImageResourceName: "1 move attack",
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
        it("can return all of its highlighted tiles, excluding some coordinates", () => {
            const coordinatesByResourceName =
                MapGraphicsLayerService.getHighlightedTileDescriptions(
                    mapGraphicsLayer,
                    [
                        { q: 0, r: 1 },
                        { q: 0, r: 2 },
                    ]
                )

            expect(coordinatesByResourceName).toHaveLength(1)
            expect(coordinatesByResourceName).toEqual(
                expect.arrayContaining([
                    {
                        coordinates: [{ q: 0, r: 0 }],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        overlayImageResourceName: "1 move icon",
                    },
                ])
            )
        })
    })
})
