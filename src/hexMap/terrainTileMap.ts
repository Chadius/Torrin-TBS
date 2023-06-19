import {HexGridTile} from "./hexGrid";
import {convertStringToMovementCost, HexGridMovementCost} from "./hexGridMovementCost";
import {
    convertScreenCoordinatesToWorldCoordinates,
    convertWorldCoordinatesToMapCoordinates
} from "./convertCoordinates";
import {ResourceHandler} from "../resource/resourceHandler";
import {PulseBlendColor} from "./colorUtils";
import {HexCoordinate} from "./hexCoordinate/hexCoordinate";

function convertMovementCostToTiles(movementCost: string[]): HexGridTile[] {
    const newTiles: HexGridTile[] = [];
    movementCost.forEach((costString, q_index) => {
        let r_index = 0 - Math.floor(q_index / 2);
        if (q_index % 2 !== costString.length % 2) {
            throw new Error(`movementCost validation failed: row ${q_index} `
                + `must have ${q_index % 2 === 0 ? 'even' : 'odd'} length,`
                + `but is ${costString.length}`
            );
        }
        let costStringIndex = costString.length % 2 === 0 ? 0 : 1;

        while (costStringIndex < costString.length) {
            let stringToConvert = costString.slice(costStringIndex, costStringIndex + 2);
            let movementCostType = convertStringToMovementCost(stringToConvert);
            newTiles.push(new HexGridTile(
                q_index,
                r_index,
                movementCostType
            ));

            r_index += 1;
            costStringIndex += 2;
        }
    });
    return newTiles;
}

export type HighlightTileDescription = {
    tiles: HexCoordinate[],
    pulseColor: PulseBlendColor,
    overlayImageResourceName?: string,
};

export class TerrainTileMap {
    tiles: HexGridTile[];
    outlineTileCoordinates: HexCoordinate | undefined;
    private _highlightedTiles: {
        [coordinateKey: string]: {
            pulseColor: PulseBlendColor,
            name: string
        }
    };
    resourceHandler: ResourceHandler;

    constructor(options: {
        tiles?: HexGridTile[];
        movementCost?: string[];
        resourceHandler?: ResourceHandler;
    }) {
        let tiles: HexGridTile[] = options.tiles;
        let movementCost: string[] = options.movementCost;

        if (tiles === undefined) {
            tiles = convertMovementCostToTiles(movementCost);
        }

        const tilesSortedByRThenQ = [...tiles].sort((a, b) => {
            if (a.q < b.q) {
                return -1;
            }
            if (a.q > b.q) {
                return 1;
            }

            if (a.r < b.r) {
                return -1;
            }
            if (a.r > b.r) {
                return 1;
            }
            return 0;
        })

        this.tiles = tilesSortedByRThenQ;
        this._highlightedTiles = {};

        this.resourceHandler = options.resourceHandler;
    }

    get highlightedTiles(): { [p: string]: { pulseColor: PulseBlendColor; name: string } } {
        return this._highlightedTiles;
    }

    mouseClicked(mouseX: number, mouseY: number, cameraX: number, cameraY: number) {
        const [worldX, worldY] = convertScreenCoordinatesToWorldCoordinates(mouseX, mouseY, cameraX, cameraY);
        const tileCoordinates = convertWorldCoordinatesToMapCoordinates(worldX, worldY);

        if (
            this.tiles.some((tile) => tile.q == tileCoordinates[0] && tile.r == tileCoordinates[1])
        ) {
            this.outlineTileCoordinates = new HexCoordinate({
                q: tileCoordinates[0],
                r: tileCoordinates[1],
            });
        } else {
            this.outlineTileCoordinates = undefined;
        }
    }

    highlightTiles(
        highlightTileDescriptions: HighlightTileDescription[]
    ): void {
        this._highlightedTiles = {};
        highlightTileDescriptions.reverse().forEach((tileDesc) => {
            tileDesc.tiles.forEach((tile) => {
                const key = `${tile.q},${tile.r}`;
                this._highlightedTiles[key] = {
                    pulseColor: tileDesc.pulseColor,
                    name: tileDesc.overlayImageResourceName
                };
            })
        });
    }

    stopHighlightingTiles(): void {
        this._highlightedTiles = {};
    }

    stopOutlineTiles(): void {
        this.outlineTileCoordinates = undefined;
    }

    private getTileAtLocation(hexCoordinate: HexCoordinate): HexGridTile | undefined {
        return this.tiles.find((tile) =>
            tile.q === hexCoordinate.q && tile.r === hexCoordinate.r
        );
    }

    getTileTerrainTypeAtLocation(hexCoordinate: HexCoordinate): HexGridMovementCost | undefined {
        const tile = this.getTileAtLocation(hexCoordinate);
        if (tile === undefined) {
            return undefined;
        }
        return tile.terrainType;
    }

    areCoordinatesOnMap(hexCoordinate: HexCoordinate): boolean {
        return this.getTileAtLocation(hexCoordinate) !== undefined;
    }

    getDimensions(): { widthOfWidestRow: number, numberOfRows: number } {
        let rowIndecies: { [row in number]: boolean } = {};
        this.tiles.forEach((tile) => {
            rowIndecies[tile.q] = true;
        });
        let numberOfRows: number = Object.keys(rowIndecies).length;

        let widthOfWidestRow: number = 0;
        this.tiles.forEach((tile) => {
            if (tile.r + 1 > widthOfWidestRow) {
                widthOfWidestRow = tile.r + 1;
            }
        });

        return {
            widthOfWidestRow,
            numberOfRows
        }
    }
}
