import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {AdvanceToNextPhase, BattlePhase} from "./battlePhaseTracker";
import {ImageUI} from "../../ui/imageUI";
import {RectArea} from "../../ui/rectArea";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {isCoordinateOnScreen, ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicImage, GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CanPlayerControlSquaddieRightNow} from "../../squaddie/squaddieService";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates
} from "../../hexMap/convertCoordinates";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";

export const BANNER_ANIMATION_TIME = 2000;

export type BattlePhaseState = {
    currentAffiliation: BattlePhase;
    turnCount: number;
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
        if (!this.newBannerShown && state.getCurrentTeam().hasAnActingSquaddie()) {
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
        if (!this.newBannerShown
            && state.battlePhaseState.currentAffiliation !== BattlePhase.UNKNOWN
            && state.getCurrentTeam().hasAnActingSquaddie()
        ) {
            return;
        }

        if (this.bannerDisplayAnimationStartTime !== undefined && Date.now() - this.bannerDisplayAnimationStartTime < BANNER_ANIMATION_TIME) {
            this.draw(state, graphicsContext);
            return;
        }

        if (state.battlePhaseState.currentAffiliation === BattlePhase.UNKNOWN
            || !state.getCurrentTeam().hasAnActingSquaddie()
        ) {
            const oldTeam = state.getCurrentTeam();
            if (oldTeam) {
                oldTeam.beginNewRound()
            }

            this.newBannerShown = true;
            AdvanceToNextPhase(state.battlePhaseState, state.teamsByAffiliation);
            this.bannerDisplayAnimationStartTime = Date.now();
            this.setBannerImage(state);

            state.camera.setXVelocity(0);
            state.camera.setYVelocity(0);

            this.panToControllablePlayerSquaddieIfPlayerPhase(state);

            state.getCurrentTeam().beginNewRound();

            state.hexMap.stopHighlightingTiles();
        }
    }

    setBannerImage(state: BattleOrchestratorState) {
        state.hexMap?.stopOutlineTiles();

        switch (state.battlePhaseState.currentAffiliation) {
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

    private panToControllablePlayerSquaddieIfPlayerPhase(state: BattleOrchestratorState) {
        if (state.battlePhaseState.currentAffiliation !== BattlePhase.PLAYER) {
            return;
        }

        const playerTeam = state.teamsByAffiliation[SquaddieAffiliation.PLAYER];
        let squaddieToPanToBattleId = playerTeam.battleSquaddieIds.find((id) => {
            const {
                squaddieTemplate,
                battleSquaddie
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(id));
            const {
                playerCanControlThisSquaddieRightNow,
            } = CanPlayerControlSquaddieRightNow({battleSquaddie, squaddieTemplate});

            return playerCanControlThisSquaddieRightNow;
        });

        if (squaddieToPanToBattleId === undefined) {
            return;
        }

        const mapDatum = state.missionMap.getSquaddieByBattleId(squaddieToPanToBattleId);
        if (MissionMapSquaddieLocationHandler.isValid(mapDatum)) {
            const squaddieScreenLocation = convertMapCoordinatesToScreenCoordinates(
                mapDatum.mapLocation.q,
                mapDatum.mapLocation.r,
                ...state.camera.getCoordinates()
            );
            if (isCoordinateOnScreen(...squaddieScreenLocation)) {
                return;
            }

            const squaddieWorldLocation = convertMapCoordinatesToWorldCoordinates(mapDatum.mapLocation.q, mapDatum.mapLocation.r);
            state.camera.pan({
                xDestination: squaddieWorldLocation[0],
                yDestination: squaddieWorldLocation[1],
                timeToPan: BANNER_ANIMATION_TIME - 500,
                respectConstraints: true,
            });
            return;
        }
    }
}
