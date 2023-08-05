import {MouseButton} from "../utils/mouseConfig";
import p5 from "p5";
import {GameEngineComponentState} from "./gameEngine";

export interface GameEngineComponent {
    update(state: GameEngineComponentState, p: p5): void;

    keyPressed(state: GameEngineComponentState, keyCode: number): void;

    mouseClicked(state: GameEngineComponentState, mouseButton: MouseButton, mouseX: number, mouseY: number): void;

    mouseMoved(state: GameEngineComponentState, mouseX: number, mouseY: number): void;

    hasCompleted(state: GameEngineComponentState): boolean;

    reset(state: GameEngineComponentState): void;
}
