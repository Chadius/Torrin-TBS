import p5 from "p5";
import {TitleScreenState} from "./titleScreenState";
import {GameEngineComponent} from "../gameEngine/gameEngineComponent";
import {MouseButton} from "../utils/mouseConfig";

export class TitleScreen implements GameEngineComponent {
    constructor() {
    }

    update(state: TitleScreenState, p: p5): void {
        throw new Error("Method not implemented.");
    }

    keyPressed(state: TitleScreenState, keyCode: number): void {
        throw new Error("Method not implemented.");
    }

    mouseClicked(state: TitleScreenState, mouseButton: MouseButton, mouseX: number, mouseY: number): void {
        throw new Error("Method not implemented.");
    }

    mouseMoved(state: TitleScreenState, mouseX: number, mouseY: number): void {
        throw new Error("Method not implemented.");
    }

    hasCompleted(state: TitleScreenState): boolean {
        throw new Error("Method not implemented.");
    }

    reset(state: TitleScreenState): void {
        throw new Error("Method not implemented.");
    }

    setup({graphicsContext}: { graphicsContext: p5 }): TitleScreenState {
        return new TitleScreenState({});
    }
}
