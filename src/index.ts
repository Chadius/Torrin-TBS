import p5 from 'p5';
import {ScreenDimensions} from "./utils/graphics/graphicsConfig";
import {GameEngine} from "./gameEngine/gameEngine";
import {StartupMode} from "./utils/startupConfig";
import {P5GraphicsContext} from "./utils/graphics/P5GraphicsContext";

let gameEngine: GameEngine;
const CAMPAIGN_ID: string = "templeDefense";

export const sketch = (p: p5) => {
    p.setup = async () => {
        p.createCanvas(ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT);
        p.colorMode("hsb", 360, 100, 100, 255)

        const p5GraphicsContext = new P5GraphicsContext({p});
        gameEngine = new GameEngine({graphicsContext: p5GraphicsContext, startupMode: StartupMode});
        await gameEngine.setup({graphicsContext: p5GraphicsContext, campaignId: CAMPAIGN_ID});
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
