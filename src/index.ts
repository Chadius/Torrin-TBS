import * as p5 from 'p5';
import {BattleScene, PositiveNumber} from './battleScene'

let battleScene: BattleScene;

export const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(1280, 720);
    battleScene = new BattleScene( 1280 as PositiveNumber, 720 as PositiveNumber);
  }

  p.draw = () => {
    battleScene.draw(p);
  }
}

export const myp5 = new p5(sketch, document.body);
