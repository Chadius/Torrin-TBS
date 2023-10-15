import {ResourceLocator} from "../resource/resourceHandler";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {TextSubstitutionContext} from "../textSubstitution/textSubstitution";

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
