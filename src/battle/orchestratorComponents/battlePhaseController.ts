import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
} from "../orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { BattlePhase, BattlePhaseService } from "./battlePhaseTracker"
import { ImageUI } from "../../ui/imageUI"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { BattleStateService } from "../orchestrator/battleState"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepository } from "../objectRepository"
import { isValidValue } from "../../utils/validityCheck"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import p5 from "p5"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"

export const BANNER_ANIMATION_TIME = 2000

export interface BattlePhaseState {
    currentAffiliation: BattlePhase
    turnCount: number
}

export const BattlePhaseStateService = {
    new: ({
        currentAffiliation,
        turnCount,
    }: {
        currentAffiliation: BattlePhase
        turnCount?: number
    }): BattlePhaseState => {
        return {
            currentAffiliation,
            turnCount:
                isValidValue(turnCount) || turnCount === 0 ? turnCount : 0,
        }
    },
}

export class BattlePhaseController implements BattleOrchestratorComponent {
    bannerImage: p5.Image
    bannerImageUI: ImageUI
    affiliationImage: p5.Image
    affiliationImageUI: ImageUI
    bannerDisplayAnimationStartTime?: number
    newBannerShown: boolean

    constructor() {
        this.newBannerShown = false
    }

    hasCompleted(state: GameEngineState): boolean {
        if (
            !this.newBannerShown &&
            BattleStateService.getCurrentTeam(
                state.battleOrchestratorState.battleState,
                state.repository
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
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        // Required by inheritance
    }

    keyEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
        })
    }

    update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ): void {
        if (
            !this.newBannerShown &&
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation !== BattlePhase.UNKNOWN &&
            BattleStateService.getCurrentTeam(
                gameEngineState.battleOrchestratorState.battleState,
                gameEngineState.repository
            )
        ) {
            return
        }

        if (
            this.bannerDisplayAnimationStartTime !== undefined &&
            Date.now() - this.bannerDisplayAnimationStartTime <
                BANNER_ANIMATION_TIME
        ) {
            this.draw(gameEngineState.battleOrchestratorState, graphicsContext)
            return
        }

        const phaseIsComplete: boolean =
            findFirstTeamOfAffiliationThatCanAct(
                gameEngineState.battleOrchestratorState.battleState.teams,
                BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(
                    gameEngineState.battleOrchestratorState.battleState
                        .battlePhaseState.currentAffiliation
                ),
                gameEngineState.repository
            ) === undefined

        if (
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation === BattlePhase.UNKNOWN ||
            phaseIsComplete
        ) {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_PHASE_ENDS,
                gameEngineState: gameEngineState,
                phase: gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState.currentAffiliation,
            })

            this.newBannerShown = true
            BattlePhaseService.AdvanceToNextPhase(
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState,
                gameEngineState.battleOrchestratorState.battleState.teams
            )
            this.bannerDisplayAnimationStartTime = Date.now()
            this.setBannerImage(gameEngineState)

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
                gameEngineState: gameEngineState,
                phase: gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState.currentAffiliation,
            })

            if (
                gameEngineState.battleOrchestratorState.battleState
                    .battlePhaseState.currentAffiliation === BattlePhase.PLAYER
            ) {
                gameEngineState.messageBoard.sendMessage({
                    type: MessageBoardMessageType.STARTED_PLAYER_PHASE,
                    gameEngineState,
                })
            }
        }
    }

    setBannerImage(state: GameEngineState) {
        TerrainTileMapService.stopOutlineTiles(
            state.battleOrchestratorState.battleState.missionMap.terrainTileMap
        )

        const currentSquaddieAffiliation =
            state.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation
        const teams = BattlePhaseService.findTeamsOfAffiliation(
            state.battleOrchestratorState.battleState.teams,
            BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(
                currentSquaddieAffiliation
            )
        )

        if (teams.length > 0) {
            const teamIconResourceKey = teams[0].iconResourceKey
            if (
                isValidValue(teamIconResourceKey) &&
                teamIconResourceKey !== ""
            ) {
                this.affiliationImage =
                    state.resourceHandler.getResource(teamIconResourceKey)
            }
        }

        if (
            isValidValue(
                state.repository.uiElements.phaseBannersByAffiliation[
                    currentSquaddieAffiliation
                ]
            ) &&
            state.repository.uiElements.phaseBannersByAffiliation[
                currentSquaddieAffiliation
            ] !== ""
        ) {
            this.bannerImage = state.resourceHandler.getResource(
                state.repository.uiElements.phaseBannersByAffiliation[
                    currentSquaddieAffiliation
                ]
            )
        }

        if (!this.bannerImage) {
            this.bannerImageUI = undefined
            return
        }

        this.bannerImageUI = new ImageUI({
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

        this.affiliationImageUI = new ImageUI({
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

    draw(
        state: BattleOrchestratorState,
        graphicsContext: GraphicsBuffer
    ): void {
        if (this.bannerImageUI) {
            this.bannerImageUI.draw(graphicsContext)
            this.affiliationImageUI.draw(graphicsContext)
        }
    }

    recommendStateChanges(
        state: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: GameEngineState) {
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
    affiliation: SquaddieAffiliation,
    squaddieRepository: ObjectRepository
): BattleSquaddieTeam => {
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
