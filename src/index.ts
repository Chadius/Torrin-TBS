import p5 from "p5"
import { ScreenDimensions } from "./utils/graphics/graphicsConfig"
import { GameEngine } from "./gameEngine/gameEngine"
import { StartupMode } from "./utils/startupConfig"
import { GetMouseButton, MouseButton } from "./utils/mouseConfig"

let gameEngine: GameEngine
const CAMPAIGN_ID: string = "templeDefense"
const mousePressedTracker: { [buttonName in string]: boolean } = {}

let canvas: p5.Renderer
let frameBuffer: p5.Graphics

export const sketch = (p: p5) => {
    p.setup = () => {
        p.colorMode("hsb", 360, 100, 100, 255)
        canvas = p.createCanvas(
            ScreenDimensions.SCREEN_WIDTH,
            ScreenDimensions.SCREEN_HEIGHT
        )
        frameBuffer = p.createGraphics(
            ScreenDimensions.SCREEN_WIDTH,
            ScreenDimensions.SCREEN_HEIGHT
        )
        frameBuffer.colorMode("hsb", 360, 100, 100, 255)
        p.frameRate(60)
        canvas.elt.addEventListener(
            "contextmenu",
            (e: { preventDefault: () => any }) => e.preventDefault()
        )
        gameEngine = new GameEngine({
            graphicsBuffer: frameBuffer,
            startupMode: StartupMode,
        })
        gameEngine
            .setup({
                graphicsBuffer: frameBuffer,
                campaignId: CAMPAIGN_ID,
                p5Instance: p,
            })
            .then(() => {})
    }

    p.draw = () => {
        gameEngine.draw().then((r) => {
            p.image(frameBuffer, 0, 0)
        })
    }

    p.keyPressed = () => {
        gameEngine.keyPressed(p.keyCode)
    }

    p.mousePressed = () => {
        mousePressedTracker[p.mouseButton] = true
    }

    p.mouseReleased = () => {
        if (mousePressedTracker[p.mouseButton] !== true) {
            return
        }

        mousePressedTracker[p.mouseButton] = false
        let configuredMouseButton: MouseButton = GetMouseButton(p.mouseButton)
        gameEngine.mouseClicked(configuredMouseButton, p.mouseX, p.mouseY)
    }

    p.mouseMoved = () => {
        gameEngine.mouseMoved(p.mouseX, p.mouseY)
    }
}

export const myp5 = new p5(sketch, document.body)
