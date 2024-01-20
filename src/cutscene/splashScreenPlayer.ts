import {ResourceLocator, ResourceType} from "../resource/resourceHandler";
import {CutsceneAction, CutsceneActionPlayerType} from "./cutsceneAction";
import {ImageUI} from "../ui/imageUI";
import {RectAreaService} from "../ui/rectArea";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {TextSubstitutionContext} from "../textSubstitution/textSubstitution";
import {SplashScreen, SplashScreenService} from "./splashScreen";
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
    getId: (state: SplashScreenPlayerState): string => {
        return state.splashScreen.id;
    },
    getResourceLocators: (state: SplashScreenPlayerState): ResourceLocator[] => {
        // TODO return undefined if there is no splash screen object
        return [
            {
                type: ResourceType.IMAGE,
                key: state.splashScreen.screenImageResourceKey
            }
        ]
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
    // TODO return true if there is no splash screen object
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

// TODO extract information into an interface
// TODO class is built using the interface
export class TODODeleteMeSplashScreenPlayer implements CutsceneAction {
    splashScreen: SplashScreen;
    startTime: number;
    dialogFinished: boolean;
    screenImage: ImageUI;

    // TODO pass in a SplashScreen object instead
    constructor({
                    id,
                    animationDuration,
                    screenImageResourceKey,
                }: {
        id: string;
        animationDuration?: number;
        screenImageResourceKey?: string;
    }) {
        this.splashScreen = SplashScreenService.new({
            id,
            screenImageResourceKey,
            animationDuration
        });

        this.dialogFinished = false;
    }

    getId(): string {
        return this.splashScreen.id;
    }

    getResourceLocators(): ResourceLocator[] {
        // TODO return undefined if there is no splash screen object
        return [
            {
                type: ResourceType.IMAGE,
                key: this.splashScreen.screenImageResourceKey
            }
        ]
    }

    setImageResource(image: GraphicImage) {
        this.setScreenImage(image);
    }

    setScreenImage(splashImage: GraphicImage) {
        this.screenImage = new ImageUI({
            graphic: splashImage,
            area: RectAreaService.new({
                left: (ScreenDimensions.SCREEN_WIDTH - splashImage.width) / 2,
                top: (ScreenDimensions.SCREEN_HEIGHT - splashImage.height) / 2,
                width: splashImage.width,
                height: splashImage.height,
            })
        });
    }

    start(context: TextSubstitutionContext): void {
        this.dialogFinished = false;
        this.startTime = Date.now();
    }

    isTimeExpired(): boolean {
        // TODO return true if there is no splash screen object
        return Date.now() >= this.startTime + this.splashScreen.animationDuration
    }

    mouseClicked(mouseX: number, mouseY: number) {
        if (this.isTimeExpired() && this.isAnimating()) {
            this.dialogFinished = true;
        }
    }

    isAnimating(): boolean {
        return !this.dialogFinished;
    }

    isFinished(): boolean {
        return !this.isAnimating() || this.dialogFinished;
    }

    draw(graphicsContext: GraphicsContext): void {
        if (this.screenImage) {
            this.screenImage.draw(graphicsContext);
        }
    }
}
