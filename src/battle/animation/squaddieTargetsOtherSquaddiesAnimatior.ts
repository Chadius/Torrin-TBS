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
import {ActionResultPerSquaddie} from "../history/actionResultPerSquaddie";
import {SquaddieAction} from "../../squaddie/action";
import {SquaddieActionAnimator} from "./squaddieActionAnimator";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {RecordingHandler} from "../history/recording";

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

    private _targetHitPointMeters: {
        [battleId: string]: HitPointMeter
    };

    get targetHitPointMeters(): {
        [battleId: string]: HitPointMeter
    } {
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

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        if (this.actionAnimationTimer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            this.setupActionAnimation(state);
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

    private setupActionAnimation(state: BattleOrchestratorState) {
        this._actorTextWindow = new ActorTextWindow();
        this._weaponIcon = new WeaponIcon();
        this._actorSprite = new ActorSprite();

        const mostRecentResults = RecordingHandler.mostRecentEvent(state.battleState.recording);
        const {
            battleSquaddie: actorBattle,
            squaddieTemplate: actorTemplate,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(
            mostRecentResults.results.actingBattleSquaddieId
        ));

        const action = state.battleState.squaddieCurrentlyActing.currentlySelectedAction;
        this.actorTextWindow.start({
            actorTemplate: actorTemplate,
            actorBattle: actorBattle,
            action: action,
        });

        this.actorSprite.start({
            actorBattleSquaddieId: actorBattle.battleSquaddieId,
            squaddieRepository: state.squaddieRepository,
            resourceHandler: state.resourceHandler,
            windowArea: this.actorTextWindow.actorLabel.rectangle.area,
        })
        this.weaponIcon.start();

        const resultPerTarget = RecordingHandler.mostRecentEvent(state.battleState.recording).results.resultPerTarget;
        this.setupAnimationForTargetTextWindows(state, resultPerTarget);
        this.setupAnimationForTargetSprites(state, action, resultPerTarget);
        this.setupAnimationForTargetHitPointMeters(state);
    }

    private setupAnimationForTargetSprites(state: BattleOrchestratorState, action: SquaddieAction, resultPerTarget: {
        [p: string]: ActionResultPerSquaddie
    }) {
        this._targetSprites = RecordingHandler.mostRecentEvent(state.battleState.recording).results.targetedBattleSquaddieIds.map((battleId: string, index: number) => {
            const targetSprite = new TargetSprite();
            targetSprite.start({
                targetBattleSquaddieId: battleId,
                squaddieRepository: state.squaddieRepository,
                action: action,
                result: resultPerTarget[battleId],
                resourceHandler: state.resourceHandler,
                windowArea: this.targetTextWindows[index].targetLabel.rectangle.area,
            });
            return targetSprite;
        });
    }

    private setupAnimationForTargetTextWindows(state: BattleOrchestratorState, resultPerTarget: {
        [p: string]: ActionResultPerSquaddie
    }) {
        this._targetTextWindows = RecordingHandler.mostRecentEvent(state.battleState.recording).results.targetedBattleSquaddieIds.map((battleId: string) => {
            const {
                battleSquaddie: targetBattle,
                squaddieTemplate: targetTemplate,
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(battleId));

            const targetTextWindow = new TargetTextWindow();
            targetTextWindow.start({
                targetTemplate: targetTemplate,
                targetBattle: targetBattle,
                result: resultPerTarget[battleId],
            });
            return targetTextWindow;
        });
    }

    private setupAnimationForTargetHitPointMeters(state: BattleOrchestratorState) {
        const mostRecentResults = RecordingHandler.mostRecentEvent(state.battleState.recording).results;
        RecordingHandler.mostRecentEvent(state.battleState.recording).results.targetedBattleSquaddieIds.forEach((battleId: string, index: number) => {
            const {
                battleSquaddie: targetBattle,
                squaddieTemplate: targetTemplate,
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(battleId));

            let {
                currentHitPoints,
                maxHitPoints,
            } = GetHitPoints({
                battleSquaddie: targetBattle,
                squaddieTemplate: targetTemplate,
            });

            currentHitPoints += mostRecentResults.resultPerTarget[battleId].damageTaken;

            this._targetHitPointMeters[battleId] = new HitPointMeter({
                currentHitPoints,
                maxHitPoints,
                left: this._targetTextWindows[index].targetLabel.rectangle.area.left + WINDOW_SPACING1,
                top: this._targetTextWindows[index].targetLabel.rectangle.area.top + 100,
                hue: HUE_BY_SQUADDIE_AFFILIATION[targetTemplate.squaddieId.affiliation]
            });
        });
    }

    private drawActionAnimation(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        this.actorTextWindow.draw(graphicsContext, this.actionAnimationTimer);
        this.actorSprite.draw(this.actionAnimationTimer, graphicsContext);
        this.weaponIcon.draw(graphicsContext, this.actorSprite.getSquaddieImageBasedOnTimer(this.actionAnimationTimer, graphicsContext).area);
        this.targetTextWindows.forEach((t) => t.draw(graphicsContext, this.actionAnimationTimer));
        this.targetSprites.forEach((t) => t.draw(this.actionAnimationTimer, graphicsContext));
        Object.values(this.targetHitPointMeters).forEach((t) => t.draw(graphicsContext));
    }

    private updateHitPointMeters(state: BattleOrchestratorState) {
        const mostRecentResults = RecordingHandler.mostRecentEvent(state.battleState.recording).results;
        RecordingHandler.mostRecentEvent(state.battleState.recording).results.targetedBattleSquaddieIds.forEach((battleId: string) => {
            const hitPointMeter = this.targetHitPointMeters[battleId];
            hitPointMeter.changeHitPoints(-1 * mostRecentResults.resultPerTarget[battleId].damageTaken);
        });
    }
}
