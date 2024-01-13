import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {SquaddieActionAnimator} from "./squaddieActionAnimator";
import {ActionResultTextService} from "./actionResultTextService";
import {Label, LabelHelper} from "../../ui/label";
import {RectAreaService} from "../../ui/rectArea";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {RecordingService} from "../history/recording";
import {ActionEffectType} from "../../decision/actionEffect";

export const ANIMATE_TEXT_WINDOW_WAIT_TIME = 5000;

export class SquaddieSkipsAnimationAnimator implements SquaddieActionAnimator {
    outputTextDisplay: Label;
    outputTextStrings: string[];
    private animationCompleteStartTime: number;
    private userCanceledAction: boolean;

    hasCompleted(state: BattleOrchestratorState): boolean {
        const userWaited: boolean = this.animationCompleteStartTime !== undefined
            && Date.now() - this.animationCompleteStartTime >= ANIMATE_TEXT_WINDOW_WAIT_TIME;
        return userWaited || this.userCanceledAction;
    }

    mouseEventHappened(state: BattleOrchestratorState, mouseEvent: OrchestratorComponentMouseEvent): void {
        if (mouseEvent.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.userCanceledAction = true;
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
        this.userCanceledAction = false;
    }

    private maybeInitializeAnimationTimer() {
        if (this.animationCompleteStartTime === undefined) {
            this.animationCompleteStartTime = Date.now();
        }
    }

    private drawActionDescription(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        if (this.outputTextDisplay === undefined) {
            let squaddieActionEffect = state.battleState.squaddieCurrentlyActing.currentlySelectedDecision.actionEffects[0];
            if (squaddieActionEffect.type !== ActionEffectType.SQUADDIE) {
                return;
            }

            this.outputTextStrings = ActionResultTextService.outputResultForTextOnly({
                squaddieRepository: state.squaddieRepository,
                currentActionEffectTemplate: squaddieActionEffect.template,
                result: RecordingService.mostRecentEvent(state.battleState.recording).results,
            });

            const textToDraw = this.outputTextStrings.join("\n");

            this.outputTextDisplay = LabelHelper.new({
                area: RectAreaService.new({
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

        LabelHelper.draw(this.outputTextDisplay, graphicsContext);
    }

    private draw(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        this.drawActionDescription(state, graphicsContext);
    }
}
