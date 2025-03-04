import p5 from "p5"
import { ScreenDimensions } from "./utils/graphics/graphicsConfig"
import { GameEngine } from "./gameEngine/gameEngine"
import { GetMouseButton, MouseButton } from "./utils/mouseConfig"
import { GameModeEnum } from "./utils/startupConfig"

let gameEngine: GameEngine
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
            startupMode:
                (process.env.STARTUP_MODE as GameModeEnum) ||
                GameModeEnum.TITLE_SCREEN,
        })
        gameEngine
            .setup({
                graphicsBuffer: frameBuffer,
                campaignId: process.env.CAMPAIGN_ID,
                p5Instance: p,
                version: process.env.VERSION,
            })
            .then(() => {})
    }

    p.draw = () => {
        gameEngine.draw().then(() => {
            p.image(frameBuffer, 0, 0)
        })
    }

    p.keyPressed = () => {
        gameEngine.keyPressed(p.keyCode)
        gameEngine.keyIsDown(p.keyCode)
    }

    p.keyReleased = () => {
        gameEngine.keyIsUp(p.keyCode)
    }

    p.mousePressed = () => {
        mousePressedTracker[p.mouseButton] = true
        let configuredMouseButton: MouseButton = GetMouseButton(p.mouseButton)
        gameEngine.mousePressed({
            button: configuredMouseButton,
            x: p.mouseX,
            y: p.mouseY,
        })
    }

    p.mouseReleased = () => {
        if (mousePressedTracker[p.mouseButton] !== true) {
            return
        }

        mousePressedTracker[p.mouseButton] = false
        let configuredMouseButton: MouseButton = GetMouseButton(p.mouseButton)
        gameEngine.mouseReleased({
            button: configuredMouseButton,
            x: p.mouseX,
            y: p.mouseY,
        })
    }

    p.mouseMoved = () => {
        gameEngine.mouseMoved({ x: p.mouseX, y: p.mouseY })
    }
}

export const myp5 = new p5(sketch, document.body)
