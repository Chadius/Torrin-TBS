import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import {
    BattlePhase,
    BattlePhaseService,
    TBattlePhase,
} from "./battlePhaseTracker"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    BattleUISettings,
    BattleUISettingsService,
} from "../orchestrator/uiSettings/uiSettings"
import { TSquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { BattleStateService } from "../battleState/battleState"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import p5 from "p5"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ImageUI, ImageUILoadingBehavior } from "../../ui/imageUI/imageUI"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"
import {
    ResourceRepository,
    ResourceRepositoryService,
} from "../../resource/resourceRepository"

export const BANNER_ANIMATION_TIME = 2000

export interface BattlePhaseState {
    battlePhase: TBattlePhase
    turnCount: number
}

export const BattlePhaseStateService = {
    new: ({
        currentAffiliation,
        turnCount,
    }: {
        currentAffiliation: TBattlePhase
        turnCount?: number
    }): BattlePhaseState => {
        return {
            battlePhase: currentAffiliation,
            turnCount:
                turnCount != undefined || turnCount === 0 ? turnCount : 0,
        }
    },
}

export class BattlePhaseController implements BattleOrchestratorComponent {
    bannerImage: p5.Image | undefined
    bannerImageUI: ImageUI | undefined
    affiliationImage: p5.Image | undefined
    affiliationImageUI: ImageUI | undefined
    bannerDisplayAnimationStartTime?: number
    newBannerShown: boolean

    constructor() {
        this.newBannerShown = false
    }

    hasCompleted(gameEngineState: GameEngineState): boolean {
        if (gameEngineState.repository == undefined) return true
        if (
            !this.newBannerShown &&
            BattleStateService.getCurrentTeam(
                gameEngineState.battleOrchestratorState.battleState,
                gameEngineState.repository
            ) !== undefined
        ) {
            return true
        }

        if (this.bannerDisplayAnimationStartTime === undefined) {
            return false
        }

        return (
            Date.now() - this.bannerDisplayAnimationStartTime >=
            BANNER_ANIMATION_TIME
        )
    }

