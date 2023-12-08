import {MouseButton} from "../utils/mouseConfig";
import {GameEngineState} from "./gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {GraphicsContext} from "../utils/graphics/graphicsContext";

export type GameEngineChanges = {
    nextMode?: GameModeEnum;
}

export interface GameEngineComponent {
    update(state: GameEngineState, graphicsContext: GraphicsContext): void;

    keyPressed(state: GameEngineState, keyCode: number): void;

    mouseClicked(state: GameEngineState, mouseButton: MouseButton, mouseX: number, mouseY: number): void;

    mouseMoved(state: GameEngineState, mouseX: number, mouseY: number): void;

    hasCompleted(state: GameEngineState): boolean;

    recommendStateChanges(state: GameEngineState): GameEngineChanges | undefined;

    reset(state: GameEngineState): void;
}
