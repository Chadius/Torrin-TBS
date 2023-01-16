import * as p5 from "p5";
import {HexCoordinate, HexGridTile, Integer} from "./hexGrid";
import {SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {
  BlendColor,
  calculatePulseValueOverTime,
  drawHexShape,
  PulseBlendColor,
  pulseBlendColorToBlendColor
} from "./hexDrawingUtils";
import {HexGridTerrainTypes} from "./hexGridTerrainType";
import {convertWorldCoordinatesToMapCoordinates} from "./convertCoordinates";

export class HexMap {
  tiles: HexGridTile[];
  outlineTileCoordinates: HexCoordinate | undefined;
  highlightedColoredTiles: HexCoordinate[];
  highlightedColor: PulseBlendColor;

  constructor(tiles: HexGridTile[]) {
    const tileCoords = tiles.map((tile, index) => {
      return {
        i: index,
        value: tile.q * 100 + tile.r
      }}
    );

    tileCoords.sort((a, b) => {
      if (a.value < b.value) {
        return -1;
      }
      if (a.value > b.value) {
        return 1;
      }
      return 0;
    })

    this.tiles = tileCoords.map((v) => tiles[v.i])
    this.outlineTileCoordinates = {
      q: tiles[0].q as Integer,
      r: tiles[0].r as Integer
    }
    this.highlightedColoredTiles = [];
  }

  draw(p: p5): void {
    const currentHighlightedColor: BlendColor = pulseBlendColorToBlendColor(this.highlightedColor);

    this.tiles.forEach(
      (tile) => {
        if (
          this.highlightedColoredTiles.some((sameTile) => sameTile.q == tile.q && sameTile.r == tile.r)
        ) {
          tile.draw(p, currentHighlightedColor);
        } else {
          tile.draw(p)
        }
      }
    );
    this.drawOutlinedTile(p);
  }

  mouseClicked(mouseX: number, mouseY: number) {
    const worldX = mouseX - SCREEN_WIDTH / 2;
    const worldY = mouseY - SCREEN_HEIGHT / 2;
    const tileCoordinates = convertWorldCoordinatesToMapCoordinates(worldX, worldY);

    if (
      this.tiles.some((tile) => tile.q == tileCoordinates[0] && tile.r == tileCoordinates[1])
    ) {
      this.outlineTileCoordinates = {
        q: tileCoordinates[0] as Integer,
        r: tileCoordinates[1] as Integer,
      }
    } else {
      this.outlineTileCoordinates = undefined;
    }
  }

  drawOutlinedTile(p: p5): void {
    if (this.outlineTileCoordinates === undefined) {
      return;
    }

    p.push();

    const strokeColor = [
      0,
      10,
      calculatePulseValueOverTime(50, 100, 2000)
    ];

    p.stroke(strokeColor);
    p.strokeWeight(2);
    p.noFill();

    let xPos = this.outlineTileCoordinates.r + this.outlineTileCoordinates.q * 0.5
    let yPos = this.outlineTileCoordinates.q * 0.866
    drawHexShape(p, xPos, yPos);
    p.pop();
  }

  highlightTiles(
    highlightedTiles: HexCoordinate[],
    color: {
      hue: number,
      saturation: number,
      brightness: number,
      lowAlpha: number,
      highAlpha: number,
      periodAlpha: number,
    }
  ): void {
    this.highlightedColoredTiles = [...highlightedTiles];
    this.highlightedColor = color;
  }

  stopHighlightingTiles(): void {
    this.highlightedColoredTiles = [];
  }

  private getTileAtLocation(hexCoordinate: HexCoordinate): HexGridTile | undefined {
    return this.tiles.find((tile) =>
      tile.q === hexCoordinate.q && tile.r === hexCoordinate.r
    );
  }

  getTileTerrainTypeAtLocation(hexCoordinate: HexCoordinate): HexGridTerrainTypes | undefined {
    const tile = this.getTileAtLocation(hexCoordinate);
    if (tile === undefined) {
      return undefined;
    }
    return tile.terrainType;
  }

  areCoordinatesOnMap(hexCoordinate: HexCoordinate): boolean {
    return this.getTileAtLocation(hexCoordinate) !== undefined;
  }
}
