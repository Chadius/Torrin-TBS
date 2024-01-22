import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation, OrchestratorUtilities} from "./orchestratorUtils";
import {IsSquaddieAlive} from "../../squaddie/squaddieService";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {MaybeEndSquaddieTurn} from "./battleSquaddieSelectorUtils";
import {SquaddieTargetsOtherSquaddiesAnimator} from "../animation/squaddieTargetsOtherSquaddiesAnimatior";
import {SquaddieActionAnimator} from "../animation/squaddieActionAnimator";
import {DefaultSquaddieActionAnimator} from "../animation/defaultSquaddieActionAnimator";
import {SquaddieSkipsAnimationAnimator} from "../animation/squaddieSkipsAnimationAnimator";
import {Trait} from "../../trait/traitStatusStorage";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {RecordingService} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {ActionEffect, ActionEffectType} from "../../decision/actionEffect";
import {DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {DrawSquaddieUtilities} from "../animation/drawSquaddie";

export class BattleSquaddieUsesActionOnSquaddie implements BattleOrchestratorComponent {
    private sawResultAftermath: boolean;
    private readonly _squaddieTargetsOtherSquaddiesAnimator: SquaddieTargetsOtherSquaddiesAnimator;
    private readonly _squaddieSkipsAnimationAnimator: SquaddieSkipsAnimationAnimator;

    constructor() {
        this._squaddieTargetsOtherSquaddiesAnimator = new SquaddieTargetsOtherSquaddiesAnimator();
        this._squaddieSkipsAnimationAnimator = new SquaddieSkipsAnimationAnimator();
        this.resetInternalState();
    }

    get squaddieSkipsAnimationAnimator(): SquaddieSkipsAnimationAnimator {
        return this._squaddieSkipsAnimationAnimator;
    }

    private _squaddieActionAnimator: SquaddieActionAnimator

    get squaddieActionAnimator(): SquaddieActionAnimator {
        if (this._squaddieActionAnimator === undefined) {
            this._squaddieActionAnimator = new DefaultSquaddieActionAnimator();
        }
        return this._squaddieActionAnimator;
    }

    get squaddieTargetsOtherSquaddiesAnimator(): SquaddieTargetsOtherSquaddiesAnimator {
        return this._squaddieTargetsOtherSquaddiesAnimator;
    }

    hasCompleted(state: GameEngineState): boolean {
        return this.sawResultAftermath;
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.setSquaddieActionAnimatorBasedOnAction(state.battleOrchestratorState);
            this.squaddieActionAnimator.mouseEventHappened(state, event);
        }
    }

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
            pauseTimer: true,
        });
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        OrchestratorUtilities.nextActionEffect(
            state.battleOrchestratorState,
            state.battleOrchestratorState.battleState.squaddieCurrentlyActing
        );
        const nextActionEffect = OrchestratorUtilities.peekActionEffect(
            state.battleOrchestratorState,
            state.battleOrchestratorState.battleState.squaddieCurrentlyActing
        );

        const nextMode: BattleOrchestratorMode = OrchestratorUtilities.getNextModeBasedOnActionEffect(nextActionEffect);

        return {
            nextMode,
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(state: GameEngineState): void {
        this.squaddieActionAnimator.reset(state);
        this._squaddieActionAnimator = undefined;
        this.resetInternalState();
        DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state);
        OrchestratorUtilities.drawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state);
        MaybeEndSquaddieTurn(state);
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
        if (this.squaddieActionAnimator instanceof DefaultSquaddieActionAnimator) {
            this.setSquaddieActionAnimatorBasedOnAction(state.battleOrchestratorState);
        }
        this.squaddieActionAnimator.update(state, graphicsContext);
        if (this.squaddieActionAnimator.hasCompleted(state)) {
            this.hideDeadSquaddies(state);

            const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    state.repository,
                    state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.battleSquaddieId,
                )
            )
            DrawSquaddieUtilities.highlightPlayableSquaddieReachIfTheyCanAct({
                battleSquaddie,
                squaddieTemplate,
                missionMap: state.battleOrchestratorState.battleState.missionMap,
                repository: state.repository,
                campaign: state.campaign,
            });
            DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(battleSquaddie, squaddieTemplate, state.repository);

            CurrentlySelectedSquaddieDecisionService.cancelSelectedCurrentDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing);
            OrchestratorUtilities.resetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
            this.sawResultAftermath = true;
        }
    }

    private resetInternalState() {
        this.sawResultAftermath = false;
    }

    private hideDeadSquaddies(state: GameEngineState) {
        const mostRecentResults = RecordingService.mostRecentEvent(state.battleOrchestratorState.battleState.recording).results;
        mostRecentResults.targetedBattleSquaddieIds.forEach((battleSquaddieId) => {
            const {
                battleSquaddie,
                squaddieTemplate
            } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, battleSquaddieId));
            if (!IsSquaddieAlive({battleSquaddie, squaddieTemplate})) {
                state.battleOrchestratorState.battleState.missionMap.hideSquaddieFromDrawing(battleSquaddieId);
                state.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(battleSquaddieId, undefined);
            }
        });
    }

    private setSquaddieActionAnimatorBasedOnAction(state: BattleOrchestratorState) {
        const mostRecentEvent: BattleEvent = RecordingService.mostRecentEvent(state.battleState.recording);
        if (
            mostRecentEvent === undefined
            || mostRecentEvent.instruction === undefined
            || mostRecentEvent.instruction.currentlySelectedDecision === undefined
        ) {
            this._squaddieActionAnimator = new DefaultSquaddieActionAnimator();
            return;
        }

        if (state.decisionActionEffectIterator === undefined) {
            state.decisionActionEffectIterator = DecisionActionEffectIteratorService.new({
                decision: mostRecentEvent.instruction.currentlySelectedDecision
            })
        }

        let squaddieActionEffect: ActionEffect = DecisionActionEffectIteratorService.peekActionEffect(state.decisionActionEffectIterator);
        if (squaddieActionEffect.type !== ActionEffectType.SQUADDIE) {
            return;
        }

        if (squaddieActionEffect.template.traits.booleanTraits[Trait.SKIP_ANIMATION] === true) {
            this._squaddieActionAnimator = this.squaddieSkipsAnimationAnimator;
            return;
        }

        this._squaddieActionAnimator = this.squaddieTargetsOtherSquaddiesAnimator;
    }
}
