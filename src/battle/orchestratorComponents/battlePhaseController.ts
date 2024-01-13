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
import {RectAreaService} from "../../ui/rectArea";
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
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {isValidValue} from "../../utils/validityCheck";

export const BANNER_ANIMATION_TIME = 2000;

export interface BattlePhaseState {
    currentAffiliation: BattlePhase;
    turnCount: number;
}

export const BattlePhaseStateService = {
    new: ({currentAffiliation, turnCount}: {
        currentAffiliation: BattlePhase;
        turnCount?: number;
    }): BattlePhaseState => {
        return {
            currentAffiliation,
            turnCount: isValidValue(turnCount) || turnCount === 0 ? turnCount : 0,
        }
    }
};

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
            && BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.battleOrchestratorState.squaddieRepository) !== undefined
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
            && BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.battleOrchestratorState.squaddieRepository)
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

            teamsOfCurrentAffiliation.forEach(team => BattleSquaddieTeamService.beginNewRound(team, state.battleOrchestratorState.squaddieRepository));

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
                BattleSquaddieTeamService.beginNewRound(team, state.battleOrchestratorState.squaddieRepository);
            })

            state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        }
    }

    setBannerImage(state: BattleOrchestratorState) {
        state.battleState.missionMap.terrainTileMap.stopOutlineTiles();

        const currentSquaddieAffiliation = state.battleState.battlePhaseState.currentAffiliation;
        const teams = FindTeamsOfAffiliation(
            state.battleState.teams,
            ConvertBattlePhaseToSquaddieAffiliation(currentSquaddieAffiliation),
        );

        if (teams.length > 0) {
            const teamIconResourceKey = teams[0].iconResourceKey;
            if (isValidValue(teamIconResourceKey) && teamIconResourceKey !== "") {
                this.affiliationImage = getResultOrThrowError(state.resourceHandler.getResource(teamIconResourceKey));
            }
        }

        if (
            isValidValue(state.squaddieRepository.uiElements.phaseBannersByAffiliation[currentSquaddieAffiliation])
            && state.squaddieRepository.uiElements.phaseBannersByAffiliation[currentSquaddieAffiliation] !== ""
        ) {
            this.bannerImage = getResultOrThrowError(state.resourceHandler.getResource(
                state.squaddieRepository.uiElements.phaseBannersByAffiliation[currentSquaddieAffiliation]
            ));
        }

        if (!this.bannerImage) {
            this.bannerImageUI = undefined;
            return;
        }

        this.bannerImageUI = new ImageUI({
            graphic: this.bannerImage,
            area: RectAreaService.new({
                left: 0,
                top: (ScreenDimensions.SCREEN_HEIGHT - this.bannerImage.height) / 2,
                width: this.bannerImage.width,
                height: this.bannerImage.height,
            })
        });

        this.affiliationImageUI = new ImageUI({
            graphic: this.affiliationImage,
            area: RectAreaService.new({
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
            } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, id));
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

const findFirstTeamOfAffiliationThatCanAct = (teams: BattleSquaddieTeam[], affiliation: SquaddieAffiliation, squaddieRepository: ObjectRepository): BattleSquaddieTeam => {
    const teamsOfAffiliation: BattleSquaddieTeam[] = teams.filter(team => team.affiliation === affiliation);
    if (teamsOfAffiliation.length === 0) {
        return undefined;
    }

    return teamsOfAffiliation.find(team =>
        BattleSquaddieTeamService.hasAnActingSquaddie(team, squaddieRepository)
    );
}
