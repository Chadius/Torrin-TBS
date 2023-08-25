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
import {GetHitPoints, IsSquaddieAlive} from "../../squaddie/squaddieService";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {MaybeEndSquaddieTurn} from "./battleSquaddieSelectorUtils";
import {WeaponIcon} from "../animation/actionAnimation/weaponIcon";
import {TargetTextWindow} from "../animation/actionAnimation/targetTextWindow";
import {ActorTextWindow} from "../animation/actionAnimation/actorTextWindow";
import {ActionAnimationPhase} from "../animation/actionAnimation/actionAnimationConstants";
import {ActionTimer} from "../animation/actionAnimation/actionTimer";
import {ActorSprite} from "../animation/actionAnimation/actorSprite";
import {TargetSprite} from "../animation/actionAnimation/targetSprite";
import {HitPointMeter} from "../animation/actionAnimation/hitPointMeter";
import {ActivityResult} from "../history/activityResult";
import {SquaddieActivity} from "../../squaddie/activity";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../graphicsConstants";
import {WINDOW_SPACING1} from "../../ui/constants";

export const ACTIVITY_COMPLETED_WAIT_TIME_MS = 5000;

export class BattleSquaddieSquaddieActivity implements BattleOrchestratorComponent {
    userRequestedAnimationSkip: boolean;
    outputTextDisplay: Label;
    outputTextStrings: string[];
    sawResultAftermath: boolean;
    private startedShowingResults: boolean;

    constructor() {
        this.resetInternalState();
    }

    private _actionAnimationTimer: ActionTimer;

    get actionAnimationTimer(): ActionTimer {
        return this._actionAnimationTimer;
    }

    private _weaponIcon: WeaponIcon;

    get weaponIcon(): WeaponIcon {
        return this._weaponIcon;
    }

    private _actorTextWindow: ActorTextWindow;

    get actorTextWindow(): ActorTextWindow {
        return this._actorTextWindow;
    }

    private _actorSprite: ActorSprite;

    get actorSprite(): ActorSprite {
        return this._actorSprite;
    }

    private _targetSprites: TargetSprite[];

    get targetSprites(): TargetSprite[] {
        return this._targetSprites;
    }

    private _targetTextWindows: TargetTextWindow[];

    get targetTextWindows(): TargetTextWindow[] {
        return this._targetTextWindows;
    }

    private _targetHitPointMeters: { [dynamicId: string]: HitPointMeter };

    get targetHitPointMeters(): { [dynamicId: string]: HitPointMeter } {
        return this._targetHitPointMeters;
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return this.sawResultAftermath;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.userRequestedAnimationSkip = true;
            if (this.startedShowingResults === false) {
                this.updateHitPointMeters(state);
                this.startedShowingResults = true;
            }
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
            checkMissionObjectives: true,
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
                this.drawActionAnimation(state, p);
                break;
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.TARGET_REACTS:
                if (this.startedShowingResults === false) {
                    this.updateHitPointMeters(state);
                    this.startedShowingResults = true;
                }
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
        this.startedShowingResults = false;
        this.outputTextDisplay = undefined;
        this._actionAnimationTimer = new ActionTimer();
        this._targetHitPointMeters = {};
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
        this._actorSprite = new ActorSprite();

        const mostRecentResults = state.battleEventRecording.mostRecentEvent.results;
        const {
            dynamicSquaddie: actorDynamic,
            staticSquaddie: actorStatic,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(mostRecentResults.actingSquaddieDynamicId));

        const activity = state.battleEventRecording.mostRecentEvent.instruction.currentSquaddieActivity;
        this.actorTextWindow.start({
            actorStatic,
            actorDynamic,
            activity,
        });

        this.actorSprite.start({
            actorStatic,
            actorDynamic,
            activity,
            resourceHandler: state.resourceHandler,
            windowArea: this.actorTextWindow.actorLabel.rectangle.area,
        })
        this.weaponIcon.start();

        const resultPerTarget = state.battleEventRecording.mostRecentEvent.results.resultPerTarget;
        this.setupAnimationForTargetTextWindows(state, resultPerTarget);
        this.setupAnimationForTargetSprites(state, activity, resultPerTarget);
        this.setupAnimationForTargetHitPointMeters(state);
    }

