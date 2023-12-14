import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {
    AdvanceToNextPhase,
    BattlePhase,
    ConvertBattlePhaseToSquaddieAffiliation,
    FindTeamsOfAffiliation
} from "./battlePhaseTracker";
import {ImageUI} from "../../ui/imageUI";
import {RectAreaHelper} from "../../ui/rectArea";
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
import {BattleSquaddieTeam, BattleSquaddieTeamHelper} from "../battleSquaddieTeam";
import {BattleStateHelper} from "../orchestrator/battleState";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";

export const BANNER_ANIMATION_TIME = 2000;

export interface BattlePhaseState {
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

    hasCompleted(state: GameEngineState): boolean {
        if (!this.newBannerShown
            && BattleStateHelper.getCurrentTeam(state.battleOrchestratorState.battleState, state.battleOrchestratorState.squaddieRepository) !== undefined
        ) {
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

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
    }

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
        });
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
        if (!this.newBannerShown
            && state.battleOrchestratorState.battleState.battlePhaseState.currentAffiliation !== BattlePhase.UNKNOWN
            && BattleStateHelper.getCurrentTeam(state.battleOrchestratorState.battleState, state.battleOrchestratorState.squaddieRepository)
        ) {
            return;
        }

        if (this.bannerDisplayAnimationStartTime !== undefined && Date.now() - this.bannerDisplayAnimationStartTime < BANNER_ANIMATION_TIME) {
            this.draw(state.battleOrchestratorState, graphicsContext);
            return;
        }

        const phaseIsComplete: boolean = findFirstTeamOfAffiliationThatCanAct(
            state.battleOrchestratorState.battleState.teams,
            ConvertBattlePhaseToSquaddieAffiliation(state.battleOrchestratorState.battleState.battlePhaseState.currentAffiliation),
            state.battleOrchestratorState.squaddieRepository,
        ) === undefined;

        if (state.battleOrchestratorState.battleState.battlePhaseState.currentAffiliation === BattlePhase.UNKNOWN
            || phaseIsComplete
        ) {
            const teamsOfCurrentAffiliation: BattleSquaddieTeam[] = state.battleOrchestratorState.battleState.teams.filter(team =>
                team.affiliation === ConvertBattlePhaseToSquaddieAffiliation(state.battleOrchestratorState.battleState.battlePhaseState.currentAffiliation)
            );

            teamsOfCurrentAffiliation.forEach(team => BattleSquaddieTeamHelper.beginNewRound(team, state.battleOrchestratorState.squaddieRepository));

            this.newBannerShown = true;
            AdvanceToNextPhase(state.battleOrchestratorState.battleState.battlePhaseState, state.battleOrchestratorState.battleState.teams);
            this.bannerDisplayAnimationStartTime = Date.now();
            this.setBannerImage(state.battleOrchestratorState);

            state.battleOrchestratorState.battleState.camera.setXVelocity(0);
            state.battleOrchestratorState.battleState.camera.setYVelocity(0);

            this.panToControllablePlayerSquaddieIfPlayerPhase(state.battleOrchestratorState);

            FindTeamsOfAffiliation(
                state.battleOrchestratorState.battleState.teams,
                ConvertBattlePhaseToSquaddieAffiliation(state.battleOrchestratorState.battleState.battlePhaseState.currentAffiliation),
            ).forEach(team => {
                BattleSquaddieTeamHelper.beginNewRound(team, state.battleOrchestratorState.squaddieRepository);
            })

            state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        }
    }

    setBannerImage(state: BattleOrchestratorState) {
        state.battleState.missionMap.terrainTileMap.stopOutlineTiles();

        switch (state.battleState.battlePhaseState.currentAffiliation) {
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
            area: RectAreaHelper.new({
                left: 0,
                top: (ScreenDimensions.SCREEN_HEIGHT - this.bannerImage.height) / 2,
                width: this.bannerImage.width,
                height: this.bannerImage.height,
            })
        });

        this.affiliationImageUI = new ImageUI({
            graphic: this.affiliationImage,
            area: RectAreaHelper.new({
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

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: GameEngineState) {
        this.bannerImage = undefined;
        this.bannerImageUI = undefined;
        this.affiliationImage = undefined;
        this.affiliationImageUI = undefined;
        this.bannerDisplayAnimationStartTime = undefined;
        this.newBannerShown = false;
    }

    private panToControllablePlayerSquaddieIfPlayerPhase(state: BattleOrchestratorState) {
        if (state.battleState.battlePhaseState.currentAffiliation !== BattlePhase.PLAYER) {
            return;
        }

        const playerTeam: BattleSquaddieTeam = FindTeamsOfAffiliation(state.battleState.teams, SquaddieAffiliation.PLAYER)[0];
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

        const mapDatum = state.battleState.missionMap.getSquaddieByBattleId(squaddieToPanToBattleId);
        if (MissionMapSquaddieLocationHandler.isValid(mapDatum)) {
            const squaddieScreenLocation = convertMapCoordinatesToScreenCoordinates(
                mapDatum.mapLocation.q,
                mapDatum.mapLocation.r,
                ...state.battleState.camera.getCoordinates()
            );
            if (isCoordinateOnScreen(...squaddieScreenLocation)) {
                return;
            }

            const squaddieWorldLocation = convertMapCoordinatesToWorldCoordinates(mapDatum.mapLocation.q, mapDatum.mapLocation.r);
            state.battleState.camera.pan({
                xDestination: squaddieWorldLocation[0],
                yDestination: squaddieWorldLocation[1],
                timeToPan: BANNER_ANIMATION_TIME - 500,
                respectConstraints: true,
            });
            return;
        }
    }
}

const findFirstTeamOfAffiliationThatCanAct = (teams: BattleSquaddieTeam[], affiliation: SquaddieAffiliation, squaddieRepository: BattleSquaddieRepository): BattleSquaddieTeam => {
    const teamsOfAffiliation: BattleSquaddieTeam[] = teams.filter(team => team.affiliation === affiliation);
    if (teamsOfAffiliation.length === 0) {
        return undefined;
    }

    return teamsOfAffiliation.find(team =>
        BattleSquaddieTeamHelper.hasAnActingSquaddie(team, squaddieRepository)
    );
}
