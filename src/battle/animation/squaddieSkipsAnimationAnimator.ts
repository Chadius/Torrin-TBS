import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {SquaddieActionAnimator} from "./squaddieActionAnimator";
import {FormatResult} from "./activityResultTextWriter";
import {Label} from "../../ui/label";
import {RectArea} from "../../ui/rectArea";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";

export const ANIMATE_TEXT_WINDOW_WAIT_TIME = 5000;

export class SquaddieSkipsAnimationAnimator implements SquaddieActionAnimator {
    outputTextDisplay: Label;
    outputTextStrings: string[];
    private animationCompleteStartTime: number;
    private clickedToCancelActivity: boolean;

    hasCompleted(state: BattleOrchestratorState): boolean {
        const userWaited: boolean = this.animationCompleteStartTime !== undefined
            && Date.now() - this.animationCompleteStartTime >= ANIMATE_TEXT_WINDOW_WAIT_TIME;
        return userWaited || this.clickedToCancelActivity;
    }

    mouseEventHappened(state: BattleOrchestratorState, mouseEvent: OrchestratorComponentMouseEvent): void {
        if (mouseEvent.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.clickedToCancelActivity = true;
        }
    }

    reset(state: BattleOrchestratorState): void {
        this.resetInternalState();
    }

    start(state: BattleOrchestratorState): void {
        this.maybeInitializeAnimationTimer();
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        this.maybeInitializeAnimationTimer();
        this.draw(state, graphicsContext);
    }

    private resetInternalState() {
        this.outputTextDisplay = undefined;
        this.animationCompleteStartTime = undefined;
        this.clickedToCancelActivity = false;
    }

    private maybeInitializeAnimationTimer() {
        if (this.animationCompleteStartTime === undefined) {
            this.animationCompleteStartTime = Date.now();
        }
    }

    private drawActivityDescription(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        if (this.outputTextDisplay === undefined) {
            this.outputTextStrings = FormatResult({
                squaddieRepository: state.squaddieRepository,
                currentActivity: state.squaddieCurrentlyActing.currentlySelectedActivity,
                result: state.battleEventRecording.mostRecentEvent.results,
            });

            const textToDraw = this.outputTextStrings.join("\n");

            this.outputTextDisplay = new Label({
                area: new RectArea({
                    startColumn: 4,
                    endColumn: 10,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    percentTop: 40,
                    percentHeight: 20,
                }),
                fillColor: [0, 0, 60],
                strokeColor: [0, 0, 0],
                strokeWeight: 4,

                text: textToDraw,
                textSize: 24,
                fontColor: [0, 0, 16],
                padding: [16, 0, 0, 16],
            });
        }

        this.outputTextDisplay.draw(graphicsContext);
    }

    private draw(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        this.drawActivityDescription(state, graphicsContext);
    }
}
