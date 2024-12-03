import { TerrainTileMap, TerrainTileMapService } from "./terrainTileMap"
import { HexGridMovementCost } from "./hexGridMovementCost"
import {
    MapGraphicsLayer,
    MapGraphicsLayerHighlight,
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "./mapGraphicsLayer"
import { HIGHLIGHT_PULSE_COLOR } from "./hexDrawingUtils"

describe("Terrain Tile Map", () => {
    describe("directly select the map to change the outlined tile", () => {
        let hexGrid: TerrainTileMap

        beforeEach(() => {
            hexGrid = TerrainTileMapService.new({
                movementCost: ["x - x ", " - - - ", "  x - x "],
            })
        })

        it("should clear the outlined tile when you click off map", () => {
            TerrainTileMapService.selectCoordinate({
                terrainTileMap: hexGrid,
                q: -100,
                r: 9001,
            })

            expect(hexGrid.outlineTileCoordinates).toBe(undefined)
        })

        it("selects the tile as outlined", () => {
            TerrainTileMapService.selectCoordinate({
                terrainTileMap: hexGrid,
                q: 0,
                r: 0,
            })

            expect(hexGrid.outlineTileCoordinates).toEqual(
                expect.objectContaining({ q: 0, r: 0 })
            )
        })
    })
    it("can note which tiles are at which locations", () => {
        const hexGrid = TerrainTileMapService.new({
            movementCost: ["x - x x ", " 1 - 2 x ", "  x 2 x x "],
        })
        expect(
            TerrainTileMapService.getTileTerrainTypeAtLocation(hexGrid, {
                q: 1,
                r: 1,
            })
        ).toBe(HexGridMovementCost.pit)
        expect(
            TerrainTileMapService.getTileTerrainTypeAtLocation(hexGrid, {
                q: 1,
                r: 2,
            })
        ).toBe(HexGridMovementCost.doubleMovement)
        expect(
            TerrainTileMapService.getTileTerrainTypeAtLocation(hexGrid, {
                q: 1,
                r: 3,
            })
        ).toBe(HexGridMovementCost.wall)
        expect(
            TerrainTileMapService.getTileTerrainTypeAtLocation(hexGrid, {
                q: 1,
                r: 0,
            })
        ).toBe(HexGridMovementCost.singleMovement)
        expect(
            TerrainTileMapService.getTileTerrainTypeAtLocation(hexGrid, {
                q: 1,
                r: 2,
            })
        ).toBe(HexGridMovementCost.doubleMovement)
        expect(
            TerrainTileMapService.getTileTerrainTypeAtLocation(hexGrid, {
                q: 0,
                r: 1,
            })
        ).toBe(HexGridMovementCost.pit)

        expect(
            TerrainTileMapService.getTileTerrainTypeAtLocation(hexGrid, {
                q: 4,
                r: 4,
            })
        ).toBeUndefined()

        expect(
            TerrainTileMapService.isLocationOnMap(hexGrid, { q: 1, r: 1 })
        ).toBeTruthy()
        expect(
            TerrainTileMapService.isLocationOnMap(hexGrid, { q: 1, r: 2 })
        ).toBeTruthy()
        expect(
            TerrainTileMapService.isLocationOnMap(hexGrid, { q: 1, r: 3 })
        ).toBeTruthy()
        expect(
            TerrainTileMapService.isLocationOnMap(hexGrid, { q: 1, r: 0 })
        ).toBeTruthy()
        expect(
            TerrainTileMapService.isLocationOnMap(hexGrid, { q: 2, r: 1 })
        ).toBeTruthy()
        expect(
            TerrainTileMapService.isLocationOnMap(hexGrid, { q: 0, r: 1 })
        ).toBeTruthy()

        expect(
            TerrainTileMapService.isLocationOnMap(hexGrid, { q: 4, r: 4 })
        ).toBeFalsy()

        expect(
            TerrainTileMapService.isLocationOnMap(undefined, { q: 0, r: 0 })
        ).toBeFalsy()
    })
    describe("can create maps using text strings", () => {
        it("a single row", () => {
            const mapFromSingleLine = TerrainTileMapService.new({
                movementCost: ["1 2 - x 1122--xxOO"],
            })

            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromSingleLine,
                    {
                        q: 0,
                        r: 0,
                    }
                )
            ).toEqual(HexGridMovementCost.singleMovement)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromSingleLine,
                    {
                        q: 0,
                        r: 1,
                    }
                )
            ).toEqual(HexGridMovementCost.doubleMovement)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromSingleLine,
                    { q: 0, r: 2 }
                )
            ).toEqual(HexGridMovementCost.pit)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromSingleLine,
                    { q: 0, r: 3 }
                )
            ).toEqual(HexGridMovementCost.wall)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromSingleLine,
                    {
                        q: 0,
                        r: 4,
                    }
                )
            ).toEqual(HexGridMovementCost.singleMovement)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromSingleLine,
                    {
                        q: 0,
                        r: 5,
                    }
                )
            ).toEqual(HexGridMovementCost.doubleMovement)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromSingleLine,
                    { q: 0, r: 6 }
                )
            ).toEqual(HexGridMovementCost.pit)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromSingleLine,
                    { q: 0, r: 7 }
                )
            ).toEqual(HexGridMovementCost.wall)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromSingleLine,
                    { q: 0, r: 8 }
                )
            ).toEqual(HexGridMovementCost.pit)
        })

        it("multiple rows use offsets to place the 0 tile", () => {
            const mapFromMultipleLines = TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 2 2 2 ", "  _ _ _ ", "   x x x "],
            })

            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 0,
                        r: 0,
                    }
                )
            ).toEqual(HexGridMovementCost.singleMovement)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 0,
                        r: 1,
                    }
                )
            ).toEqual(HexGridMovementCost.singleMovement)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 0,
                        r: 2,
                    }
                )
            ).toEqual(HexGridMovementCost.singleMovement)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 1,
                        r: 0,
                    }
                )
            ).toEqual(HexGridMovementCost.doubleMovement)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 1,
                        r: 1,
                    }
                )
            ).toEqual(HexGridMovementCost.doubleMovement)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 1,
                        r: 2,
                    }
                )
            ).toEqual(HexGridMovementCost.doubleMovement)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 2,
                        r: 0,
                    }
                )
            ).toEqual(HexGridMovementCost.pit)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 2,
                        r: 1,
                    }
                )
            ).toEqual(HexGridMovementCost.pit)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 2,
                        r: 2,
                    }
                )
            ).toEqual(HexGridMovementCost.pit)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 3,
                        r: 0,
                    }
                )
            ).toEqual(HexGridMovementCost.wall)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 3,
                        r: 1,
                    }
                )
            ).toEqual(HexGridMovementCost.wall)
            expect(
                TerrainTileMapService.getTileTerrainTypeAtLocation(
                    mapFromMultipleLines,
                    {
                        q: 3,
                        r: 2,
                    }
                )
            ).toEqual(HexGridMovementCost.wall)
        })
    })
    describe("world location and bounding boxes", () => {
        let bigMap: TerrainTileMap

        beforeEach(() => {
            bigMap = TerrainTileMapService.new({
                movementCost: [
                    "1 1 1 1 1 ",
                    " 1 1 1 1 1 ",
                    "  1 1 1 1 1 ",
                    "   1 1 1 1 ",
                ],
            })
        })

        it("can calculate the bounding box dimension of a map", () => {
            expect(TerrainTileMapService.getDimensions(bigMap)).toStrictEqual({
                widthOfWidestRow: 5,
                numberOfRows: 4,
            })
        })

        it("can calculate the maximum distance aka diagonal across the map", () => {
            expect(TerrainTileMapService.getMaximumDistance(bigMap)).toEqual(9)
        })
    })
    describe("graphics layer", () => {
        let map: TerrainTileMap
        let clickedLayer: MapGraphicsLayer
        let hoveredLayer: MapGraphicsLayer

        beforeEach(() => {
            map = TerrainTileMapService.new({
                movementCost: ["1 1 2 ", " x 1 _ "],
            })
            clickedLayer = MapGraphicsLayerService.new({
                id: "clickedLayer",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        tiles: [
                            { q: 0, r: 1 },
                            { q: 1, r: 2 },
                        ],
                    },
                ],
                type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
            })
            hoveredLayer = MapGraphicsLayerService.new({
                id: "hoveredLayer",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        tiles: [
                            { q: 0, r: 2 },
                            { q: 1, r: 1 },
                        ],
                    },
                ],
                type: MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE,
            })
        })

        it("can add a layer and retrieve it", () => {
            TerrainTileMapService.addGraphicsLayer(map, clickedLayer)

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap: map,
                    id: clickedLayer.id,
                })
            ).toEqual(clickedLayer)
        })
        it("update an existing layer if it is added again", () => {
            const clickedLayerAlternate = MapGraphicsLayerService.new({
                id: "clickedLayer",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        tiles: [
                            { q: 0, r: 2 },
                            { q: 1, r: 1 },
                        ],
                    },
                ],
                type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
            })
            TerrainTileMapService.addGraphicsLayer(map, clickedLayerAlternate)

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap: map,
                    id: clickedLayer.id,
                })
            ).toEqual(clickedLayerAlternate)
        })
        it("can delete a layer given the id", () => {
            TerrainTileMapService.addGraphicsLayer(map, clickedLayer)
            TerrainTileMapService.removeGraphicsLayerById(map, clickedLayer.id)

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap: map,
                    id: clickedLayer.id,
                })
            ).toBeUndefined()
        })
        it("can delete a layer of a given type", () => {
            TerrainTileMapService.addGraphicsLayer(map, clickedLayer)
            TerrainTileMapService.addGraphicsLayer(map, hoveredLayer)
            TerrainTileMapService.removeGraphicsLayerByType(
                map,
                MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE
            )

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap: map,
                    id: hoveredLayer.id,
                })
            ).toBeUndefined()
            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap: map,
                    id: clickedLayer.id,
                })
            ).not.toBeUndefined()
        })
        it("can delete a layer of a given id and type", () => {
            TerrainTileMapService.addGraphicsLayer(map, clickedLayer)
            TerrainTileMapService.addGraphicsLayer(map, hoveredLayer)
            TerrainTileMapService.removeGraphicsLayerWithIdAndType({
                terrainTileMap: map,
                id: clickedLayer.id,
                type: MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE,
            })

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap: map,
                    id: hoveredLayer.id,
                })
            ).not.toBeUndefined()
            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap: map,
                    id: clickedLayer.id,
                })
            ).not.toBeUndefined()

            TerrainTileMapService.removeGraphicsLayerWithIdAndType({
                terrainTileMap: map,
                id: hoveredLayer.id,
                type: MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE,
            })

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap: map,
                    id: hoveredLayer.id,
                })
            ).toBeUndefined()
        })
        it("can delete all layers", () => {
            TerrainTileMapService.addGraphicsLayer(map, clickedLayer)
            TerrainTileMapService.addGraphicsLayer(map, hoveredLayer)
            TerrainTileMapService.removeAllGraphicsLayers(map)

            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap: map,
                    id: clickedLayer.id,
                })
            ).toBeUndefined()
            expect(
                TerrainTileMapService.getGraphicsLayer({
                    terrainTileMap: map,
                    id: hoveredLayer.id,
                })
            ).toBeUndefined()
        })
        it("can generate a list of highlighted tiles by composing the graphics layers", () => {
            const lowestLayer: MapGraphicsLayer = MapGraphicsLayerService.new({
                id: "lowest layer",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        tiles: [
                            { q: 0, r: 2 },
                            { q: 1, r: 1 },
                        ],
                        overlayImageResourceName: "lowest layer",
                    },
                    {
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        tiles: [{ q: 0, r: 0 }],
                    },
                ],
                type: MapGraphicsLayerType.UNKNOWN,
            })
            TerrainTileMapService.addGraphicsLayer(map, lowestLayer)

            const midLayer: MapGraphicsLayer = MapGraphicsLayerService.new({
                id: "mid layer",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        tiles: [{ q: 0, r: 2 }],
                        overlayImageResourceName: "mid layer",
                    },
                    {
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        tiles: [{ q: 1, r: 2 }],
                        overlayImageResourceName: "mid layer 2",
                    },
                ],
                type: MapGraphicsLayerType.UNKNOWN,
            })
            TerrainTileMapService.addGraphicsLayer(map, midLayer)

            const topLayer: MapGraphicsLayer = MapGraphicsLayerService.new({
                id: "top layer",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        tiles: [{ q: 0, r: 2 }],
                        overlayImageResourceName: "top layer",
                    },
                ],
                type: MapGraphicsLayerType.UNKNOWN,
            })
            TerrainTileMapService.addGraphicsLayer(map, topLayer)

            const computedHighlightedTiles: MapGraphicsLayerHighlight[] =
                TerrainTileMapService.computeHighlightedTiles(map)
            expect(computedHighlightedTiles).toEqual(
                expect.arrayContaining([
                    {
                        location: { q: 0, r: 0 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                    },
                    {
                        location: { q: 0, r: 2 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        overlayImageResourceName: "top layer",
                    },
                    {
                        location: { q: 1, r: 1 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        overlayImageResourceName: "lowest layer",
                    },
                    {
                        location: { q: 1, r: 2 },
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                        overlayImageResourceName: "mid layer 2",
                    },
                ])
            )
        })
        it("can sort the layers by drawing order", () => {
            const unknownLayersAreAlwaysFirst: MapGraphicsLayer =
                MapGraphicsLayerService.new({
                    id: "unknownLayersAreAlwaysFirst",
                    highlightedTileDescriptions: [
                        {
                            pulseColor: HIGHLIGHT_PULSE_COLOR.PURPLE,
                            tiles: [{ q: 0, r: 0 }],
                        },
                    ],
                    type: MapGraphicsLayerType.UNKNOWN,
                })

            const hoveredLayersBeforeClickedLayers: MapGraphicsLayer =
                MapGraphicsLayerService.new({
                    id: "hoveredLayersBeforeClickedLayers",
                    highlightedTileDescriptions: [
                        {
                            pulseColor: HIGHLIGHT_PULSE_COLOR.PURPLE,
                            tiles: [{ q: 0, r: 0 }],
                        },
                    ],
                    type: MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE,
                })

            const hoveredLayersBeforeClickedLayers2: MapGraphicsLayer =
                MapGraphicsLayerService.new({
                    id: "hoveredLayersBeforeClickedLayers2",
                    highlightedTileDescriptions: [
                        {
                            pulseColor: HIGHLIGHT_PULSE_COLOR.PURPLE,
                            tiles: [{ q: 0, r: 0 }],
                        },
                    ],
                    type: MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE,
                })

            const clickedLayerAfterHoveredLayer: MapGraphicsLayer =
                MapGraphicsLayerService.new({
                    id: "clickedLayerAfterHoveredLayer",
                    highlightedTileDescriptions: [
                        {
                            pulseColor: HIGHLIGHT_PULSE_COLOR.PURPLE,
                            tiles: [{ q: 0, r: 0 }],
                        },
                    ],
                    type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
                })

            TerrainTileMapService.addGraphicsLayer(
                map,
                clickedLayerAfterHoveredLayer
            )

            TerrainTileMapService.addGraphicsLayer(
                map,
                hoveredLayersBeforeClickedLayers
            )

            TerrainTileMapService.addGraphicsLayer(
                map,
                hoveredLayersBeforeClickedLayers2
            )

            TerrainTileMapService.addGraphicsLayer(
                map,
                unknownLayersAreAlwaysFirst
            )

            TerrainTileMapService.sortGraphicsLayersByType(map)
            expect(map.highlightLayers).toHaveLength(4)
            expect(map.highlightLayers[0]).toEqual(unknownLayersAreAlwaysFirst)
            expect(map.highlightLayers[1]).toEqual(
                hoveredLayersBeforeClickedLayers
            )
            expect(map.highlightLayers[2]).toEqual(
                hoveredLayersBeforeClickedLayers2
            )
            expect(map.highlightLayers[3]).toEqual(
                clickedLayerAfterHoveredLayer
            )
        })
    })
})
