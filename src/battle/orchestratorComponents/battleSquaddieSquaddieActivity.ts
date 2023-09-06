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
import {IsSquaddieAlive} from "../../squaddie/squaddieService";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {MaybeEndSquaddieTurn} from "./battleSquaddieSelectorUtils";
import {SquaddieTargetsOtherSquaddiesAnimator} from "../animation/squaddieTargetsOtherSquaddiesAnimatior";
import {SquaddieActionAnimator} from "../animation/squaddieActionAnimator";

export class BattleSquaddieSquaddieActivity implements BattleOrchestratorComponent {
    get squaddieActionAnimator(): SquaddieActionAnimator {
        return this._squaddieActionAnimator;
    }
    private sawResultAftermath: boolean;
    private readonly _squaddieTargetsOtherSquaddiesAnimator: SquaddieTargetsOtherSquaddiesAnimator;
    private _squaddieActionAnimator: SquaddieActionAnimator

    constructor() {
        this._squaddieTargetsOtherSquaddiesAnimator = new SquaddieTargetsOtherSquaddiesAnimator();
        this.resetInternalState();
    }

    get squaddieTargetsOtherSquaddiesAnimator(): SquaddieTargetsOtherSquaddiesAnimator {
        return this._squaddieTargetsOtherSquaddiesAnimator;
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return this.sawResultAftermath;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.setSquaddieActionAnimatorBasedOnActivity(state);
            this.squaddieActionAnimator.mouseEventHappened(state, event);
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
        this.squaddieActionAnimator.reset(state);
        this._squaddieActionAnimator = undefined;
        this.resetInternalState();
        DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state);
        DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state);
        MaybeEndSquaddieTurn(state);
    }

    update(state: BattleOrchestratorState, p: p5): void {
        if (this.squaddieActionAnimator === undefined) {
            this.setSquaddieActionAnimatorBasedOnActivity(state);
        }
        this.squaddieActionAnimator.update(state, p);
        if (this.squaddieActionAnimator.hasCompleted(state)) {
            this.hideDeadSquaddies(state);
            this.sawResultAftermath = true;
        }
    }

    private resetInternalState() {
        this.sawResultAftermath = false;
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

    private setSquaddieActionAnimatorBasedOnActivity(state: BattleOrchestratorState) {
        this._squaddieActionAnimator = this.squaddieTargetsOtherSquaddiesAnimator;
    }
}
