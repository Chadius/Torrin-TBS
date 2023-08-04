import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import p5 from "p5";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {
    DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation,
    DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation
} from "./orchestratorUtils";
import {RectArea} from "../../ui/rectArea";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {Label} from "../../ui/label";
import {FormatResult} from "../animation/activityResultTextWriter";
import {IsSquaddieAlive} from "../../squaddie/squaddieService";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {MaybeEndSquaddieTurn} from "./battleSquaddieSelectorUtils";

export const ACTIVITY_COMPLETED_WAIT_TIME_MS = 5000;

export class BattleSquaddieSquaddieActivity implements BattleOrchestratorComponent {
    animationCompleteStartTime?: number;
    clickedToCancelActivity: boolean;
    outputTextDisplay: Label;
    outputTextStrings: string[];
    sawResultAftermath: boolean;

    constructor() {
        this.resetInternalState();
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return this.sawResultAftermath;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.clickedToCancelActivity = true;
        }
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
        });
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: BattleOrchestratorState): void {
        this.resetInternalState();
        DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state);
        DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state);
        MaybeEndSquaddieTurn(state);
    }

    update(state: BattleOrchestratorState, p: p5): void {
        if (this.animationCompleteStartTime === undefined) {
            this.animationCompleteStartTime = Date.now();
        }
        this.draw(state, p);
    }

    private resetInternalState() {
        this.animationCompleteStartTime = undefined;
        this.clickedToCancelActivity = false;
        this.outputTextStrings = [];
        this.sawResultAftermath = false;
        this.outputTextDisplay = undefined;
    }

    private getAnimationCompleted() {
        return this.animationCompleteStartTime !== undefined && (Date.now() - this.animationCompleteStartTime) >= ACTIVITY_COMPLETED_WAIT_TIME_MS;
    }

    private draw(state: BattleOrchestratorState, p: p5) {
        if (this.outputTextDisplay === undefined) {
            this.prepareOutputTextDisplay(state);
            return;
        }

        const showDamageDisplay = !this.getAnimationCompleted() && !this.clickedToCancelActivity;
        if (this.outputTextDisplay !== undefined && showDamageDisplay) {
            this.outputTextDisplay.draw(p);
            return;
        }

        this.hideDeadSquaddies(state);
        this.sawResultAftermath = true;
    }

    private prepareOutputTextDisplay(state: BattleOrchestratorState) {
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

    private hideDeadSquaddies(state: BattleOrchestratorState) {
        const mostRecentResults = state.battleEventRecording.mostRecentEvent.results;
        mostRecentResults.targetedSquaddieDynamicIds.forEach((dynamicSquaddieId) => {
            const {
                dynamicSquaddie,
                staticSquaddie
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicSquaddieId));
            if (!IsSquaddieAlive({dynamicSquaddie, staticSquaddie})) {
                state.missionMap.hideSquaddieFromDrawing(dynamicSquaddieId);
                state.missionMap.updateSquaddieLocation(dynamicSquaddieId, undefined);
            }
        });
    }
}
