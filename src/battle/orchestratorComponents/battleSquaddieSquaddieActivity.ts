import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import p5 from "p5";
import {tintSquaddieIfTurnIsComplete} from "../animation/drawSquaddie";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {
    DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation,
    DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation,
    ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct
} from "./orchestratorUtils";
import {RectArea} from "../../ui/rectArea";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {Label} from "../../ui/label";
import {FormatResult} from "../animation/activityResultTextWriter";

export const ACTIVITY_COMPLETED_WAIT_TIME_MS = 5000;

export class BattleSquaddieSquaddieActivity implements OrchestratorComponent {
    animationCompleteStartTime?: number;
    clickedToCancelActivity: boolean;
    outputTextDisplay: Label;
    outputTextStrings: string[];

    constructor() {
        this.animationCompleteStartTime = undefined;
        this.clickedToCancelActivity = false;
        this.outputTextStrings = [];
    }

    hasCompleted(state: OrchestratorState): boolean {
        const animationCompleted = (this.animationCompleteStartTime !== undefined && Date.now() - this.animationCompleteStartTime) >= ACTIVITY_COMPLETED_WAIT_TIME_MS;
        return animationCompleted || this.clickedToCancelActivity;
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.clickedToCancelActivity = true;
        }
    }

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: OrchestratorState): void {
        this.animationCompleteStartTime = undefined;
        this.clickedToCancelActivity = false;
        this.outputTextDisplay = undefined;
        DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state);
        DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state);
        this.maybeEndSquaddieTurn(state);
    }

    private maybeEndSquaddieTurn(state: OrchestratorState) {
        const {
            dynamicSquaddie: actingSquaddieDynamic,
            staticSquaddie: actingSquaddieStatic
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicID(state.squaddieCurrentlyActing.dynamicSquaddieId));
        ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
        tintSquaddieIfTurnIsComplete(actingSquaddieDynamic, actingSquaddieStatic);
    }

    update(state: OrchestratorState, p: p5): void {
        if (this.animationCompleteStartTime === undefined) {
            this.animationCompleteStartTime = Date.now();
        }
        this.draw(state, p);
    }

    private draw(state: OrchestratorState, p: p5) {
        if (this.outputTextDisplay === undefined) {
            this.outputTextStrings = FormatResult({
                squaddieRepository: state.squaddieRepository,
                currentActivity: state.squaddieCurrentlyActing.currentSquaddieActivity,
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

        this.outputTextDisplay.draw(p);
    }
}
