import {ResourceLocator} from "../resource/resourceHandler";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";

export interface CutsceneAction {
    getId(): string;

    getResourceLocators(): ResourceLocator[];

    setImageResource(image: GraphicImage): void;

    draw(graphicsContext: GraphicsContext): void;

    start(): void;

    mouseClicked(mouseX: number, mouseY: number): void;

    isTimeExpired(): boolean;

    isAnimating(): boolean;

    isFinished(): boolean;
}
