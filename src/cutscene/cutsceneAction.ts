import {ResourceLocator} from "../resource/resourceHandler";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {TextSubstitutionContext} from "../textSubstitution/textSubstitution";

export enum CutsceneActionPlayerType {
    SPLASH_SCREEN = "SPLASH_SCREEN",
    DIALOGUE = "DIALOGUE",
}

// TODO get rid of this
export interface CutsceneAction {
    getId(): string;

    getResourceLocators(): ResourceLocator[];

    setImageResource(image: GraphicImage): void;

    draw(graphicsContext: GraphicsContext): void;

    start(context: TextSubstitutionContext): void;

    mouseClicked(mouseX: number, mouseY: number): void;

    isTimeExpired(): boolean;

    isAnimating(): boolean;

    isFinished(): boolean;
}
