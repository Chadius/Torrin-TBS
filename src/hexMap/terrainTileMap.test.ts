import {
    HighlightTileDescription,
    TerrainTileMap,
    TerrainTileMapService,
} from "./terrainTileMap"
import { HEX_TILE_WIDTH } from "../graphicsConstants"
import { HexGridMovementCost } from "./hexGridMovementCost"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { MapSearchDataLayer } from "../missionMap/mapSearchDataLayer"
import { MouseButton } from "../utils/mouseConfig"
import { ConvertCoordinateService } from "./convertCoordinates"
import { BattleCamera } from "../battle/battleCamera"
import {
    MapGraphicsLayer,
    MapGraphicsLayerHighlight,
    MapGraphicsLayerService,
} from "./mapGraphicsLayer"
import {
    HighlightPulseBlueColor,
    HighlightPulseRedColor,
} from "./hexDrawingUtils"
import { HexCoordinate } from "./hexCoordinate/hexCoordinate"
import { PulseBlendColor } from "./colorUtils"

describe("Terrain Tile Map", () => {
    describe("mouseClicks on the map change the outlined tile", () => {
        let hexGrid: TerrainTileMap

        beforeEach(() => {
            hexGrid = TerrainTileMapService.new({
                movementCost: ["x - x ", " - - - ", "  x - x "],
            })
        })

        it("should clear the outlined tile when you click off map", () => {
            TerrainTileMapService.mouseClicked({
                terrainTileMap: hexGrid,
                mouseX: -100,
                mouseY: -100,
                cameraX: 0,
                cameraY: 0,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(hexGrid.outlineTileCoordinates).toBe(undefined)
        })

        const tests = [
            { q: 0, r: 0 },
            { q: 1, r: -0 },
            { q: 2, r: 0 },
            { q: 0, r: 1 },
            { q: 1, r: 1 },
            { q: 1, r: 1 },
            { q: 0, r: 2 },
            { q: 2, r: 1 },
            { q: 1, r: 2 },
            { q: 2, r: 2 },
        ]
        it.each(tests)(
            `($q, $r): click on this region to select the tile`,
            ({ q, r }) => {
                TerrainTileMapService.mouseClicked({
                    terrainTileMap: hexGrid,
                    mouseButton: MouseButton.ACCEPT,
                    mouseX:
                        ScreenDimensions.SCREEN_WIDTH / 2 +
                        HEX_TILE_WIDTH * (r + q * 0.5),
                    mouseY:
                        ScreenDimensions.SCREEN_HEIGHT / 2 +
                        q * 0.866 * HEX_TILE_WIDTH,
                    cameraX: 0,
                    cameraY: 0,
                })

                expect(hexGrid.outlineTileCoordinates).toEqual(
                    expect.objectContaining({ q, r })
                )
            }
        )
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
    })

    describe("isOnScreen", () => {
        let map: TerrainTileMap

        beforeEach(() => {
            map = TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            })
        })

        it("knows all of the tiles are on screen", () => {
            const centerOfMap =
                ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    1,
                    1
                )
            const camera = new BattleCamera(centerOfMap[0], centerOfMap[1])
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 0, r: 0 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 0, r: 1 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 0, r: 2 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 1, r: 0 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 1, r: 1 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 1, r: 2 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 2, r: 0 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 2, r: 1 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 2, r: 2 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 2, r: -1 },
                    camera,
                })
            ).toBeTruthy()

            const onScreenLocations =
                TerrainTileMapService.getAllOnscreenLocations({
                    terrainTileMap: map,
                    camera,
                })
            expect(onScreenLocations).toHaveLength(10)
            expect(
                onScreenLocations.map((location) => ({
                    q: location.q,
                    r: location.r,
                }))
            ).toEqual(
                expect.arrayContaining([
                    { q: 0, r: 0 },
                    { q: 0, r: 1 },
                    { q: 0, r: 2 },
                    { q: 1, r: 0 },
                    { q: 1, r: 1 },
                    { q: 1, r: 2 },
                    { q: 2, r: -1 },
                    { q: 2, r: 0 },
                    { q: 2, r: 1 },
                    { q: 2, r: 2 },
                ])
            )
        })

        it("knows when tiles have scrolled off the top of the screen", () => {
            const centerOfMap =
                ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    1,
                    1
                )
            const camera = new BattleCamera(
                centerOfMap[0],
                centerOfMap[1] +
                    ScreenDimensions.SCREEN_HEIGHT / 2 +
                    HEX_TILE_WIDTH / 2
            )
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 0, r: 1 },
                    camera,
                })
            ).toBeFalsy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 1, r: 1 },
                    camera,
                })
            ).toBeTruthy()
        })

        it("knows when tiles have scrolled off the bottom of the screen", () => {
            const centerOfMap =
                ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    1,
                    1
                )
            const camera = new BattleCamera(
                centerOfMap[0],
                centerOfMap[1] -
                    ScreenDimensions.SCREEN_HEIGHT / 2 -
                    HEX_TILE_WIDTH / 2
            )
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 1, r: 1 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 2, r: 1 },
                    camera,
                })
            ).toBeFalsy()
        })

        it("knows when tiles have scrolled off the left of the screen", () => {
            const centerOfMap =
                ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    0,
                    1
                )
            const camera = new BattleCamera(
                centerOfMap[0] + ScreenDimensions.SCREEN_WIDTH / 2,
                centerOfMap[1]
            )
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 0, r: 0 },
                    camera,
                })
            ).toBeFalsy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 0, r: 1 },
                    camera,
                })
            ).toBeTruthy()
        })

        it("knows when tiles have scrolled off the right of the screen", () => {
            const centerOfMap =
                ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    0,
                    1
                )
            const camera = new BattleCamera(
                centerOfMap[0] -
                    ScreenDimensions.SCREEN_WIDTH / 2 -
                    HEX_TILE_WIDTH / 2,
                centerOfMap[1]
            )
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 0, r: 1 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileMapService.isLocationOnScreen({
                    terrainTileMap: map,
                    location: { q: 0, r: 2 },
                    camera,
                })
            ).toBeFalsy()
        })
    })

    describe("graphics layer", () => {
        let map: TerrainTileMap
        let layer0: MapGraphicsLayer
        let layer1: MapGraphicsLayer

        beforeEach(() => {
            map = TerrainTileMapService.new({
                movementCost: ["1 1 2 ", " x 1 _ "],
            })
            layer0 = MapGraphicsLayerService.new({
                id: "layer0",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HighlightPulseBlueColor,
                        tiles: [
                            { q: 0, r: 1 },
                            { q: 1, r: 2 },
                        ],
                    },
                ],
            })
            layer1 = MapGraphicsLayerService.new({
                id: "layer1",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HighlightPulseBlueColor,
                        tiles: [
                            { q: 0, r: 2 },
                            { q: 1, r: 1 },
                        ],
                    },
                ],
            })
        })

        it("can add a layer and retrieve it", () => {
            TerrainTileMapService.addGraphicsLayer(map, layer0)

            expect(
                TerrainTileMapService.getGraphicsLayer(map, layer0.id)
            ).toEqual(layer0)
        })
        it("update an existing layer if it is added again", () => {
            const layer0Alternate = MapGraphicsLayerService.new({
                id: "layer0",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HighlightPulseBlueColor,
                        tiles: [
                            { q: 0, r: 2 },
                            { q: 1, r: 1 },
                        ],
                    },
                ],
            })
            TerrainTileMapService.addGraphicsLayer(map, layer0Alternate)

            expect(
                TerrainTileMapService.getGraphicsLayer(map, layer0.id)
            ).toEqual(layer0Alternate)
        })
        it("can delete a layer given the id", () => {
            TerrainTileMapService.addGraphicsLayer(map, layer0)
            TerrainTileMapService.removeGraphicsLayer(map, layer0.id)

            expect(
                TerrainTileMapService.getGraphicsLayer(map, layer0.id)
            ).toBeUndefined()
        })
        it("can delete all layers", () => {
            TerrainTileMapService.addGraphicsLayer(map, layer0)
            TerrainTileMapService.addGraphicsLayer(map, layer1)
            TerrainTileMapService.removeAllGraphicsLayers(map)

            expect(
                TerrainTileMapService.getGraphicsLayer(map, layer0.id)
            ).toBeUndefined()
            expect(
                TerrainTileMapService.getGraphicsLayer(map, layer1.id)
            ).toBeUndefined()
        })
        it("can generate a list of highlighted tiles by composing the graphics layers", () => {
            const lowestLayer: MapGraphicsLayer = MapGraphicsLayerService.new({
                id: "lowest layer",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HighlightPulseBlueColor,
                        tiles: [
                            { q: 0, r: 2 },
                            { q: 1, r: 1 },
                        ],
                        overlayImageResourceName: "lowest layer",
                    },
                    {
                        pulseColor: HighlightPulseBlueColor,
                        tiles: [{ q: 0, r: 0 }],
                    },
                ],
            })
            TerrainTileMapService.addGraphicsLayer(map, lowestLayer)

            const midLayer: MapGraphicsLayer = MapGraphicsLayerService.new({
                id: "mid layer",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HighlightPulseBlueColor,
                        tiles: [{ q: 0, r: 2 }],
                        overlayImageResourceName: "mid layer",
                    },
                    {
                        pulseColor: HighlightPulseBlueColor,
                        tiles: [{ q: 1, r: 2 }],
                        overlayImageResourceName: "mid layer 2",
                    },
                ],
            })
            TerrainTileMapService.addGraphicsLayer(map, midLayer)

            const topLayer: MapGraphicsLayer = MapGraphicsLayerService.new({
                id: "top layer",
                highlightedTileDescriptions: [
                    {
                        pulseColor: HighlightPulseBlueColor,
                        tiles: [{ q: 0, r: 2 }],
                        overlayImageResourceName: "top layer",
                    },
                ],
            })
            TerrainTileMapService.addGraphicsLayer(map, topLayer)

            const computedHighlightedTiles: MapGraphicsLayerHighlight[] =
                TerrainTileMapService.computeHighlightedTiles(map)
            expect(computedHighlightedTiles).toEqual(
                expect.arrayContaining([
                    {
                        location: { q: 0, r: 0 },
                        pulseColor: HighlightPulseBlueColor,
                    },
                    {
                        location: { q: 0, r: 2 },
                        pulseColor: HighlightPulseBlueColor,
                        overlayImageResourceName: "top layer",
                    },
                    {
                        location: { q: 1, r: 1 },
                        pulseColor: HighlightPulseBlueColor,
                        overlayImageResourceName: "lowest layer",
                    },
                    {
                        location: { q: 1, r: 2 },
                        pulseColor: HighlightPulseBlueColor,
                        overlayImageResourceName: "mid layer 2",
                    },
                ])
            )
        })
    })
})
