import {CutsceneActionPlayerType} from "./cutsceneAction";
import {ImageUI} from "../ui/imageUI";
import {RectAreaService} from "../ui/rectArea";
import {GraphicsBuffer} from "../utils/graphics/graphicsRenderer";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {SplashScreen} from "./splashScreen";
import {isValidValue} from "../utils/validityCheck";
import p5 from "p5";

export interface SplashScreenPlayerState {
    type: CutsceneActionPlayerType.SPLASH_SCREEN;
    splashScreen: SplashScreen;
    startTime: number;
    dialogFinished: boolean;
    screenImage: ImageUI;
}

export const SplashScreenPlayerService = {
    new: ({
              splashScreen,
              startTime,
              dialogFinished,
              screenImage,
          }: {
        splashScreen: SplashScreen;
        startTime?: number;
        dialogFinished?: boolean;
        screenImage?: ImageUI;
    }): SplashScreenPlayerState => {
        return {
            type: CutsceneActionPlayerType.SPLASH_SCREEN,
            splashScreen,
            startTime,
            dialogFinished: isValidValue(dialogFinished) ? dialogFinished : false,
            screenImage,
        }
    },
    setImageResource: (splashScreenPlayerState: SplashScreenPlayerState, image: p5.Image) => {
        setScreenImage(splashScreenPlayerState, image);
    },
    start: (splashScreenPlayerState: SplashScreenPlayerState): void => {
        splashScreenPlayerState.dialogFinished = false;
        splashScreenPlayerState.startTime = Date.now();
    },
    mouseClicked: (splashScreenPlayerState: SplashScreenPlayerState, mouseX: number, mouseY: number) => {
        if (isTimeExpired(splashScreenPlayerState) && isAnimating(splashScreenPlayerState)) {
            splashScreenPlayerState.dialogFinished = true;
        }
    },
    isFinished: (splashScreenPlayerState: SplashScreenPlayerState): boolean => {
        return !isAnimating(splashScreenPlayerState) || splashScreenPlayerState.dialogFinished;
    },
    draw: (splashScreenPlayerState: SplashScreenPlayerState, graphicsContext: GraphicsBuffer): void => {
        drawBackground(splashScreenPlayerState, graphicsContext);

        if (splashScreenPlayerState.screenImage) {
            splashScreenPlayerState.screenImage.draw(graphicsContext);
        }
    },
    isAnimating: (splashScreenPlayerState: SplashScreenPlayerState): boolean => {
        return isAnimating(splashScreenPlayerState);
    },
    keyPressed: (splashScreenPlayerState: SplashScreenPlayerState, keyCode: number) => {
        if (isTimeExpired(splashScreenPlayerState) && isAnimating(splashScreenPlayerState)) {
            splashScreenPlayerState.dialogFinished = true;
        }
    }
}

const isTimeExpired = (state: SplashScreenPlayerState): boolean => {
    if (!isValidValue(state)) {
        return true;
    }
    return Date.now() >= state.startTime + state.splashScreen.animationDuration
};

const isAnimating = (state: SplashScreenPlayerState): boolean => {
    return !state.dialogFinished;
};

const setScreenImage = (state: SplashScreenPlayerState, splashImage: p5.Image) => {
    state.screenImage = new ImageUI({
        graphic: splashImage,
        area: RectAreaService.new({
            left: (ScreenDimensions.SCREEN_WIDTH - splashImage.width) / 2,
            top: (ScreenDimensions.SCREEN_HEIGHT - splashImage.height) / 2,
            width: splashImage.width,
            height: splashImage.height,
        })
    });
}

const drawBackground = (state: SplashScreenPlayerState, graphicsContext: GraphicsBuffer) => {
    if (isValidValue(state.splashScreen.backgroundColor)) {
        graphicsContext.push();
        graphicsContext.fill(state.splashScreen.backgroundColor[0], state.splashScreen.backgroundColor[1], state.splashScreen.backgroundColor[2],);
        graphicsContext.rect(0, 0, ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT);
        graphicsContext.pop();
    }
};
