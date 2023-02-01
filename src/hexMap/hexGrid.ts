import * as p5 from "p5";
import {BlendColor, hexGridColorByTerrainType, drawHexShape} from "./hexDrawingUtils";
import {HexGridMovementCost} from "./hexGridMovementCost";
import {ResourceHandler} from "../resource/resourceHandler";
import {convertMapCoordinatesToWorldCoordinates} from "./convertCoordinates";
import {HEX_TILE_RADIUS, HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";

export type Integer = number & {_brand: 'Integer'}
export type HexCoordinate = {q: Integer, r: Integer}

export class HexGridTile {
  q: Integer;
  r: Integer;
  terrainType: HexGridMovementCost;

  constructor(qcoord: Integer, rcoord: Integer, appearance: HexGridMovementCost) {
    this.r = rcoord;
    this.q = qcoord;
    this.terrainType = appearance;
  }

  // TODO: use parameterized options
  draw(
    p: p5,
    blendColor?: BlendColor,
    resourceHandler?: ResourceHandler,
    overlayImageResourceKey?: string
  ): void  {
    // blendColor is an optional fill/blend color, an array of 4 numbers:
    // - Hue (0-360)
    // - Saturation (0-100)
    // - Brightness (0-100)
    // - Blending factor (0 = no blending, 100 = override original color)

    p.push();

    const appearanceFillColor = hexGridColorByTerrainType[this.terrainType];
    let fillColor;

    if (blendColor) {
      const appearanceColorWeight = 100 - blendColor[3];

      fillColor = [
        ((appearanceFillColor[0] * appearanceColorWeight) + (blendColor[0] * blendColor[3])) / 100,
        ((appearanceFillColor[1] * appearanceColorWeight) + (blendColor[1] * blendColor[3])) / 100,
        ((appearanceFillColor[2] * appearanceColorWeight) + (blendColor[2] * blendColor[3])) / 100,
      ]
    } else {
      fillColor = appearanceFillColor;
    }

    const strokeColor = [
      fillColor[0],
      10,
      10
    ];

    p.stroke(strokeColor);
    p.strokeWeight(1);
    p.fill(fillColor)

    // See Axial Coordinates in:
    // https://www.redblobgames.com/grids/hexagons/
    // r applies the vector (1, 0)
    // q applies the vector (1/2, sqrt(3)/2)
    let xPos = this.r + this.q*0.5
    let yPos = this.q * 0.866

    drawHexShape(p, xPos, yPos);

    if (resourceHandler) {
      const imageOrError: p5.Image | Error = resourceHandler.getResource(overlayImageResourceKey);

      if (imageOrError instanceof p5.Image) {
        p.pop();

        let [xPos, yPos] = convertMapCoordinatesToWorldCoordinates(this.q, this.r);
        xPos += SCREEN_WIDTH / 2;
        yPos += SCREEN_HEIGHT / 2;
        p.push();
        p.translate(xPos, yPos);

        p.image(
          imageOrError,
          - imageOrError.width / 2,
          - imageOrError.height / 2,
        );

        p.pop();
      }
    }
    p.pop();
  }
}
