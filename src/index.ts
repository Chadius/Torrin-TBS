import p5 from "p5"
import { ScreenDimensions } from "./utils/graphics/graphicsConfig"
import { GameEngine } from "./gameEngine/gameEngine"
import { TMouseButton, MouseConfigService } from "./utils/mouseConfig"
import { GameModeEnum, TGameMode } from "./utils/startupConfig"

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
                (process.env.STARTUP_MODE as TGameMode) ||
                GameModeEnum.TITLE_SCREEN,
        })
        if (process.env.CAMPAIGN_ID == undefined) {
            console.error("CAMPAIGN_ID not set")
        }
        if (process.env.VERSION == undefined) {
            console.error("VERSION not set")
        }
        gameEngine
            .setup({
                graphicsBuffer: frameBuffer,
                campaignId: process.env.CAMPAIGN_ID ?? "CAMPAIGN_ID not set",
                p5Instance: p,
                version: process.env.VERSION ?? "VERSION not set",
            })
            .then(() => {})
    }

    p.draw = () => {
        gameEngine.draw().then(() => {
            p.image(frameBuffer, 0, 0)
        })
    }

    p.keyPressed = () => {
        gameEngine?.keyPressed(p.keyCode)
        gameEngine?.keyIsDown(p.keyCode)
    }

    p.keyReleased = () => {
        gameEngine?.keyIsUp(p.keyCode)
    }

    p.mousePressed = () => {
        mousePressedTracker[p.mouseButton] = true
        let configuredMouseButton: TMouseButton =
            MouseConfigService.getMouseButton(p.mouseButton)
        gameEngine?.mousePressed({
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
        let configuredMouseButton: TMouseButton =
            MouseConfigService.getMouseButton(p.mouseButton)
        gameEngine?.mouseReleased({
            button: configuredMouseButton,
            x: p.mouseX,
            y: p.mouseY,
        })
    }

    p.mouseMoved = () => {
        gameEngine?.mouseMoved({ x: p.mouseX, y: p.mouseY })
    }

    p.mouseWheel = (event: WheelEvent) => {
        gameEngine?.mouseWheel(event)
        return false
    }

    p.mouseDragged = (event: DragEvent) => {
        const mouseDrag =
            MouseConfigService.convertBrowserMouseEventToMouseDrag(event)
        gameEngine?.mouseDragged(mouseDrag)
        return false
    }
}

export const _ = new p5(sketch, document.body)
