import * as p5 from "p5";
import {HexCoordinate, HexGridTile, Integer} from "./hexGrid";
import {HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "./graphicsConstants";
import {BlendColor, calculatePulseValueOverTime, drawHexShape} from "./hexDrawingUtils";

export class HexMap {
  tiles: HexGridTile[];
  outlineTileCoordinates: HexCoordinate | undefined;
  highlightedColoredTiles: HexCoordinate[];
  highlightedColor: {
    hue: number,
    saturation: number,
    brightness: number,
    lowAlpha: number,
    highAlpha: number,
    periodAlpha: number,
  }

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

  draw(p: p5)  {
    const currentHighlightedColor: BlendColor = [
      this.highlightedColor.hue,
      this.highlightedColor.saturation,
      this.highlightedColor.brightness,
      calculatePulseValueOverTime(
        this.highlightedColor.lowAlpha,
        this.highlightedColor.highAlpha,
        this.highlightedColor.periodAlpha,
      )
    ]

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
    const tileCoordinates = this.convertWorldCoordinatesToMapCoordinates(worldX, worldY);

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

  convertWorldCoordinatesToMapCoordinates(worldX: number, worldY: number): [number, number] {
    const xScaled = worldX / HEX_TILE_WIDTH;
    const yScaled = worldY / HEX_TILE_WIDTH;

    // q = 2 * yScaled / sqrt(3)
    const q = yScaled * 1.154;

    // r = x - (y / sqrt(3))
    const r = xScaled - (yScaled / 1.732);

    return [Math.round(q), Math.round(r)];
  }

  drawOutlinedTile(p: p5) {
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
  ) {
    this.highlightedColoredTiles = [...highlightedTiles];
    this.highlightedColor = color;
  }

  stopHighlightingTiles() {
    this.highlightedColoredTiles = [];
  }
}
