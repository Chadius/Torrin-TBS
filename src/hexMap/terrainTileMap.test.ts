import {TerrainTileMap, TerrainTileMapHelper} from "./terrainTileMap";
import {HexGridTile} from "./hexGrid";
import {HEX_TILE_WIDTH} from "../graphicsConstants";
import {HexGridMovementCost} from "./hexGridMovementCost";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {MapLayer} from "../missionMap/mapLayer";

describe('hexMap', () => {
    describe('mouseClicks on the map', () => {
        it('should select tiles in a hex pattern according to where the mouse clicked', function () {
            const gridTiles: HexGridTile[] = [
                {q: 0, r: 0, terrainType: HexGridMovementCost.pit},
                {q: 0, r: 1, terrainType: HexGridMovementCost.pit},
                {q: 0, r: 2, terrainType: HexGridMovementCost.pit},
                {q: 0, r: -1, terrainType: HexGridMovementCost.pit},
                {q: 1, r: 0, terrainType: HexGridMovementCost.pit},
                {q: -1, r: 0, terrainType: HexGridMovementCost.pit},
            ];

            const hexGrid = new TerrainTileMap({tiles: gridTiles});

            hexGrid.mouseClicked(-100, -100, 0, 0);
            expect(hexGrid.outlineTileCoordinates).toBe(undefined);

            hexGrid.mouseClicked(ScreenDimensions.SCREEN_WIDTH / 2, ScreenDimensions.SCREEN_HEIGHT / 2, 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 0});

            hexGrid.mouseClicked(ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH, ScreenDimensions.SCREEN_HEIGHT / 2, 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 1});

            hexGrid.mouseClicked(ScreenDimensions.SCREEN_WIDTH / 2 + (2 * HEX_TILE_WIDTH), ScreenDimensions.SCREEN_HEIGHT / 2, 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 2});

            hexGrid.mouseClicked(ScreenDimensions.SCREEN_WIDTH / 2 - HEX_TILE_WIDTH, ScreenDimensions.SCREEN_HEIGHT / 2, 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: -1});

            hexGrid.mouseClicked(ScreenDimensions.SCREEN_WIDTH / 2 + (HEX_TILE_WIDTH / 2), ScreenDimensions.SCREEN_HEIGHT / 2 + (HEX_TILE_WIDTH / 2), 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 1, r: 0});

            hexGrid.mouseClicked(ScreenDimensions.SCREEN_WIDTH / 2 - (HEX_TILE_WIDTH / 2), ScreenDimensions.SCREEN_HEIGHT / 2 - (HEX_TILE_WIDTH / 2), 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: -1, r: -0});
        });
    });
    it('can note which tiles are at which locations', () => {
        const gridTiles: HexGridTile[] = [
            {q: 0, r: 0, terrainType: HexGridMovementCost.pit},
            {q: 0, r: 1, terrainType: HexGridMovementCost.doubleMovement},
            {q: 0, r: 2, terrainType: HexGridMovementCost.wall},
            {q: 0, r: -1, terrainType: HexGridMovementCost.singleMovement},
            {q: 1, r: 0, terrainType: HexGridMovementCost.doubleMovement},
            {q: -1, r: 0, terrainType: HexGridMovementCost.pit},
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
    it('can calculate the bounding box dimension of a map', () => {
        const bigMap: TerrainTileMap = new TerrainTileMap({
            movementCost: [
                "1 1 1 1 1 ",
                " 1 1 1 1 1 ",
                "  1 1 1 1 1 ",
                "   1 1 1 1 ",
            ]
        });

        expect(bigMap.getDimensions()).toStrictEqual({widthOfWidestRow: 5, numberOfRows: 4});
    });

    describe('can generate map layers based on the terrain', () => {
        it('can generate map layers based on whether you can visit them later on or it is not applicable', () => {
            const terrain = new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            });

            const mapWithLocationsThatCanBeVisitedByWalker: MapLayer = TerrainTileMapHelper.createMapLayerForVisitableTiles({
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

            const mapWithLocationsThatCanBeVisitedByFlyer: MapLayer = TerrainTileMapHelper.createMapLayerForVisitableTiles({
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

            const mapWithLocationsThatCanBeVisitedByTeleport: MapLayer = TerrainTileMapHelper.createMapLayerForVisitableTiles({
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

            const mapWithLocationsThatCanBeStoppedOn: MapLayer = TerrainTileMapHelper.createMapLayerForStoppableTiles({
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
    });
});
