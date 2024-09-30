import {
    MapGraphicsLayer,
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "./mapGraphicsLayer"
import { HIGHLIGHT_PULSE_COLOR } from "./hexDrawingUtils"

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
                        tiles: [
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
                    tiles: [{ q: 0, r: 2 }],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                    overlayImageResourceName: "1 move attack",
                }
            )
        })
        it("can get highlighted tile descriptions", () => {
            const locationsByResourceName =
                MapGraphicsLayerService.getHighlightedTileDescriptions(
                    mapGraphicsLayer
                )

            expect(locationsByResourceName).toHaveLength(2)
            expect(locationsByResourceName).toEqual(
                expect.arrayContaining([
                    {
                        tiles: [
                            { q: 0, r: 0 },
                            { q: 0, r: 1 },
                        ],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        overlayImageResourceName: "1 move icon",
                    },
                    {
                        tiles: [{ q: 0, r: 2 }],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                        overlayImageResourceName: "1 move attack",
                    },
                ])
            )
        })
        it("can get a list of tile locations with their associated graphics", () => {
            const locations =
                MapGraphicsLayerService.getHighlights(mapGraphicsLayer)
            expect(locations).toHaveLength(3)
            expect(locations).toEqual(
                expect.arrayContaining([
                    {
                        location: { q: 0, r: 0 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        overlayImageResourceName: "1 move icon",
                    },
                    {
                        location: { q: 0, r: 1 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        overlayImageResourceName: "1 move icon",
                    },
                    {
                        location: { q: 0, r: 2 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                        overlayImageResourceName: "1 move attack",
                    },
                ])
            )
        })
        it("gets the locations highlighted", () => {
            const locations =
                MapGraphicsLayerService.getLocations(mapGraphicsLayer)
            expect(locations).toHaveLength(3)
            expect(locations).toEqual(
                expect.arrayContaining([
                    { q: 0, r: 0 },
                    { q: 0, r: 1 },
                    { q: 0, r: 2 },
                ])
            )
        })
        it("knows if a location is highlighted", () => {
            expect(
                MapGraphicsLayerService.hasLocation(mapGraphicsLayer, {
                    q: 0,
                    r: 0,
                })
            ).toBeTruthy()
            expect(
                MapGraphicsLayerService.hasLocation(mapGraphicsLayer, {
                    q: 0,
                    r: 1,
                })
            ).toBeTruthy()
            expect(
                MapGraphicsLayerService.hasLocation(mapGraphicsLayer, {
                    q: 0,
                    r: 2,
                })
            ).toBeTruthy()
            expect(
                MapGraphicsLayerService.hasLocation(mapGraphicsLayer, {
                    q: 1,
                    r: 0,
                })
            ).toBeFalsy()
            expect(
                MapGraphicsLayerService.hasLocation(mapGraphicsLayer, {
                    q: 2,
                    r: 0,
                })
            ).toBeFalsy()
        })
        it("can return all of its highlighted tiles, excluding some locations", () => {
            const locationsByResourceName =
                MapGraphicsLayerService.getHighlightedTileDescriptions(
                    mapGraphicsLayer,
                    [
                        { q: 0, r: 1 },
                        { q: 0, r: 2 },
                    ]
                )

            expect(locationsByResourceName).toHaveLength(1)
            expect(locationsByResourceName).toEqual(
                expect.arrayContaining([
                    {
                        tiles: [{ q: 0, r: 0 }],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        overlayImageResourceName: "1 move icon",
                    },
                ])
            )
        })
    })
})
