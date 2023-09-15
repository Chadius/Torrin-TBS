import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattlePhase} from "./battlePhaseTracker";
import {ImageUI} from "../../ui/imageUI";
import {RectArea} from "../../ui/rectArea";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicImage, GraphicsContext} from "../../utils/graphics/graphicsContext";

export const BANNER_ANIMATION_TIME = 2000;

export type BattlePhaseState = {
    bannerPhaseToShow: BattlePhase;
}

export class BattlePhaseController implements BattleOrchestratorComponent {
    bannerImage: GraphicImage;
    bannerImageUI: ImageUI;
    affiliationImage: GraphicImage;
    affiliationImageUI: ImageUI;
    bannerDisplayAnimationStartTime?: number;
    newBannerShown: boolean;

    constructor() {
        this.newBannerShown = false;
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
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

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
        });
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        if (!this.newBannerShown && state.battlePhaseTracker.getCurrentPhase() !== BattlePhase.UNKNOWN && state.battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie()) {
            return;
        }

        if (this.bannerDisplayAnimationStartTime !== undefined && Date.now() - this.bannerDisplayAnimationStartTime < BANNER_ANIMATION_TIME) {
            this.draw(state, graphicsContext);
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

            state.hexMap.stopHighlightingTiles();
        }
    }

    setBannerImage(state: BattleOrchestratorState) {
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

    draw(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        if (this.bannerImageUI) {
            this.bannerImageUI.draw(graphicsContext);
            this.affiliationImageUI.draw(graphicsContext);
        }
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: BattleOrchestratorState) {
        this.bannerImage = undefined;
        this.bannerImageUI = undefined;
        this.affiliationImage = undefined;
        this.affiliationImageUI = undefined;
        this.bannerDisplayAnimationStartTime = undefined;
        this.newBannerShown = false;
    }
}
