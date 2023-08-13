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
import {Label} from "../../ui/label";
import {IsSquaddieAlive} from "../../squaddie/squaddieService";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {MaybeEndSquaddieTurn} from "./battleSquaddieSelectorUtils";
import {WeaponIcon} from "../animation/actionAnimation/weaponIcon";
import {TargetTextWindow} from "../animation/actionAnimation/targetTextWindow";
import {ActorTextWindow} from "../animation/actionAnimation/actorTextWindow";
import {ActionAnimationPhase} from "../animation/actionAnimation/actionAnimationConstants";
import {ActionTimer} from "../animation/actionAnimation/actionTimer";

export const ACTIVITY_COMPLETED_WAIT_TIME_MS = 5000;

export class BattleSquaddieSquaddieActivity implements BattleOrchestratorComponent {
    get actionAnimationTimer(): ActionTimer {
        return this._actionAnimationTimer;
    }
    get weaponIcon(): WeaponIcon {
        return this._weaponIcon;
    }
    get targetTextWindows(): TargetTextWindow[] {
        return this._targetTextWindows;
    }
    get actorTextWindow(): ActorTextWindow {
        return this._actorTextWindow;
    }
    userRequestedAnimationSkip: boolean;
    outputTextDisplay: Label;
    outputTextStrings: string[];
    sawResultAftermath: boolean;

    private _actionAnimationTimer: ActionTimer;

    private _weaponIcon: WeaponIcon;
    private _actorTextWindow: ActorTextWindow;
    private _targetTextWindows: TargetTextWindow[];

    constructor() {
        this.resetInternalState();
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return this.sawResultAftermath;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.userRequestedAnimationSkip = true;
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
        if (this.actionAnimationTimer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            this.setupActionAnimation(state, p);
            this.actionAnimationTimer.start();
        }

        const phaseToShow: ActionAnimationPhase = this.userRequestedAnimationSkip
            ? ActionAnimationPhase.FINISHED_SHOWING_RESULTS
            : this.actionAnimationTimer.currentPhase;

        switch (phaseToShow) {
            case ActionAnimationPhase.INITIALIZED:
            case ActionAnimationPhase.BEFORE_ACTION:
            case ActionAnimationPhase.DURING_ACTION:
            case ActionAnimationPhase.AFTER_ACTION:
                this.drawActionAnimation(state, p);
                break;
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                this.drawActionAnimation(state, p);
                this.hideDeadSquaddies(state);
                this.sawResultAftermath = true;
                break;
        }
    }

    private resetInternalState() {
        this.userRequestedAnimationSkip = false;
        this.outputTextStrings = [];
        this.sawResultAftermath = false;
        this.outputTextDisplay = undefined;
        this._actionAnimationTimer = new ActionTimer();
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

    private setupActionAnimation(state: BattleOrchestratorState, p: p5) {
        this._actorTextWindow = new ActorTextWindow();
        this._weaponIcon = new WeaponIcon();

        const mostRecentResults = state.battleEventRecording.mostRecentEvent.results;
        const {
            dynamicSquaddie: actorDynamic,
            staticSquaddie: actorStatic,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(mostRecentResults.actingSquaddieDynamicId));

        this.actorTextWindow.start({
            actorStatic,
            actorDynamic,
            activity: state.battleEventRecording.mostRecentEvent.instruction.currentSquaddieActivity,
        });

        this.weaponIcon.start({
            actorIconArea: this.actorTextWindow.actorLabel.rectangle.area,
        });

        this._targetTextWindows = state.battleEventRecording.mostRecentEvent.results.targetedSquaddieDynamicIds.map((dynamicId: string) => {
            const {
                dynamicSquaddie: targetDynamic,
                staticSquaddie: targetStatic,
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicId));

            const targetTextWindow = new TargetTextWindow();
            targetTextWindow.start({
                targetStatic,
                targetDynamic,
                result: state.battleEventRecording.mostRecentEvent.results.resultPerTarget[dynamicId],
            });
            return targetTextWindow;
        });
    }

    private drawActionAnimation(state: BattleOrchestratorState, p: p5) {
        this.actorTextWindow.draw(p, this.actionAnimationTimer);
        this.weaponIcon.draw(p, this.actionAnimationTimer);
        this.targetTextWindows.forEach((t) => t.draw(p, this.actionAnimationTimer));
    }
}