    private setupAnimationForTargetSprites(state: BattleOrchestratorState, activity: SquaddieActivity, resultPerTarget: {
        [p: string]: ActivityResult
    }) {
        this._targetSprites = state.battleEventRecording.mostRecentEvent.results.targetedSquaddieDynamicIds.map((dynamicId: string, index: number) => {
            const {
                dynamicSquaddie: targetDynamic,
                staticSquaddie: targetStatic,
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicId));

            const targetSprite = new TargetSprite();
            targetSprite.start({
                targetStatic,
                targetDynamic,
                activity,
                result: resultPerTarget[dynamicId],
                resourceHandler: state.resourceHandler,
                windowArea: this.targetTextWindows[index].targetLabel.rectangle.area,
            });
            return targetSprite;
        });
    }

    private setupAnimationForTargetTextWindows(state: BattleOrchestratorState, resultPerTarget: {
        [p: string]: ActivityResult
    }) {
        this._targetTextWindows = state.battleEventRecording.mostRecentEvent.results.targetedSquaddieDynamicIds.map((dynamicId: string) => {
            const {
                dynamicSquaddie: targetDynamic,
                staticSquaddie: targetStatic,
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicId));

            const targetTextWindow = new TargetTextWindow();
            targetTextWindow.start({
                targetStatic,
                targetDynamic,
                result: resultPerTarget[dynamicId],
            });
            return targetTextWindow;
        });
    }

    private drawActionAnimation(state: BattleOrchestratorState, p: p5) {
        this.actorTextWindow.draw(p, this.actionAnimationTimer);
        this.actorSprite.draw(this.actionAnimationTimer, p);
        this.weaponIcon.draw(p, this.actorSprite.getSquaddieImageBasedOnTimer(this.actionAnimationTimer, p).area);
        this.targetTextWindows.forEach((t) => t.draw(p, this.actionAnimationTimer));
        this.targetSprites.forEach((t) => t.draw(this.actionAnimationTimer, p));
        Object.values(this.targetHitPointMeters).forEach((t) => t.draw(p));
    }

    private setupAnimationForTargetHitPointMeters(state: BattleOrchestratorState) {
        const mostRecentResults = state.battleEventRecording.mostRecentEvent.results;
        state.battleEventRecording.mostRecentEvent.results.targetedSquaddieDynamicIds.forEach((dynamicId: string, index: number) => {
            const {
                dynamicSquaddie: targetDynamic,
                staticSquaddie: targetStatic,
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicId));

            let {
                currentHitPoints,
                maxHitPoints,
            } = GetHitPoints({
                dynamicSquaddie: targetDynamic,
                staticSquaddie: targetStatic,
            });

            currentHitPoints += mostRecentResults.resultPerTarget[dynamicId].damageTaken;

            this._targetHitPointMeters[dynamicId] = new HitPointMeter({
                currentHitPoints,
                maxHitPoints,
                left: this._targetTextWindows[index].targetLabel.rectangle.area.left + WINDOW_SPACING1,
                top: this._targetTextWindows[index].targetLabel.rectangle.area.top + 100,
                hue: HUE_BY_SQUADDIE_AFFILIATION[targetStatic.squaddieId.affiliation]
            });
        });
    }

    private updateHitPointMeters(state: BattleOrchestratorState) {
        const mostRecentResults = state.battleEventRecording.mostRecentEvent.results;
        state.battleEventRecording.mostRecentEvent.results.targetedSquaddieDynamicIds.forEach((dynamicId: string) => {
            const hitPointMeter = this.targetHitPointMeters[dynamicId];
            hitPointMeter.changeHitPoints(-1 * mostRecentResults.resultPerTarget[dynamicId].damageTaken);
        });
    }
}
