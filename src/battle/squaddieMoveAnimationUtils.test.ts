import {TileFoundDescription} from "../hexMap/pathfinder/pathfinder";
import {lerpSquaddieBetweenPath} from "./squaddieMoveAnimationUtils";
import {Integer} from "../hexMap/hexGrid";
import {HEX_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";

describe('lerpSquaddieBetweenPath', () => {
  it('lerp between two points on a map', () => {
    const movementPathInfo: TileFoundDescription[] = [
      {
        q: 0 as Integer,
        r: 0 as Integer,
        numberOfActions: 0 as Integer,
      },
      {
        q: 0 as Integer,
        r: 1 as Integer,
        numberOfActions: 1 as Integer,
      }
    ]

    const startLocation = lerpSquaddieBetweenPath(
      movementPathInfo,
      0,
      1000,
      0,
      0,
    )
    expect(startLocation).toStrictEqual([SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2]);

    const midLocation = lerpSquaddieBetweenPath(
      movementPathInfo,
      500,
      1000,
      0,
      0,
    )
    expect(midLocation).toStrictEqual([SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2, SCREEN_HEIGHT / 2]);

    const endLocation = lerpSquaddieBetweenPath(
      movementPathInfo,
      1000,
      1000,
      0,
      0,
    )
    expect(endLocation).toStrictEqual([SCREEN_WIDTH / 2 + HEX_TILE_WIDTH, SCREEN_HEIGHT / 2]);
  })
})
