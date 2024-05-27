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
import {WINDOW_SPACING} from "../../ui/constants";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../graphicsConstants";
import {ActionResultPerSquaddie} from "../history/actionResultPerSquaddie";
import {SquaddieActionAnimator} from "./squaddieActionAnimator";
import {GraphicsBuffer} from "../../utils/graphics/graphicsRenderer";
import {RecordingService} from "../history/recording";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {RectAreaService} from "../../ui/rectArea";
import {ObjectRepositoryService} from "../objectRepository";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ActionsThisRoundService} from "../history/actionsThisRound";
import {ActionEffectType} from "../../action/template/actionEffectTemplate";
import {ActionEffectSquaddieTemplate} from "../../action/template/actionEffectSquaddieTemplate";
import {PlayerBattleActionBuilderStateService} from "../actionBuilder/playerBattleActionBuilderState";

export class SquaddieTargetsOtherSquaddiesAnimator implements SquaddieActionAnimator {
    sawResultAftermath: boolean;
    private startedShowingResults: boolean;
    private _userRequestedAnimationSkip: boolean;

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

    hasCompleted(state: GameEngineState): boolean {
        return this.sawResultAftermath === true;
    }

    mouseEventHappened(state: GameEngineState, mouseEvent: OrchestratorComponentMouseEvent) {
        if (mouseEvent.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this._userRequestedAnimationSkip = true;
            if (this.startedShowingResults === false) {
                this.updateHitPointMeters(state.battleOrchestratorState);
                this.startedShowingResults = true;
            }
        }
    }

    start(state: GameEngineState) {

    }

    resetInternalState() {
        this._actionAnimationTimer = new ActionTimer();
        this._userRequestedAnimationSkip = false;
        this.sawResultAftermath = false;
        this.startedShowingResults = false;
        this._actionAnimationTimer = new ActionTimer();
        this._targetHitPointMeters = {};
    }

