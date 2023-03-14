import {TerrainTileMap} from "./terrainTileMap";
import {HexGridTile, Integer} from "./hexGrid";
import {HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {HexGridMovementCost} from "./hexGridMovementCost";

describe('hexMap', () => {
    describe('mouseClicks on the map', () => {
        it('should select tiles in a hex pattern according to where the mouse clicked', function () {
            const gridTiles: HexGridTile[] = [
                new HexGridTile(0 as Integer, 0 as Integer, HexGridMovementCost.pit),
                new HexGridTile(0 as Integer, 1 as Integer, HexGridMovementCost.pit),
                new HexGridTile(0 as Integer, 2 as Integer, HexGridMovementCost.pit),
                new HexGridTile(0 as Integer, -1 as Integer, HexGridMovementCost.pit),
                new HexGridTile(1 as Integer, 0 as Integer, HexGridMovementCost.pit),
                new HexGridTile(-1 as Integer, 0 as Integer, HexGridMovementCost.pit),
            ];

            const hexGrid = new TerrainTileMap({tiles: gridTiles});

            hexGrid.mouseClicked(-100, -100, 0, 0);
            expect(hexGrid.outlineTileCoordinates).toBe(undefined);

            hexGrid.mouseClicked(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 0});

            hexGrid.mouseClicked(SCREEN_WIDTH / 2 + HEX_TILE_WIDTH, SCREEN_HEIGHT / 2, 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 1});

            hexGrid.mouseClicked(SCREEN_WIDTH / 2 + (2 * HEX_TILE_WIDTH), SCREEN_HEIGHT / 2, 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: 2});

            hexGrid.mouseClicked(SCREEN_WIDTH / 2 - HEX_TILE_WIDTH, SCREEN_HEIGHT / 2, 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 0, r: -1});

            hexGrid.mouseClicked(SCREEN_WIDTH / 2 + (HEX_TILE_WIDTH / 2), SCREEN_HEIGHT / 2 + (HEX_TILE_WIDTH / 2), 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: 1, r: 0});

            hexGrid.mouseClicked(SCREEN_WIDTH / 2 - (HEX_TILE_WIDTH / 2), SCREEN_HEIGHT / 2 - (HEX_TILE_WIDTH / 2), 0, 0);
            expect(hexGrid.outlineTileCoordinates).toMatchObject({q: -1, r: -0});
        });
    });
    it('can note which tiles are at which locations', () => {
        const gridTiles: HexGridTile[] = [
            new HexGridTile(0 as Integer, 0 as Integer, HexGridMovementCost.pit),
            new HexGridTile(0 as Integer, 1 as Integer, HexGridMovementCost.doubleMovement),
            new HexGridTile(0 as Integer, 2 as Integer, HexGridMovementCost.wall),
            new HexGridTile(0 as Integer, -1 as Integer, HexGridMovementCost.singleMovement),
            new HexGridTile(1 as Integer, 0 as Integer, HexGridMovementCost.doubleMovement),
            new HexGridTile(-1 as Integer, 0 as Integer, HexGridMovementCost.pit),
        ];

        const hexGrid = new TerrainTileMap({tiles: gridTiles});
        expect(hexGrid.getTileTerrainTypeAtLocation({q: 0 as Integer, r: 0 as Integer})).toBe(HexGridMovementCost.pit);
        expect(hexGrid.getTileTerrainTypeAtLocation({
            q: 0 as Integer,
            r: 1 as Integer
        })).toBe(HexGridMovementCost.doubleMovement);
        expect(hexGrid.getTileTerrainTypeAtLocation({q: 0 as Integer, r: 2 as Integer})).toBe(HexGridMovementCost.wall);
        expect(hexGrid.getTileTerrainTypeAtLocation({
            q: 0 as Integer,
            r: -1 as Integer
        })).toBe(HexGridMovementCost.singleMovement);
        expect(hexGrid.getTileTerrainTypeAtLocation({
            q: 1 as Integer,
            r: 0 as Integer
        })).toBe(HexGridMovementCost.doubleMovement);
        expect(hexGrid.getTileTerrainTypeAtLocation({q: -1 as Integer, r: 0 as Integer})).toBe(HexGridMovementCost.pit);

        expect(hexGrid.getTileTerrainTypeAtLocation({q: 3 as Integer, r: 3 as Integer})).toBeUndefined();

        expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: 0 as Integer})).toBeTruthy();
        expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: 1 as Integer})).toBeTruthy();
        expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: 2 as Integer})).toBeTruthy();
        expect(hexGrid.areCoordinatesOnMap({q: 0 as Integer, r: -1 as Integer})).toBeTruthy();
        expect(hexGrid.areCoordinatesOnMap({q: 1 as Integer, r: 0 as Integer})).toBeTruthy();
        expect(hexGrid.areCoordinatesOnMap({q: -1 as Integer, r: 0 as Integer})).toBeTruthy();

        expect(hexGrid.areCoordinatesOnMap({q: 3 as Integer, r: 3 as Integer})).toBeFalsy();
    });
    describe('can create maps using text strings', () => {
        const verifyTileAtLocationIsExpectedMovementCost = (map: TerrainTileMap, q: number, r: number, expectedMovementCost: HexGridMovementCost): void => {
            const actualMovementCost = map.getTileTerrainTypeAtLocation({q: q as Integer, r: r as Integer});
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
});
