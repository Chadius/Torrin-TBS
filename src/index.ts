import p5 from 'p5';
import {BattleScene} from './battle/battleScene'
import {SCREEN_HEIGHT, SCREEN_WIDTH} from "./graphicsConstants";
import {ResourceHandler, ResourceType} from "./resource/resourceHandler";
import {PositiveNumber} from "./utils/math";

let battleScene: BattleScene;

export const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    battleScene = new BattleScene({
      p: p,
      width: SCREEN_WIDTH as PositiveNumber,
      height: SCREEN_HEIGHT as PositiveNumber,
      resourceHandler: new ResourceHandler({
          p: p,
          allResources: [
            {
              type: ResourceType.IMAGE,
              path: "assets/testPortrait0001.png",
              key: "crazy pete face",
            },
            {
              type: ResourceType.IMAGE,
              path: "assets/map-icon-young-torrin.png",
              key: "map icon young torrin",
            }
          ]
        })
    });
  }

  p.draw = () => {
    battleScene.draw(p);
  }

  p.mouseClicked = () => {
    battleScene.mouseClicked(p.mouseX, p.mouseY);
  }

  p.mouseMoved = () => {
    battleScene.mouseMoved(p.mouseX, p.mouseY);
  }
}

export const myp5 = new p5(sketch, document.body);
