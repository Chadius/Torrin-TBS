import { TerrainTileMap, TerrainTileMapService } from "./terrainTileMap"
import { HEX_TILE_RADIUS, HEX_TILE_WIDTH } from "../graphicsConstants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { MouseButton } from "../utils/mouseConfig"
import { ConvertCoordinateService } from "./convertCoordinates"
import { BattleCamera } from "../battle/battleCamera"
import { TerrainTileGraphicsService } from "./terrainTileGraphics"
import { beforeEach, describe, expect, it } from "vitest"

describe("Terrain Tile Graphics", () => {
    describe("mouseClicks on the map change the outlined tile", () => {
        let hexGrid: TerrainTileMap

        beforeEach(() => {
            hexGrid = TerrainTileMapService.new({
                movementCost: ["x - x ", " - - - ", "  x - x "],
            })
        })

        it("should clear the outlined tile when you click off map", () => {
            TerrainTileGraphicsService.mouseClicked({
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
            { q: 1, r: 0 },
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
            `($q, $r): click on the screen to select the tile`,
            ({ q, r }) => {
                TerrainTileGraphicsService.mouseClicked({
                    terrainTileMap: hexGrid,
                    mouseButton: MouseButton.ACCEPT,
                    mouseX:
                        ScreenDimensions.SCREEN_WIDTH / 2 +
                        HEX_TILE_WIDTH * (r + q * 0.5),
                    mouseY:
                        ScreenDimensions.SCREEN_HEIGHT / 2 +
                        (q * 3 * HEX_TILE_RADIUS) / 2,
                    cameraX: 0,
                    cameraY: 0,
                })

                expect(hexGrid.outlineTileCoordinates).toEqual(
                    expect.objectContaining({ q, r })
                )
            }
        )
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
                ConvertCoordinateService.convertMapCoordinatesToWorldLocation(
                    1,
                    1
                )
            const camera = new BattleCamera(
                centerOfMap.worldX,
                centerOfMap.worldY
            )
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 0, r: 0 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 0, r: 1 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 0, r: 2 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 1, r: 0 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 1, r: 1 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 1, r: 2 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 2, r: 0 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 2, r: 1 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 2, r: 2 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 2, r: -1 },
                    camera,
                })
            ).toBeTruthy()

            const onScreenTerrainTiles =
                TerrainTileGraphicsService.getAllOnscreenTerrainTiles({
                    terrainTileMap: map,
                    camera,
                })
            expect(onScreenTerrainTiles).toHaveLength(10)
            expect(
                onScreenTerrainTiles.map((tile) => ({
                    q: tile.q,
                    r: tile.r,
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
                ConvertCoordinateService.convertMapCoordinatesToWorldLocation(
                    1,
                    1
                )
            const camera = new BattleCamera(
                centerOfMap.worldX,
                centerOfMap.worldY +
                    ScreenDimensions.SCREEN_HEIGHT / 2 +
                    HEX_TILE_WIDTH / 2
            )
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 0, r: 1 },
                    camera,
                })
            ).toBeFalsy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 1, r: 1 },
                    camera,
                })
            ).toBeTruthy()
        })

        it("knows when tiles have scrolled off the bottom of the screen", () => {
            const centerOfMap =
                ConvertCoordinateService.convertMapCoordinatesToWorldLocation(
                    1,
                    1
                )
            const camera = new BattleCamera(
                centerOfMap.worldX,
                centerOfMap.worldY -
                    ScreenDimensions.SCREEN_HEIGHT / 2 -
                    HEX_TILE_WIDTH / 2
            )
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 1, r: 1 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 2, r: 1 },
                    camera,
                })
            ).toBeFalsy()
        })

        it("knows when tiles have scrolled off the left of the screen", () => {
            const centerOfMap =
                ConvertCoordinateService.convertMapCoordinatesToWorldLocation(
                    0,
                    1
                )
            const camera = new BattleCamera(
                centerOfMap.worldX + ScreenDimensions.SCREEN_WIDTH / 2,
                centerOfMap.worldY
            )
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 0, r: 0 },
                    camera,
                })
            ).toBeFalsy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 0, r: 1 },
                    camera,
                })
            ).toBeTruthy()
        })

        it("knows when tiles have scrolled off the right of the screen", () => {
            const centerOfMap =
                ConvertCoordinateService.convertMapCoordinatesToWorldLocation(
                    0,
                    1
                )
            const camera = new BattleCamera(
                centerOfMap.worldX -
                    ScreenDimensions.SCREEN_WIDTH / 2 -
                    HEX_TILE_WIDTH / 2,
                centerOfMap.worldY
            )
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 0, r: 1 },
                    camera,
                })
            ).toBeTruthy()
            expect(
                TerrainTileGraphicsService.isCoordinateOnScreen({
                    terrainTileMap: map,
                    coordinate: { q: 0, r: 2 },
                    camera,
                })
            ).toBeFalsy()
        })
    })
})
