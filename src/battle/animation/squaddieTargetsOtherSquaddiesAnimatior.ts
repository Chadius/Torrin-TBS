import p5 from "p5";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {ActionAnimationPhase} from "./actionAnimation/actionAnimationConstants";
import {ActionTimer} from "./actionAnimation/actionTimer";
import {ActorTextWindow} from "./actionAnimation/actorTextWindow";
import {WeaponIcon} from "./actionAnimation/weaponIcon";
import {ActorSprite} from "./actionAnimation/actorSprite";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {TargetSprite} from "./actionAnimation/targetSprite";
import {TargetTextWindow} from "./actionAnimation/targetTextWindow";
import {HitPointMeter} from "./actionAnimation/hitPointMeter";
import {GetHitPoints} from "../../squaddie/squaddieService";
import {WINDOW_SPACING1} from "../../ui/constants";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../graphicsConstants";
import {ActivityResult} from "../history/activityResult";
import {SquaddieActivity} from "../../squaddie/activity";
import {SquaddieActionAnimator} from "./squaddieActionAnimator";

export class SquaddieTargetsOtherSquaddiesAnimator implements SquaddieActionAnimator {
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

    private _userRequestedAnimationSkip: boolean;

    get userRequestedAnimationSkip(): boolean {
        return this._userRequestedAnimationSkip;
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return this.sawResultAftermath === true;
    }

    mouseEventHappened(state: BattleOrchestratorState, mouseEvent: OrchestratorComponentMouseEvent) {
        if (mouseEvent.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this._userRequestedAnimationSkip = true;
            if (this.startedShowingResults === false) {
                this.updateHitPointMeters(state);
                this.startedShowingResults = true;
            }
        }
    }

    start(state: BattleOrchestratorState) {

    }

    resetInternalState() {
        this._actionAnimationTimer = new ActionTimer();
        this._userRequestedAnimationSkip = false;
        this.sawResultAftermath = false;
        this.startedShowingResults = false;
        this._actionAnimationTimer = new ActionTimer();
        this._targetHitPointMeters = {};
    }

    update(state: BattleOrchestratorState, graphicsContext: p5) {
        if (this.actionAnimationTimer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            this.setupActionAnimation(state, graphicsContext);
            this.actionAnimationTimer.start();
        }

        const phaseToShow: ActionAnimationPhase = this._userRequestedAnimationSkip
            ? ActionAnimationPhase.FINISHED_SHOWING_RESULTS
            : this.actionAnimationTimer.currentPhase;

        switch (phaseToShow) {
            case ActionAnimationPhase.INITIALIZED:
            case ActionAnimationPhase.BEFORE_ACTION:
            case ActionAnimationPhase.DURING_ACTION:
                this.drawActionAnimation(state, graphicsContext);
                break;
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.TARGET_REACTS:
                if (this.startedShowingResults === false) {
                    this.updateHitPointMeters(state);
                    this.startedShowingResults = true;
                }
                this.drawActionAnimation(state, graphicsContext);
                break;
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                this.drawActionAnimation(state, graphicsContext);
                this.sawResultAftermath = true;
                break;
        }
    }

    reset(state: BattleOrchestratorState) {
        this.resetInternalState();
    }

    private setupActionAnimation(state: BattleOrchestratorState, graphicsContext: p5) {
        this._actorTextWindow = new ActorTextWindow();
        this._weaponIcon = new WeaponIcon();
        this._actorSprite = new ActorSprite();

        const mostRecentResults = state.battleEventRecording.mostRecentEvent.results;
        const {
            dynamicSquaddie: actorDynamic,
            staticSquaddie: actorStatic,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(mostRecentResults.actingSquaddieDynamicId));

        const activity = state.squaddieCurrentlyActing.currentlySelectedActivity;
        this.actorTextWindow.start({
            actorStatic,
            actorDynamic,
            activity,
        });

        this.actorSprite.start({
            actorDynamicSquaddieId: actorDynamic.dynamicSquaddieId,
            squaddieRepository: state.squaddieRepository,
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
            const targetSprite = new TargetSprite();
            targetSprite.start({
                targetDynamicSquaddieId: dynamicId,
                squaddieRepository: state.squaddieRepository,
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

    private drawActionAnimation(state: BattleOrchestratorState, graphicsContext: p5) {
        this.actorTextWindow.draw(graphicsContext, this.actionAnimationTimer);
        this.actorSprite.draw(this.actionAnimationTimer, graphicsContext);
        this.weaponIcon.draw(graphicsContext, this.actorSprite.getSquaddieImageBasedOnTimer(this.actionAnimationTimer, graphicsContext).area);
        this.targetTextWindows.forEach((t) => t.draw(graphicsContext, this.actionAnimationTimer));
        this.targetSprites.forEach((t) => t.draw(this.actionAnimationTimer, graphicsContext));
        Object.values(this.targetHitPointMeters).forEach((t) => t.draw(graphicsContext));
    }

    private updateHitPointMeters(state: BattleOrchestratorState) {
        const mostRecentResults = state.battleEventRecording.mostRecentEvent.results;
        state.battleEventRecording.mostRecentEvent.results.targetedSquaddieDynamicIds.forEach((dynamicId: string) => {
            const hitPointMeter = this.targetHitPointMeters[dynamicId];
            hitPointMeter.changeHitPoints(-1 * mostRecentResults.resultPerTarget[dynamicId].damageTaken);
        });
    }
}
