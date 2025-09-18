import {
    CutsceneActionPlayerType,
    TCutsceneActionPlayerType,
} from "./cutsceneAction"
import { RectArea, RectAreaService } from "../ui/rectArea"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { SplashScreen } from "./splashScreen"
import { isValidValue } from "../utils/objectValidityCheck"
import p5 from "p5"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { ImageUI, ImageUILoadingBehavior } from "../ui/imageUI/imageUI"
import { ResourceHandler } from "../resource/resourceHandler"
import { OrchestratorComponentKeyEvent } from "../battle/orchestrator/battleOrchestratorComponent"
import { PlayerInputState } from "../ui/playerInput/playerInputState"

export interface SplashScreenPlayerState {
    type: TCutsceneActionPlayerType
    splashScreen: SplashScreen
    startTime: number | undefined
    dialogFinished: boolean
    screenImage: ImageUI | undefined
}

export const SplashScreenPlayerService = {
    new: ({
        splashScreen,
        startTime,
        dialogFinished,
        screenImage,
    }: {
        splashScreen: SplashScreen
        startTime?: number
        dialogFinished?: boolean
        screenImage?: ImageUI
    }): SplashScreenPlayerState => {
        return {
            type: CutsceneActionPlayerType.SPLASH_SCREEN,
            splashScreen,
            startTime,
            dialogFinished: dialogFinished ?? false,
            screenImage,
        }
    },
    setImageResource: (
        splashScreenPlayerState: SplashScreenPlayerState,
        image: p5.Image
    ) => {
        setScreenImage(splashScreenPlayerState, image)
    },
    start: (splashScreenPlayerState: SplashScreenPlayerState): void => {
        splashScreenPlayerState.dialogFinished = false
        splashScreenPlayerState.startTime = Date.now()
    },
    mouseClicked: (splashScreenPlayerState: SplashScreenPlayerState) => {
        if (
            isTimeExpired(splashScreenPlayerState) &&
            isAnimating(splashScreenPlayerState)
        ) {
            splashScreenPlayerState.dialogFinished = true
        }
    },
    isFinished: (splashScreenPlayerState: SplashScreenPlayerState): boolean => {
        return (
            !isAnimating(splashScreenPlayerState) ||
            splashScreenPlayerState.dialogFinished
        )
    },
    draw: (
        splashScreenPlayerState: SplashScreenPlayerState,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ): void => {
        drawBackground(splashScreenPlayerState, graphicsContext)

        if (splashScreenPlayerState.screenImage) {
            splashScreenPlayerState.screenImage.draw({
                resourceHandler,
                graphicsContext,
            })
        }
    },
    isAnimating: (
        splashScreenPlayerState: SplashScreenPlayerState
    ): boolean => {
        return isAnimating(splashScreenPlayerState)
    },
    keyPressed: ({
        splashScreenPlayerState,
    }: {
        splashScreenPlayerState: SplashScreenPlayerState
        event: OrchestratorComponentKeyEvent
        playerInputState: PlayerInputState
    }) => {
        if (
            isTimeExpired(splashScreenPlayerState) &&
            isAnimating(splashScreenPlayerState)
        ) {
            splashScreenPlayerState.dialogFinished = true
        }
    },
}

const isTimeExpired = (state: SplashScreenPlayerState): boolean => {
    if (!isValidValue(state)) {
        return true
    }
    if (state.startTime == undefined) return false
    if (state.splashScreen.animationDuration == undefined) return false
    return Date.now() >= state.startTime + state.splashScreen.animationDuration
}

const isAnimating = (state: SplashScreenPlayerState): boolean => {
    return !state.dialogFinished
}

const setScreenImage = (
    state: SplashScreenPlayerState,
    splashImage: p5.Image
) => {
    state.screenImage = new ImageUI({
        imageLoadingBehavior: {
            loadingBehavior: ImageUILoadingBehavior.USE_CUSTOM_AREA_CALLBACK,
            resourceKey: undefined,
            customAreaCallback: ({
                imageSize,
            }: {
                imageSize: { width: number; height: number }
                originalArea: RectArea
            }): RectArea => {
                return RectAreaService.new({
                    left: (ScreenDimensions.SCREEN_WIDTH - imageSize.width) / 2,
                    top:
                        (ScreenDimensions.SCREEN_HEIGHT - imageSize.height) / 2,
                    width: imageSize.width,
                    height: imageSize.height,
                })
            },
        },
        graphic: splashImage,
        area: RectAreaService.new({
            left: 0,
            top: 0,
            width: 0,
            height: 0,
        }),
    })
}

const drawBackground = (
    state: SplashScreenPlayerState,
    graphicsContext: GraphicsBuffer
) => {
    if (state.splashScreen.backgroundColor != undefined) {
        graphicsContext.push()
        graphicsContext.fill(
            state.splashScreen.backgroundColor[0],
            state.splashScreen.backgroundColor[1],
            state.splashScreen.backgroundColor[2]
        )
        graphicsContext.rect(
            0,
            0,
            ScreenDimensions.SCREEN_WIDTH,
            ScreenDimensions.SCREEN_HEIGHT
        )
        graphicsContext.pop()
    }
}
