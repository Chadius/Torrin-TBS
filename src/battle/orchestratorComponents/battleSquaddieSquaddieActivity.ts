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
import {Rectangle} from "../../ui/rectangle";
import {RectArea} from "../../ui/rectArea";
import {ScreenDimensions} from "../../utils/graphicsConfig";

export const ACTIVITY_COMPLETED_WAIT_TIME_MS = 5000;

export class BattleSquaddieSquaddieActivity implements OrchestratorComponent {
    animationCompleteStartTime?: number;
    clickedToCancelActivity: boolean;

    constructor() {
        this.animationCompleteStartTime = undefined;
        this.clickedToCancelActivity = false;
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
        const buttonBackground = new Rectangle({
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
        });

        buttonBackground.draw(p);

        p.push();
        const textLeft: number = (ScreenDimensions.SCREEN_WIDTH * 0.50);
        const textTop: number = (ScreenDimensions.SCREEN_HEIGHT * 0.50);

        p.textSize(24);
        p.fill("#0f0f0f");

        p.text("Activity Happened!", textLeft, textTop);
        p.pop();
    }
}