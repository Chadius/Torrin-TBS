import {OrchestratorComponent, OrchestratorComponentMouseEvent} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import p5 from "p5";
import {BattlePhase} from "./battlePhaseTracker";
import {ImageUI} from "../../ui/imageUI";
import {RectArea} from "../../ui/rectArea";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ScreenDimensions} from "../../utils/graphicsConfig";

export const BANNER_ANIMATION_TIME = 2000;

export type BattlePhaseState = {
    bannerDisplayAnimationStartTime?: number;
    bannerPhaseToShow: BattlePhase;
}

export class BattlePhaseController implements OrchestratorComponent {
    bannerImage: p5.Image;
    bannerImageUI: ImageUI;
    affiliationImage: p5.Image;
    affiliationImageUI: ImageUI;

    hasCompleted(state: OrchestratorState): boolean {
        if (state.battlePhaseState.bannerDisplayAnimationStartTime === undefined) {
            return false;
        }

        if (Date.now() - state.battlePhaseState.bannerDisplayAnimationStartTime < BANNER_ANIMATION_TIME) {
            return false;
        }

        return true;
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    update(state: OrchestratorState, p?: p5): void {
        if (state.battlePhaseState.bannerDisplayAnimationStartTime !== undefined && Date.now() - state.battlePhaseState.bannerDisplayAnimationStartTime < BANNER_ANIMATION_TIME) {
            this.draw(state, p);
            return;
        }

        if (state.battlePhaseState.bannerDisplayAnimationStartTime === undefined) {
            state.battlePhaseState.bannerDisplayAnimationStartTime = Date.now();
            state.battlePhaseState.bannerPhaseToShow = state.battlePhaseTracker.getCurrentPhase();
            this.setBannerImage(state, p);
            return;
        }

        if (!state.battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie()) {
            state.battlePhaseState.bannerDisplayAnimationStartTime = Date.now();
            state.battlePhaseTracker.advanceToNextPhase();
            state.battlePhaseState.bannerPhaseToShow = state.battlePhaseTracker.getCurrentPhase();
            this.setBannerImage(state, p);
        }
    }

    setBannerImage(state: OrchestratorState, p?: p5) {
        if (!p) {
            return;
        }

        switch (state.battlePhaseState.bannerPhaseToShow) {
            case BattlePhase.PLAYER:
                this.affiliationImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate icon crusaders"));
                this.bannerImage = getResultOrThrowError(state.resourceHandler.getResource("phase banner player"));
                break;
            case BattlePhase.ENEMY:
                this.affiliationImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate icon infiltrators"));
                this.bannerImage = getResultOrThrowError(state.resourceHandler.getResource("phase banner enemy"));
                break;
            case BattlePhase.ALLY:
                this.affiliationImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate icon western"));
                this.bannerImage = undefined;
                break;
            case BattlePhase.NONE:
                this.affiliationImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate icon none"));
                this.bannerImage = undefined;
                break;
            default:
                this.affiliationImage = undefined;
                this.bannerImage = undefined;
                break;
        }

        if (!this.bannerImage) {
            this.bannerImageUI = undefined;
            return;
        }

        this.bannerImageUI = new ImageUI({
            graphic: this.bannerImage,
            area: new RectArea({
                left: 0,
                top: (ScreenDimensions.SCREEN_HEIGHT - this.bannerImage.height) / 2,
                width: this.bannerImage.width,
                height: this.bannerImage.height,
            })
        });

        this.affiliationImageUI = new ImageUI({
            graphic: this.affiliationImage,
            area: new RectArea({
                startColumn: 1,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                top: (ScreenDimensions.SCREEN_HEIGHT - this.affiliationImage.height) / 2,
                width: this.affiliationImage.width,
                height: this.affiliationImage.height,
            })
        });
    }

    draw(state: OrchestratorState, p?: p5): void {
        if (this.bannerImageUI) {
            this.bannerImageUI.draw(p);
            this.affiliationImageUI.draw(p);
        }
    }
}