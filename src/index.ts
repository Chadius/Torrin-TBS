import p5 from 'p5';
import {ScreenDimensions} from "./utils/graphics/graphicsConfig";
import {GameEngine} from "./gameEngine/gameEngine";
import {StartupMode} from "./utils/startupConfig";
import {P5GraphicsContext} from "./utils/graphics/P5GraphicsContext";
import {GetMouseButton, MouseButton} from "./utils/mouseConfig";

let gameEngine: GameEngine;
const CAMPAIGN_ID: string = "templeDefense";
const mousePressedTracker: { [buttonName in string]: boolean } = {};

export const sketch = (p: p5) => {
    p.setup = () => {
        const canvas: p5.Renderer = p.createCanvas(ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT);
        p.colorMode("hsb", 360, 100, 100, 255)
        p.frameRate(60)
        canvas.elt.addEventListener("contextmenu", (e: { preventDefault: () => any; }) => e.preventDefault())

        const p5GraphicsContext = new P5GraphicsContext({p});
        gameEngine = new GameEngine({graphicsContext: p5GraphicsContext, startupMode: StartupMode});
        gameEngine.setup({graphicsContext: p5GraphicsContext, campaignId: CAMPAIGN_ID}).then(() => {})
    }

    p.draw = () => {
        gameEngine.draw().then(r => {})
    }

    p.keyPressed = () => {
        gameEngine.keyPressed(p.keyCode);
    }

    p.mousePressed = () => {
        mousePressedTracker[p.mouseButton] = true;
    }

    p.mouseReleased = () => {
        if (mousePressedTracker[p.mouseButton] !== true) {
            return;
        }

        mousePressedTracker[p.mouseButton] = false;
        let configuredMouseButton: MouseButton = GetMouseButton(p.mouseButton);
        gameEngine.mouseClicked(configuredMouseButton, p.mouseX, p.mouseY);
    }

    p.mouseMoved = () => {
        gameEngine.mouseMoved(p.mouseX, p.mouseY);
    }
}

export const myp5 = new p5(sketch, document.body);
