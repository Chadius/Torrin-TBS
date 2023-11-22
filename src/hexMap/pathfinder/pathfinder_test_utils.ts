import {TerrainTileMap} from "../terrainTileMap";
import {MissionMap} from "../../missionMap/missionMap";
import {TileFoundDescription} from "./tileFoundDescription";
import {SearchResults} from "./searchResults";
import {SearchPath} from "./searchPath";
import {HexCoordinate} from "../hexCoordinate/hexCoordinate";

export const createMap = (movementCost: string[]) => {
    const terrainTileMap: TerrainTileMap = new TerrainTileMap({movementCost});
    const missionMap: MissionMap = new MissionMap({terrainTileMap})
    return {
        missionMap,
    }
}

export const validateTilesAreFound = (tilesToTest: HexCoordinate[], tilesFound: HexCoordinate[], tilesNotFound: HexCoordinate[]) => {
    const tilesByKey: { [key: string]: boolean } = {};
    tilesFound.forEach((tile) => {
        const key = `${tile.q},${tile.r}`;
        if (tilesByKey[key]) {
            throw new Error(`Tiles Found has repeating tile (${tile.q}, ${tile.r})`)
        }
        tilesByKey[key] = true;
    });
    tilesNotFound.forEach((tile) => {
        const key = `${tile.q},${tile.r}`;
        if (tilesByKey[key]) {
            throw new Error(`Tiles Not Found has repeating tile (${tile.q}, ${tile.r})`)
        }
        tilesByKey[key] = true;
    });

    const sortTiles = (a: HexCoordinate, b: HexCoordinate) => {
        if (a.q < b.q) {
            return -1;
        } else if (a.q > b.q) {
            return 1;
        }

        if (a.r < a.r) {
            return -1;
        } else if (a.r > b.r) {
            return 1;
        }

        return 0;
    }

    tilesToTest.sort(sortTiles);

    expect(tilesToTest).toHaveLength(tilesFound.length);
    tilesFound.forEach((tile) => {
        try {
            expect(tilesToTest.some((tileDesc) => tileDesc.q === tile.q && tileDesc.r === tile.r)).toBeTruthy();
        } catch (e) {
            throw new Error(`Cannot find tile (${tile.q}, ${tile.r})`)
        }
    });
    tilesNotFound.forEach((tile) => {
        try {
            expect(tilesToTest.some((tileDesc) => tileDesc.q === tile.q && tileDesc.r === tile.r)).toBeFalsy();
        } catch (e) {
            throw new Error(`Should not have found tile (${tile.q}, ${tile.r})`)
        }
    });
};

export const validateTileHasExpectedNumberOfActions = (q: number, r: number, expectedActions: number, searchResults: SearchResults) => {
    const searchPath: SearchPath = searchResults.getLowestCostRoute(q, r);
    expect(searchPath).not.toBeUndefined();
    const tilesFoundByNumberOfActions: TileFoundDescription[][] = searchPath.tilesTraveledByNumberOfMovementActions;
    expect(tilesFoundByNumberOfActions[expectedActions]).not.toBeUndefined();
    const tileAtCoordinate = tilesFoundByNumberOfActions[expectedActions].find((t) => t.hexCoordinate.q === q && t.hexCoordinate.r === r);
    expect(tileAtCoordinate).not.toBeUndefined();
}
