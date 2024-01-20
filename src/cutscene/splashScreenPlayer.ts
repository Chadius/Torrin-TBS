import {CutsceneActionPlayerType} from "./cutsceneAction";
import {ImageUI} from "../ui/imageUI";
import {RectAreaService} from "../ui/rectArea";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {TextSubstitutionContext} from "../textSubstitution/textSubstitution";
import {SplashScreen} from "./splashScreen";
import {isValidValue} from "../utils/validityCheck";

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
    setImageResource: (state: SplashScreenPlayerState, image: GraphicImage) => {
        setScreenImage(state, image);
    },
    start: (state: SplashScreenPlayerState, context: TextSubstitutionContext): void => {
        state.dialogFinished = false;
        state.startTime = Date.now();
    },
    mouseClicked: (state: SplashScreenPlayerState, mouseX: number, mouseY: number) => {
        if (isTimeExpired(state) && isAnimating(state)) {
            state.dialogFinished = true;
        }
    },
    isFinished: (state: SplashScreenPlayerState): boolean => {
        return !isAnimating(state) || state.dialogFinished;
    },
    draw: (state: SplashScreenPlayerState, graphicsContext: GraphicsContext): void => {
        if (state.screenImage) {
            state.screenImage.draw(graphicsContext);
        }
    },
    isAnimating: (state: SplashScreenPlayerState): boolean => {
        return isAnimating(state);
    },
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

const setScreenImage = (state: SplashScreenPlayerState, splashImage: GraphicImage) => {
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
