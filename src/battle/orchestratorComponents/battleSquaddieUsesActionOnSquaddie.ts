import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {
    DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation,
    DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation
} from "./orchestratorUtils";
import {IsSquaddieAlive} from "../../squaddie/squaddieService";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {MaybeEndSquaddieTurn} from "./battleSquaddieSelectorUtils";
import {SquaddieTargetsOtherSquaddiesAnimator} from "../animation/squaddieTargetsOtherSquaddiesAnimatior";
import {SquaddieActionAnimator} from "../animation/squaddieActionAnimator";
import {DefaultSquaddieActionAnimator} from "../animation/defaultSquaddieActionAnimator";
import {SquaddieSkipsAnimationAnimator} from "../animation/squaddieSkipsAnimationAnimator";
import {Trait} from "../../trait/traitStatusStorage";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {RecordingHandler} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryHelper} from "../objectRepository";

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
            this.squaddieActionAnimator.mouseEventHappened(state.battleOrchestratorState, event);
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
        return {
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(state: GameEngineState): void {
        this.squaddieActionAnimator.reset(state.battleOrchestratorState);
        this._squaddieActionAnimator = undefined;
        this.resetInternalState();
        DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state.battleOrchestratorState);
        DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state.battleOrchestratorState);
        MaybeEndSquaddieTurn(state.battleOrchestratorState);
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
        if (this.squaddieActionAnimator instanceof DefaultSquaddieActionAnimator) {
            this.setSquaddieActionAnimatorBasedOnAction(state.battleOrchestratorState);
        }
        this.squaddieActionAnimator.update(state.battleOrchestratorState, graphicsContext);
        if (this.squaddieActionAnimator.hasCompleted(state.battleOrchestratorState)) {
            this.hideDeadSquaddies(state.battleOrchestratorState);
            this.sawResultAftermath = true;
        }
    }

    private resetInternalState() {
        this.sawResultAftermath = false;
    }

    private hideDeadSquaddies(state: BattleOrchestratorState) {
        const mostRecentResults = RecordingHandler.mostRecentEvent(state.battleState.recording).results;
        mostRecentResults.targetedBattleSquaddieIds.forEach((battleSquaddieId) => {
            const {
                battleSquaddie,
                squaddieTemplate
            } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(state.squaddieRepository, battleSquaddieId));
            if (!IsSquaddieAlive({battleSquaddie, squaddieTemplate})) {
                state.battleState.missionMap.hideSquaddieFromDrawing(battleSquaddieId);
                state.battleState.missionMap.updateSquaddieLocation(battleSquaddieId, undefined);
            }
        });
    }

    private setSquaddieActionAnimatorBasedOnAction(state: BattleOrchestratorState) {
        const mostRecentEvent: BattleEvent = RecordingHandler.mostRecentEvent(state.battleState.recording);
        if (
            mostRecentEvent === undefined
            || mostRecentEvent.instruction === undefined
            || mostRecentEvent.instruction.currentlySelectedAction === undefined
        ) {
            this._squaddieActionAnimator = new DefaultSquaddieActionAnimator();
            return;
        }

        if (mostRecentEvent.instruction.currentlySelectedAction.traits.booleanTraits[Trait.SKIP_ANIMATION] === true) {
            this._squaddieActionAnimator = this.squaddieSkipsAnimationAnimator;
            return;
        }

        this._squaddieActionAnimator = this.squaddieTargetsOtherSquaddiesAnimator;
    }
}
