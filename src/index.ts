import * as p5 from 'p5';
import {BattleScene, PositiveNumber} from './battleScene'

let battleScene: BattleScene;

export const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(1024, 576);
    battleScene = new BattleScene( 1024 as PositiveNumber, 576 as PositiveNumber);
  }

  p.draw = () => {
    battleScene.draw(p);
  }
}

export const myp5 = new p5(sketch, document.body);