    update(state: GameEngineState, graphics: GraphicsBuffer): void {
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
                this.drawActionAnimation(state.battleOrchestratorState, graphics);
                break;
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.TARGET_REACTS:
                if (this.startedShowingResults === false) {
                    this.updateHitPointMeters(state.battleOrchestratorState);
                    this.startedShowingResults = true;
                }
                this.drawActionAnimation(state.battleOrchestratorState, graphics);
                break;
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                this.drawActionAnimation(state.battleOrchestratorState, graphics);
                this.sawResultAftermath = true;
                break;
        }
    }

    reset(gameEngineState: GameEngineState) {
        this.resetInternalState();

        PlayerBattleActionBuilderStateService.setAnimationCompleted({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            animationCompleted: true
        });
    }

    private setupActionAnimation(state: GameEngineState) {
        this._actorTextWindow = new ActorTextWindow();
        this._weaponIcon = new WeaponIcon();
        this._actorSprite = new ActorSprite();

        const mostRecentResults = RecordingService.mostRecentEvent(state.battleOrchestratorState.battleState.recording);
        const {
            battleSquaddie: actorBattle,
            squaddieTemplate: actorTemplate,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository,
            mostRecentResults.results.actingBattleSquaddieId
        ));

        const processedActionToShow = ActionsThisRoundService.getProcessedActionToShow(state.battleOrchestratorState.battleState.actionsThisRound);
        const processedActionEffectToShow = ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound);
        if (processedActionEffectToShow.type !== ActionEffectType.SQUADDIE) {
            return;
        }

        if (processedActionEffectToShow.decidedActionEffect.type !== ActionEffectType.SQUADDIE) {
            return;
        }
        const actionEffectSquaddieTemplate = processedActionEffectToShow.decidedActionEffect.template;

        this.actorTextWindow.start({
            actorTemplate: actorTemplate,
            actorBattle: actorBattle,
            actionTemplateName: processedActionToShow.decidedAction.actionTemplateName,
            results: mostRecentResults.results,
        });

        this.actorSprite.start({
            actorBattleSquaddieId: actorBattle.battleSquaddieId,
            squaddieRepository: state.repository,
            resourceHandler: state.resourceHandler,
            startingPosition: (2 * ScreenDimensions.SCREEN_WIDTH / 12) + WINDOW_SPACING.SPACING1,
            squaddieResult: mostRecentResults.results,
        });
        this.weaponIcon.start();

        const resultPerTarget = RecordingService.mostRecentEvent(state.battleOrchestratorState.battleState.recording).results.resultPerTarget;
        this.setupAnimationForTargetTextWindows(state, resultPerTarget);
        this.setupAnimationForTargetSprites(state, actionEffectSquaddieTemplate, resultPerTarget);
        this.setupAnimationForTargetHitPointMeters(state);
    }

    private setupAnimationForTargetSprites(state: GameEngineState, actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate, resultPerTarget: {
        [p: string]: ActionResultPerSquaddie
    }) {
        this._targetSprites = RecordingService.mostRecentEvent(state.battleOrchestratorState.battleState.recording).results.targetedBattleSquaddieIds.map((battleId: string, index: number) => {
            const targetSprite = new TargetSprite();
            targetSprite.start({
                targetBattleSquaddieId: battleId,
                squaddieRepository: state.repository,
                actionEffectSquaddieTemplate,
                result: resultPerTarget[battleId],
                resourceHandler: state.resourceHandler,
                startingPosition: RectAreaService.right(this.targetTextWindows[index].targetLabel.rectangle.area),
            });
            return targetSprite;
        });
    }

    private setupAnimationForTargetTextWindows(state: GameEngineState, resultPerTarget: {
        [p: string]: ActionResultPerSquaddie
    }) {
        this._targetTextWindows = RecordingService.mostRecentEvent(state.battleOrchestratorState.battleState.recording).results.targetedBattleSquaddieIds.map((battleId: string) => {
            const {
                battleSquaddie: targetBattle,
                squaddieTemplate: targetTemplate,
            } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, battleId));

            const processedActionToShow = ActionsThisRoundService.getProcessedActionToShow(state.battleOrchestratorState.battleState.actionsThisRound);
            const processedActionEffectToShow = ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound);
            if (processedActionEffectToShow.type !== ActionEffectType.SQUADDIE) {
                return undefined;
            }

            if (processedActionEffectToShow.decidedActionEffect.type !== ActionEffectType.SQUADDIE) {
                return undefined;
            }
            const actionEffectSquaddieTemplate = processedActionEffectToShow.decidedActionEffect.template;

            const targetTextWindow = new TargetTextWindow();
            targetTextWindow.start({
                targetTemplate: targetTemplate,
                targetBattle: targetBattle,
                result: resultPerTarget[battleId],
                actionEffectSquaddieTemplate,
            });
            return targetTextWindow;
        }).filter(x => x);
    }

    private setupAnimationForTargetHitPointMeters(state: GameEngineState) {
        const mostRecentResults = RecordingService.mostRecentEvent(state.battleOrchestratorState.battleState.recording).results;
        RecordingService.mostRecentEvent(state.battleOrchestratorState.battleState.recording).results.targetedBattleSquaddieIds.forEach((battleId: string, index: number) => {
            const {
                battleSquaddie: targetBattle,
                squaddieTemplate: targetTemplate,
            } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, battleId));

            let {
                currentHitPoints: displayedHitPointsBeforeChange,
                maxHitPoints,
            } = GetHitPoints({
                battleSquaddie: targetBattle,
                squaddieTemplate: targetTemplate,
            });

            displayedHitPointsBeforeChange -= mostRecentResults.resultPerTarget[battleId].healingReceived;
            displayedHitPointsBeforeChange += mostRecentResults.resultPerTarget[battleId].damageTaken;

            this._targetHitPointMeters[battleId] = new HitPointMeter({
                currentHitPoints: displayedHitPointsBeforeChange,
                maxHitPoints,
                left: this._targetTextWindows[index].targetLabel.rectangle.area.left + WINDOW_SPACING.SPACING1,
                top: this._targetTextWindows[index].targetLabel.rectangle.area.top + 100,
                hue: HUE_BY_SQUADDIE_AFFILIATION[targetTemplate.squaddieId.affiliation]
            });
        });
    }

    private drawActionAnimation(state: BattleOrchestratorState, graphicsContext: GraphicsBuffer) {
        this.actorTextWindow.draw(graphicsContext, this.actionAnimationTimer);

        const processedActionToShow = ActionsThisRoundService.getProcessedActionToShow(state.battleState.actionsThisRound);
        const processedActionEffectToShow = ActionsThisRoundService.getProcessedActionEffectToShow(state.battleState.actionsThisRound);
        if (processedActionEffectToShow.type !== ActionEffectType.SQUADDIE) {
            return;
        }

        if (processedActionEffectToShow.decidedActionEffect.type !== ActionEffectType.SQUADDIE) {
            return;
        }
        const actionEffectSquaddieTemplate = processedActionEffectToShow.decidedActionEffect.template;

        this.actorSprite.draw({
            timer: this.actionAnimationTimer,
            graphicsContext,
            actionEffectSquaddieTemplate,
        });
        this.weaponIcon.draw({
                graphicsContext,
                actorImageArea: this.actorSprite.getSquaddieImageBasedOnTimer(
                    this.actionAnimationTimer,
                    graphicsContext,
                    actionEffectSquaddieTemplate,
                ).area,
                actionEffectSquaddieTemplate,
            }
        );
        this.targetTextWindows.forEach((t) => t.draw(graphicsContext, this.actionAnimationTimer));
        const mostRecentResults = RecordingService.mostRecentEvent(state.battleState.recording).results;
        this.targetSprites.forEach((t) => {
            t.draw(this.actionAnimationTimer, graphicsContext, actionEffectSquaddieTemplate, mostRecentResults.resultPerTarget[t.battleSquaddieId])
        });
        Object.values(this.targetHitPointMeters).forEach((t) => t.draw(graphicsContext));
    }

    private updateHitPointMeters(state: BattleOrchestratorState) {
        const mostRecentResults = RecordingService.mostRecentEvent(state.battleState.recording).results;
        RecordingService.mostRecentEvent(state.battleState.recording).results.targetedBattleSquaddieIds.forEach((battleId: string) => {
            const hitPointMeter = this.targetHitPointMeters[battleId];
            const hitPointChange: number = mostRecentResults.resultPerTarget[battleId].healingReceived - mostRecentResults.resultPerTarget[battleId].damageTaken;
            hitPointMeter.changeHitPoints(hitPointChange);
        });
    }
}
