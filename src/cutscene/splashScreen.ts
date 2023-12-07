import {ResourceLocator, ResourceType} from "../resource/resourceHandler";
import {CutsceneAction} from "./cutsceneAction";
import {ImageUI} from "../ui/imageUI";
import {RectAreaHelper} from "../ui/rectArea";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {TextSubstitutionContext} from "../textSubstitution/textSubstitution";

export class SplashScreen implements CutsceneAction {
    id: string;
    startTime: number;
    dialogFinished: boolean;
    animationDuration: number;
    screenImageResourceKey: string;
    screenImage: ImageUI;

    constructor({
                    id,
                    animationDuration,
                    screenImageResourceKey,
                }: {
        id: string;
        animationDuration?: number;
        screenImageResourceKey?: string;
    }) {
        this.id = id;
        this.screenImageResourceKey = screenImageResourceKey;
        this.animationDuration = animationDuration || 0;
        this.dialogFinished = false;
    }

    getId(): string {
        return this.id;
    }

    getResourceLocators(): ResourceLocator[] {
        return [
            {
                type: ResourceType.IMAGE,
                key: this.screenImageResourceKey
            }
        ]
    }

    setImageResource(image: GraphicImage) {
        this.setScreenImage(image);
    }

    setScreenImage(splashImage: GraphicImage) {
        this.screenImage = new ImageUI({
            graphic: splashImage,
            area: RectAreaHelper.new({
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
        return Date.now() >= this.startTime + this.animationDuration
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