    mouseEventHappened(
        _state: GameEngineState,
        _event: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    keyEventHappened(
        _state: GameEngineState,
        _event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    uiControlSettings(_: GameEngineState): BattleUISettings {
        return BattleUISettingsService.new({
            letMouseScrollCamera: false,
            displayBattleMap: true,
            displayPlayerHUD: false,
        })
    }

    update({ gameEngineState }: { gameEngineState: GameEngineState }): void {
        if (this.isTeamStillActingAndNoBannerToShow(gameEngineState)) {
            return
        }

        if (this.shouldDrawPhaseBanner()) return

        if (!this.shouldPhaseEnd(gameEngineState)) {
            return
        }

        this.advanceToNextPhaseAndShowTeamBanner(gameEngineState)

        if (
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .battlePhase === BattlePhase.PLAYER
        ) {
            this.selectFirstControllablePlayerSquaddie(gameEngineState)
        }
    }

    private selectFirstControllablePlayerSquaddie(
        gameEngineState: GameEngineState
    ) {
        if (gameEngineState.repository == undefined) return
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.STARTED_PLAYER_PHASE,
            repository: gameEngineState.repository,
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            teams: gameEngineState.battleOrchestratorState.battleState.teams,
            fileAccessHUD:
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
        })

        const playerTeam = BattleStateService.getCurrentTeam(
            gameEngineState.battleOrchestratorState.battleState,
            gameEngineState.repository
        )
        if (playerTeam == undefined) return
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            repository: gameEngineState.repository,
            battleHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState,
            battleState: gameEngineState.battleOrchestratorState.battleState,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            cache: gameEngineState.battleOrchestratorState.cache,
            campaignResources: gameEngineState.campaign.resources,
            battleSquaddieSelectedId:
                BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(
                    playerTeam,
                    gameEngineState.repository
                )[0],
        })
    }

    private advanceToNextPhaseAndShowTeamBanner(
        gameEngineState: GameEngineState
    ) {
        if (gameEngineState.repository == undefined) return
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.SQUADDIE_PHASE_ENDS,
            repository: gameEngineState.repository,
            teams: gameEngineState.battleOrchestratorState.battleState.teams,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            phase: gameEngineState.battleOrchestratorState.battleState
                .battlePhaseState.battlePhase,
        })

        BattlePhaseService.AdvanceToNextPhase(
            gameEngineState.battleOrchestratorState.battleState
                .battlePhaseState,
            gameEngineState.battleOrchestratorState.battleState.teams
        )

        this.newBannerShown = true
        this.bannerDisplayAnimationStartTime = Date.now()
        this.setBannerImage(gameEngineState)

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
            repository: gameEngineState.repository,
            battleState: gameEngineState.battleOrchestratorState.battleState,
            teams: gameEngineState.battleOrchestratorState.battleState.teams,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
            phase: gameEngineState.battleOrchestratorState.battleState
                .battlePhaseState.battlePhase,
        })
    }

    private shouldPhaseEnd(gameEngineState: GameEngineState): boolean {
        if (
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .battlePhase === BattlePhase.UNKNOWN
        )
            return true
        if (gameEngineState.repository == undefined) return true

        return (
            findFirstTeamOfAffiliationThatCanAct(
                gameEngineState.battleOrchestratorState.battleState.teams,
                BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(
                    gameEngineState.battleOrchestratorState.battleState
                        .battlePhaseState.battlePhase
                ),
                gameEngineState.repository
            ) === undefined
        )
    }

    private shouldDrawPhaseBanner() {
        return (
            this.bannerDisplayAnimationStartTime !== undefined &&
            Date.now() - this.bannerDisplayAnimationStartTime <
                BANNER_ANIMATION_TIME
        )
    }

    private isTeamStillActingAndNoBannerToShow(
        gameEngineState: GameEngineState
    ) {
        if (gameEngineState.repository == undefined) return false
        return (
            !this.newBannerShown &&
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .battlePhase !== BattlePhase.UNKNOWN &&
            BattleStateService.getCurrentTeam(
                gameEngineState.battleOrchestratorState.battleState,
                gameEngineState.repository
            )
        )
    }

    setBannerImage(state: GameEngineState) {
        TerrainTileMapService.stopOutlineTiles(
            state.battleOrchestratorState.battleState.missionMap.terrainTileMap
        )

        const battlePhase =
            state.battleOrchestratorState.battleState.battlePhaseState
                .battlePhase
        const teams = BattlePhaseService.findTeamsOfAffiliation(
            state.battleOrchestratorState.battleState.teams,
            BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(
                battlePhase
            )
        )

        if (teams.length > 0) {
            const teamIconResourceKey = teams[0].iconResourceKey
            if (
                teamIconResourceKey != undefined &&
                teamIconResourceKey !== "" &&
                state.resourceRepository != undefined
            ) {
                this.affiliationImage = ResourceRepositoryService.getImage({
                    resourceRepository: state.resourceRepository,
                    key: teamIconResourceKey,
                })
            }
        }

        if (
            state.resourceRepository != undefined &&
            state.repository != undefined
        ) {
            let bannerResourceKey =
                ObjectRepositoryService.getPhaseBannerForAffiliation(
                    state.repository,
                    battlePhase
                )
            if (bannerResourceKey && state.resourceRepository != undefined)
                this.bannerImage = ResourceRepositoryService.getImage({
                    resourceRepository: state.resourceRepository,
                    key: bannerResourceKey,
                })
        }

        if (!this.bannerImage) {
            this.bannerImageUI = undefined
            return
        }

        this.bannerImageUI = new ImageUI({
            imageLoadingBehavior: {
                resourceKey: undefined,
                loadingBehavior: ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
            },
            graphic: this.bannerImage,
            area: RectAreaService.new({
                left: 0,
                top:
                    (ScreenDimensions.SCREEN_HEIGHT - this.bannerImage.height) /
                    2,
                width: this.bannerImage.width,
                height: this.bannerImage.height,
            }),
        })

        if (this.affiliationImage == undefined) return
        this.affiliationImageUI = new ImageUI({
            imageLoadingBehavior: {
                resourceKey: undefined,
                loadingBehavior: ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
            },
            graphic: this.affiliationImage,
            area: RectAreaService.new({
                startColumn: 1,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                top:
                    (ScreenDimensions.SCREEN_HEIGHT -
                        this.affiliationImage.height) /
                    2,
                width: this.affiliationImage.width,
                height: this.affiliationImage.height,
            }),
        })
    }

    draw({
        gameEngineState,
        graphics,
    }: {
        gameEngineState: GameEngineState
        graphics: GraphicsBuffer
    }): ResourceRepository | undefined {
        if (this.isTeamStillActingAndNoBannerToShow(gameEngineState)) {
            return gameEngineState.resourceRepository
        }

        if (!this.shouldDrawPhaseBanner())
            return gameEngineState.resourceRepository

        if (this.bannerImageUI && gameEngineState.resourceRepository) {
            this.bannerImageUI.draw({
                graphicsContext: graphics,
                resourceRepository: gameEngineState.resourceRepository,
            })
            if (this.affiliationImageUI)
                this.affiliationImageUI.draw({
                    graphicsContext: graphics,
                    resourceRepository: gameEngineState.resourceRepository,
                })
        }
        return gameEngineState.resourceRepository
    }

    recommendStateChanges(
        _: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return {}
    }

    reset(_: GameEngineState) {
        this.bannerImage = undefined
        this.bannerImageUI = undefined
        this.affiliationImage = undefined
        this.affiliationImageUI = undefined
        this.bannerDisplayAnimationStartTime = undefined
        this.newBannerShown = false
    }
}

const findFirstTeamOfAffiliationThatCanAct = (
    teams: BattleSquaddieTeam[],
    affiliation: TSquaddieAffiliation,
    squaddieRepository: ObjectRepository
): BattleSquaddieTeam | undefined => {
    const teamsOfAffiliation: BattleSquaddieTeam[] = teams.filter(
        (team) => team.affiliation === affiliation
    )
    if (teamsOfAffiliation.length === 0) {
        return undefined
    }

    return teamsOfAffiliation.find((team) =>
        BattleSquaddieTeamService.hasAnActingSquaddie(team, squaddieRepository)
    )
}
