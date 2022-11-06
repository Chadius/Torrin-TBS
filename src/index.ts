import * as p5 from 'p5';
import {BattleScene, PositiveNumber} from './battle/battleScene'
import {SCREEN_HEIGHT, SCREEN_WIDTH} from "./graphicsConstants";

let battleScene: BattleScene;

export const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    battleScene = new BattleScene( SCREEN_WIDTH as PositiveNumber, SCREEN_HEIGHT as PositiveNumber);
  }

  p.draw = () => {
    battleScene.draw(p);
  }

  p.mouseClicked = () => {
    battleScene.mouseClicked(p.mouseX, p.mouseY);
  }
}

export const myp5 = new p5(sketch, document.body);
