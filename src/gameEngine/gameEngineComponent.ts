import {MouseButton} from "../utils/mouseConfig";
import {GameEngineComponentState} from "./gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {GraphicsContext} from "../utils/graphics/graphicsContext";

export type GameEngineChanges = {
    nextMode?: GameModeEnum;
}

export interface GameEngineComponent {
    update(state: GameEngineComponentState, graphicsContext: GraphicsContext): void;

    keyPressed(state: GameEngineComponentState, keyCode: number): void;

    mouseClicked(state: GameEngineComponentState, mouseButton: MouseButton, mouseX: number, mouseY: number): void;

    mouseMoved(state: GameEngineComponentState, mouseX: number, mouseY: number): void;

    hasCompleted(state: GameEngineComponentState): boolean;

    recommendStateChanges(state: GameEngineComponentState): GameEngineChanges | undefined;

    reset(state: GameEngineComponentState): void;
}
