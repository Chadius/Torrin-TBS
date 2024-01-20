import {ResourceLocator, ResourceType} from "../resource/resourceHandler";
import {CutsceneAction} from "./cutsceneAction";
import {ImageUI} from "../ui/imageUI";
import {RectAreaService} from "../ui/rectArea";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {TextSubstitutionContext} from "../textSubstitution/textSubstitution";
import {SplashScreen, SplashScreenService} from "./splashScreen";
import {isValidValue} from "../utils/validityCheck";

// TODO extract information into an interface
// TODO class is built using the interface
export class SplashScreenPlayer implements CutsceneAction {
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
