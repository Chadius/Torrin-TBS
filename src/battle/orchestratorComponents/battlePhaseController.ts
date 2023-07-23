import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import p5 from "p5";
import {BattlePhase} from "./battlePhaseTracker";
import {ImageUI} from "../../ui/imageUI";
import {RectArea} from "../../ui/rectArea";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ScreenDimensions} from "../../utils/graphicsConfig";

export const BANNER_ANIMATION_TIME = 2000;

export type BattlePhaseState = {
    bannerPhaseToShow: BattlePhase;
}

export class BattlePhaseController implements OrchestratorComponent {
    bannerImage: p5.Image;
    bannerImageUI: ImageUI;
    affiliationImage: p5.Image;
    affiliationImageUI: ImageUI;
    bannerDisplayAnimationStartTime?: number;
    newBannerShown: boolean;

    constructor() {
        this.newBannerShown = false;
    }

    hasCompleted(state: OrchestratorState): boolean {
        if (!this.newBannerShown && state.battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie()) {
            return true;
        }

        if (this.bannerDisplayAnimationStartTime === undefined) {
            return false;
        }

        if (Date.now() - this.bannerDisplayAnimationStartTime < BANNER_ANIMATION_TIME) {
            return false;
        }

        return true;
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    keyEventHappened(state: OrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    update(state: OrchestratorState, p: p5): void {
        if (!this.newBannerShown && state.battlePhaseTracker.getCurrentPhase() !== BattlePhase.UNKNOWN && state.battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie()) {
            return;
        }

        if (this.bannerDisplayAnimationStartTime !== undefined && Date.now() - this.bannerDisplayAnimationStartTime < BANNER_ANIMATION_TIME) {
            this.draw(state, p);
            return;
        }

        if (state.battlePhaseTracker.getCurrentPhase() === BattlePhase.UNKNOWN || !state.battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie()) {
            const oldTeam = state.battlePhaseTracker.getCurrentTeam();
            if (oldTeam) {
                oldTeam.beginNewRound()
            }

            this.newBannerShown = true;
            state.battlePhaseTracker.advanceToNextPhase();
            this.bannerDisplayAnimationStartTime = Date.now();
            state.battlePhaseState.bannerPhaseToShow = state.battlePhaseTracker.getCurrentPhase();
            this.setBannerImage(state);

            state.camera.setXVelocity(0);
            state.camera.setYVelocity(0);

            state.battlePhaseTracker.getCurrentTeam().beginNewRound();


        }
    }

    setBannerImage(state: OrchestratorState) {
        state.hexMap?.stopOutlineTiles();

        switch (state.battlePhaseState.bannerPhaseToShow) {
            case BattlePhase.PLAYER:
                this.affiliationImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate_icon_crusaders"));
                this.bannerImage = getResultOrThrowError(state.resourceHandler.getResource("phase banner player"));
                break;
            case BattlePhase.ENEMY:
                this.affiliationImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate_icon_infiltrators"));
                this.bannerImage = getResultOrThrowError(state.resourceHandler.getResource("phase banner enemy"));
                break;
            case BattlePhase.ALLY:
                this.affiliationImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate_icon_western"));
                this.bannerImage = undefined;
                break;
            case BattlePhase.NONE:
                this.affiliationImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate_icon_none"));
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

    draw(state: OrchestratorState, p: p5): void {
        if (this.bannerImageUI) {
            this.bannerImageUI.draw(p);
            this.affiliationImageUI.draw(p);
        }
    }

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: OrchestratorState) {
        this.bannerImage = undefined;
        this.bannerImageUI = undefined;
        this.affiliationImage = undefined;
        this.affiliationImageUI = undefined;
        this.bannerDisplayAnimationStartTime = undefined;
        this.newBannerShown = false;
    }
}
