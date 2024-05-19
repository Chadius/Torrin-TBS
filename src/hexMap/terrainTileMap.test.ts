import {TerrainTileMap, TerrainTileMapService} from "./terrainTileMap";
import {HexGridTile} from "./hexGrid";
import {HEX_TILE_WIDTH} from "../graphicsConstants";
import {HexGridMovementCost} from "./hexGridMovementCost";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {MapLayer} from "../missionMap/mapLayer";
import {MouseButton} from "../utils/mouseConfig";
import {convertMapCoordinatesToWorldCoordinates} from "./convertCoordinates";
import {BattleCamera} from "../battle/battleCamera";

describe('hexMap', () => {
    describe('mouseClicks on the map', () => {
        it('should select tiles in a hex pattern according to where the mouse clicked', function () {
            const gridTiles: HexGridTile[] = [
                {q: 0, r: 0, terrainType: HexGridMovementCost.pit, worldLocation: {x: 0, y: 0}},
                {q: 0, r: 1, terrainType: HexGridMovementCost.pit, worldLocation: {x: 0, y: 0}},
                {q: 0, r: 2, terrainType: HexGridMovementCost.pit, worldLocation: {x: 0, y: 0}},
                {q: 0, r: -1, terrainType: HexGridMovementCost.pit, worldLocation: {x: 0, y: 0}},
                {q: 1, r: 0, terrainType: HexGridMovementCost.pit, worldLocation: {x: 0, y: 0}},
                {q: -1, r: 0, terrainType: HexGridMovementCost.pit, worldLocation: {x: 0, y: 0}},
            ];

            const hexGrid = new TerrainTileMap({tiles: gridTiles});

            hexGrid.mouseClicked({
                mouseX: -100,
                mouseY: -100,
                cameraX: 0,
                cameraY: 0,
                mouseButton: MouseButton.ACCEPT
            });

            expect(hexGrid.outlineTileCoordinates).toBe(undefined);

            hexGrid.mouseClicked({
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2,
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 0,
                cameraY: 0,
                mouseButton: MouseButton.ACCEPT
            });
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 0});

            hexGrid.mouseClicked({
                mouseButton: MouseButton.ACCEPT,
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 0,
                cameraY: 0
            });
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 1});

            hexGrid.mouseClicked({
                mouseButton: MouseButton.ACCEPT,
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2 + (2 * HEX_TILE_WIDTH),
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 0,
                cameraY: 0
            });
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 2});

            hexGrid.mouseClicked({
                mouseButton: MouseButton.ACCEPT,
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2 - HEX_TILE_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraX: 0,
                cameraY: 0
            });
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: -1});

            hexGrid.mouseClicked({
                mouseButton: MouseButton.ACCEPT,
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2 + (HEX_TILE_WIDTH / 2),
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2 + (HEX_TILE_WIDTH / 2),
                cameraX: 0,
                cameraY: 0
            });
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 1, r: 0});

            hexGrid.mouseClicked({
                mouseButton: MouseButton.ACCEPT,
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2 - (HEX_TILE_WIDTH / 2),
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2 - (HEX_TILE_WIDTH / 2),
                cameraX: 0,
                cameraY: 0
            });
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: -1, r: -0});
        });
    });
    it('can note which tiles are at which locations', () => {
        const gridTiles: HexGridTile[] = [
            {q: 0, r: 0, terrainType: HexGridMovementCost.pit, worldLocation: {x: 0, y: 0}},
            {q: 0, r: 1, terrainType: HexGridMovementCost.doubleMovement, worldLocation: {x: 0, y: 0}},
            {q: 0, r: 2, terrainType: HexGridMovementCost.wall, worldLocation: {x: 0, y: 0}},
            {q: 0, r: -1, terrainType: HexGridMovementCost.singleMovement, worldLocation: {x: 0, y: 0}},
            {q: 1, r: 0, terrainType: HexGridMovementCost.doubleMovement, worldLocation: {x: 0, y: 0}},
            {q: -1, r: 0, terrainType: HexGridMovementCost.pit, worldLocation: {x: 0, y: 0}},
        ];

        const hexGrid = new TerrainTileMap({tiles: gridTiles});
        expect(hexGrid.getTileTerrainTypeAtLocation({q: 0, r: 0})).toBe(HexGridMovementCost.pit);
        expect(hexGrid.getTileTerrainTypeAtLocation({
            q: 0,
            r: 1
        })).toBe(HexGridMovementCost.doubleMovement);
        expect(hexGrid.getTileTerrainTypeAtLocation({q: 0, r: 2})).toBe(HexGridMovementCost.wall);
        expect(hexGrid.getTileTerrainTypeAtLocation({
            q: 0,
            r: -1
        })).toBe(HexGridMovementCost.singleMovement);
        expect(hexGrid.getTileTerrainTypeAtLocation({
            q: 1,
            r: 0
        })).toBe(HexGridMovementCost.doubleMovement);
        expect(hexGrid.getTileTerrainTypeAtLocation({q: -1, r: 0})).toBe(HexGridMovementCost.pit);

        expect(hexGrid.getTileTerrainTypeAtLocation({q: 3, r: 3})).toBeUndefined();

        expect(hexGrid.areCoordinatesOnMap({q: 0, r: 0})).toBeTruthy();
        expect(hexGrid.areCoordinatesOnMap({q: 0, r: 1})).toBeTruthy();
        expect(hexGrid.areCoordinatesOnMap({q: 0, r: 2})).toBeTruthy();
        expect(hexGrid.areCoordinatesOnMap({q: 0, r: -1})).toBeTruthy();
        expect(hexGrid.areCoordinatesOnMap({q: 1, r: 0})).toBeTruthy();
        expect(hexGrid.areCoordinatesOnMap({q: -1, r: 0})).toBeTruthy();

        expect(hexGrid.areCoordinatesOnMap({q: 3, r: 3})).toBeFalsy();

        expect(hexGrid.areCoordinatesOnMap(undefined)).toBeFalsy();
    });
    describe('can create maps using text strings', () => {
        const verifyTileAtLocationIsExpectedMovementCost = (map: TerrainTileMap, q: number, r: number, expectedMovementCost: HexGridMovementCost): void => {
            const actualMovementCost = map.getTileTerrainTypeAtLocation({q: q, r: r});
            try {
                expect(actualMovementCost).toBe(expectedMovementCost);
            } catch (e) {
                throw new Error(`Expected to find tile of type ${expectedMovementCost} at (${q}, ${r}), found ${actualMovementCost}`);
            }
        }

        it('a single row', () => {
            const mapFromSingleLine = new TerrainTileMap({
                movementCost: [
                    "1 2 - x 1122--xxOO"
                ]
            });

            verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 0, HexGridMovementCost.singleMovement);
            verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 1, HexGridMovementCost.doubleMovement);
            verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 2, HexGridMovementCost.pit);
            verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 3, HexGridMovementCost.wall);
            verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 4, HexGridMovementCost.singleMovement);
            verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 5, HexGridMovementCost.doubleMovement);
            verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 6, HexGridMovementCost.pit);
            verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 7, HexGridMovementCost.wall);
            verifyTileAtLocationIsExpectedMovementCost(mapFromSingleLine, 0, 8, HexGridMovementCost.pit);
        });

        it('multiple rows use offsets to place the 0 tile', () => {
            const mapFromMultipleLines = new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 2 2 2 ",
                    "  _ _ _ ",
                    "   x x x ",
                ]
            });

            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 0, 0, HexGridMovementCost.singleMovement);
            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 0, 1, HexGridMovementCost.singleMovement);
            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 0, 2, HexGridMovementCost.singleMovement);

            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 1, 0, HexGridMovementCost.doubleMovement);
            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 1, 1, HexGridMovementCost.doubleMovement);
            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 1, 2, HexGridMovementCost.doubleMovement);

            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 2, 0, HexGridMovementCost.pit);
            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 2, 1, HexGridMovementCost.pit);
            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 2, 2, HexGridMovementCost.pit);

            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 3, 0, HexGridMovementCost.wall);
            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 3, 1, HexGridMovementCost.wall);
            verifyTileAtLocationIsExpectedMovementCost(mapFromMultipleLines, 3, 2, HexGridMovementCost.wall);
        });
    });

    describe('world location and bounding boxes', () => {
        let bigMap: TerrainTileMap

        beforeEach(() => {
            bigMap = new TerrainTileMap({
                movementCost: [
                    "1 1 1 1 1 ",
                    " 1 1 1 1 1 ",
                    "  1 1 1 1 1 ",
                    "   1 1 1 1 ",
                ]
            })
        })

        it('can calculate the bounding box dimension of a map', () => {
            expect(bigMap.getDimensions()).toStrictEqual({widthOfWidestRow: 5, numberOfRows: 4})
        })

        it('generates world locations of all tiles', () => {
            const bigMap: TerrainTileMap = new TerrainTileMap({
                movementCost: [
                    "1 1 1 1 1 ",
                    " 1 1 1 1 1 ",
                    "  1 1 1 1 1 ",
                    "   1 1 1 1 ",
                ]
            })

            expect(TerrainTileMapService.getWorldLocation(bigMap, 0, 0).x).toBeCloseTo(0)
            expect(TerrainTileMapService.getWorldLocation(bigMap, 0, 0).y).toBeCloseTo(0)

            const expectedLocationFor33 = convertMapCoordinatesToWorldCoordinates(3, 3)
            expect(TerrainTileMapService.getWorldLocation(bigMap, 3, 3).x).toBeCloseTo(expectedLocationFor33[0])
            expect(TerrainTileMapService.getWorldLocation(bigMap, 3, 3).y).toBeCloseTo(expectedLocationFor33[1])

            expect(TerrainTileMapService.getWorldLocation(bigMap, 3, 4).x).toBeUndefined()
            expect(TerrainTileMapService.getWorldLocation(bigMap, 3, 4).y).toBeUndefined()

            expect(TerrainTileMapService.getWorldLocation(bigMap, 5, 4).x).toBeUndefined()
            expect(TerrainTileMapService.getWorldLocation(bigMap, 5, 4).y).toBeUndefined()
        })

        it('calculates the bounding box using world coordinates', () => {
            let expectedWorldBoundariesSize = convertMapCoordinatesToWorldCoordinates(4 + 1, 5 + 1)

            const dimensions = TerrainTileMapService.getWorldBoundingBox(bigMap)

            expect(dimensions.width).toBeCloseTo(expectedWorldBoundariesSize[0])
            expect(dimensions.height).toBeCloseTo(expectedWorldBoundariesSize[1])
        })
    })

    describe('can generate map layers based on the terrain', () => {
        it('can generate map layers based on whether you can visit them later on or it is not applicable', () => {
            const terrain = new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            });

            const mapWithLocationsThatCanBeVisitedByWalker: MapLayer = TerrainTileMapService.createMapLayerForVisitableTiles({
                terrainTileMap: terrain,
                canCrossOverPits: false,
                canPassThroughWalls: false
            });
            [0, 1, 2, 3, 4].forEach(r => {
                [0, 1].forEach(q => {
                    const expectedValue: boolean | undefined = [HexGridMovementCost.wall, HexGridMovementCost.pit].includes(terrain.getTileTerrainTypeAtLocation({
                        q,
                        r
                    }))
                        ? undefined
                        : false;

                    expect(mapWithLocationsThatCanBeVisitedByWalker.valueByLocation[q][r]).toBe(expectedValue);
                });
            });

            const mapWithLocationsThatCanBeVisitedByFlyer: MapLayer = TerrainTileMapService.createMapLayerForVisitableTiles({
                terrainTileMap: terrain,
                canCrossOverPits: true,
                canPassThroughWalls: false
            });
            [0, 1, 2, 3, 4].forEach(r => {
                [0, 1].forEach(q => {
                    const expectedValue: boolean | undefined = [HexGridMovementCost.wall].includes(terrain.getTileTerrainTypeAtLocation({
                        q,
                        r
                    }))
                        ? undefined
                        : false;

                    expect(mapWithLocationsThatCanBeVisitedByFlyer.valueByLocation[q][r]).toBe(expectedValue);
                });
            });

            const mapWithLocationsThatCanBeVisitedByTeleport: MapLayer = TerrainTileMapService.createMapLayerForVisitableTiles({
                terrainTileMap: terrain,
                canCrossOverPits: true,
                canPassThroughWalls: true
            });
            [0, 1, 2, 3, 4].forEach(r => {
                [0, 1].forEach(q => {
                    const expectedValue = false;

                    expect(mapWithLocationsThatCanBeVisitedByTeleport.valueByLocation[q][r]).toBe(expectedValue);
                });
            });
        });
        it('can generate map layers based on whether you can stop on them later on or it is not applicable', () => {
            const terrain = new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            });

            const mapWithLocationsThatCanBeStoppedOn: MapLayer = TerrainTileMapService.createMapLayerForStoppableTiles({
                terrainTileMap: terrain,
            });
            [0, 1, 2, 3, 4].forEach(r => {
                [0, 1].forEach(q => {
                    const expectedValue: boolean | undefined = [HexGridMovementCost.wall, HexGridMovementCost.pit].includes(terrain.getTileTerrainTypeAtLocation({
                        q,
                        r
                    }))
                        ? undefined
                        : false;

                    expect(mapWithLocationsThatCanBeStoppedOn.valueByLocation[q][r]).toBe(expectedValue);
                });
            });
        });
    })

    describe('isOnScreen', () => {
        let map: TerrainTileMap

        beforeEach(() => {
            map = new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                    "  1 1 1 ",
                ]
            })
        })

        it('knows all of the tiles are on screen', () => {
            const centerOfMap = convertMapCoordinatesToWorldCoordinates(1, 1)
            const camera = new BattleCamera(centerOfMap[0], centerOfMap[1])
            expect(TerrainTileMapService.isTileOnScreen(map, 0, 0, camera)).toBeTruthy()
            expect(TerrainTileMapService.isTileOnScreen(map, 0, 1, camera)).toBeTruthy()
            expect(TerrainTileMapService.isTileOnScreen(map, 0, 2, camera)).toBeTruthy()
            expect(TerrainTileMapService.isTileOnScreen(map, 1, 0, camera)).toBeTruthy()
            expect(TerrainTileMapService.isTileOnScreen(map, 1, 1, camera)).toBeTruthy()
            expect(TerrainTileMapService.isTileOnScreen(map, 1, 2, camera)).toBeTruthy()
            expect(TerrainTileMapService.isTileOnScreen(map, 2, 0, camera)).toBeTruthy()
            expect(TerrainTileMapService.isTileOnScreen(map, 2, 1, camera)).toBeTruthy()
            expect(TerrainTileMapService.isTileOnScreen(map, 2, 2, camera)).toBeTruthy()
        })

        it('knows when tiles have scrolled off the top of the screen', () => {
            const centerOfMap = convertMapCoordinatesToWorldCoordinates(1, 1)
            const camera = new BattleCamera(centerOfMap[0], centerOfMap[1] + ScreenDimensions.SCREEN_HEIGHT / 2 + HEX_TILE_WIDTH / 2)
            expect(TerrainTileMapService.isTileOnScreen(map, 0, 1, camera)).toBeFalsy()
            expect(TerrainTileMapService.isTileOnScreen(map, 1, 1, camera)).toBeTruthy()
        })

        it('knows when tiles have scrolled off the bottom of the screen', () => {
            const centerOfMap = convertMapCoordinatesToWorldCoordinates(1, 1)
            const camera = new BattleCamera(centerOfMap[0], centerOfMap[1] - ScreenDimensions.SCREEN_HEIGHT / 2 - HEX_TILE_WIDTH / 2)
            expect(TerrainTileMapService.isTileOnScreen(map, 1, 1, camera)).toBeTruthy()
            expect(TerrainTileMapService.isTileOnScreen(map, 2, 1, camera)).toBeFalsy()
        })

        it('knows when tiles have scrolled off the left of the screen', () => {
            const centerOfMap = convertMapCoordinatesToWorldCoordinates(0, 1)
            const camera = new BattleCamera(centerOfMap[0] + ScreenDimensions.SCREEN_WIDTH / 2, centerOfMap[1])
            expect(TerrainTileMapService.isTileOnScreen(map, 0, 0, camera)).toBeFalsy()
            expect(TerrainTileMapService.isTileOnScreen(map, 0, 1, camera)).toBeTruthy()
        })

        it('knows when tiles have scrolled off the right of the screen', () => {
            const centerOfMap = convertMapCoordinatesToWorldCoordinates(0, 1)
            const camera = new BattleCamera(centerOfMap[0] - ScreenDimensions.SCREEN_WIDTH / 2 - HEX_TILE_WIDTH / 2, centerOfMap[1])
            expect(TerrainTileMapService.isTileOnScreen(map, 0, 1, camera)).toBeTruthy()
            expect(TerrainTileMapService.isTileOnScreen(map, 0, 2, camera)).toBeFalsy()
        })

    })
})
