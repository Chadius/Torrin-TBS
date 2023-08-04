import p5 from 'p5';
import {ScreenDimensions} from "./utils/graphicsConfig";
import {GameEngine} from "./gameEngine/gameEngine";

let gameEngine: GameEngine;

export const sketch = (p: p5) => {
    p.setup = () => {
        p.createCanvas(ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT);

        gameEngine = new GameEngine({graphicsContext: p});
        gameEngine.setup();
    }

    p.draw = () => {
        gameEngine.draw();
    }

    p.keyPressed = () => {
        gameEngine.keyPressed(p.keyCode);
    }

    p.mouseClicked = () => {
        gameEngine.mouseClicked(p.mouseButton, p.mouseX, p.mouseY);
    }

    p.mouseMoved = () => {
        gameEngine.mouseMoved(p.mouseX, p.mouseY);
    }
}

export const myp5 = new p5(sketch, document.body);
