import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import {
    ConvertCoordinateService,
    convertMapCoordinatesToScreenCoordinates,
    convertScreenCoordinatesToMapCoordinates,
} from "../../hexMap/convertCoordinates"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { BattleSquaddieSelectorService } from "./battleSquaddieSelectorUtils"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SearchParametersHelper } from "../../hexMap/pathfinder/searchParams"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    GetTargetingShapeGenerator,
    TargetingShape,
} from "../targeting/targetingShapeGenerator"
import {
    MissionMapSquaddieLocation,
    MissionMapSquaddieLocationHandler,
} from "../../missionMap/squaddieLocation"
import { BattleStateService } from "../orchestrator/battleState"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderHelper } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { MapHighlightHelper } from "../animation/mapHighlight"
import { BattleSquaddie } from "../battleSquaddie"
import { isValidValue } from "../../utils/validityCheck"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import {
    ProcessedAction,
    ProcessedActionService,
} from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { RecordingService } from "../history/recording"
import { BattleEventService } from "../history/battleEvent"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { MissionMapService } from "../../missionMap/missionMap"
import { LocationTraveled } from "../../hexMap/pathfinder/locationTraveled"
import { SquaddieTurnService } from "../../squaddie/turn"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { KeyButtonName, KeyWasPressed } from "../../utils/keyboardConfig"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { FileAccessHUDService } from "../hud/fileAccessHUD"
import { MouseButton } from "../../utils/mouseConfig"
import { PlayerBattleActionBuilderStateService } from "../actionBuilder/playerBattleActionBuilderState"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService, SummaryPopoverType } from "../hud/summaryHUD"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { PlayerCommandSelection } from "../hud/playerCommandHUD"
import {
    BattleAction,
    BattleActionQueueService,
    BattleActionService,
} from "../history/battleAction"
import { SquaddieSummaryPopoverPosition } from "../hud/playerActionPanel/squaddieSummaryPopover"

export class BattlePlayerSquaddieSelector
    implements BattleOrchestratorComponent
{
    private gaveMovementAction: boolean

    constructor() {
        this.gaveMovementAction = false
    }

    hasCompleted(gameEngineState: GameEngineState): boolean {
        if (!this.playerCanControlAtLeastOneSquaddie(gameEngineState)) {
            return true
        }

        const gaveCompleteInstruction =
            this.gaveMovementAction ||
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.playerCommandState?.playerSelectedEndTurn
        const selectedActionRequiresATarget =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.playerCommandState
                ?.playerSelectedSquaddieAction || false
        const cameraIsNotPanning =
            !gameEngineState.battleOrchestratorState.battleState.camera.isPanning()
        return (
            (gaveCompleteInstruction || selectedActionRequiresATarget) &&
            cameraIsNotPanning
        )
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.mouseClicked({
                mouseX: event.mouseX,
                mouseY: event.mouseY,
                mouseButton: event.mouseButton,
                gameEngineState,
            })
        }

        if (event.eventType === OrchestratorComponentMouseEventType.MOVED) {
            this.mouseMoved(gameEngineState, event.mouseX, event.mouseY)
        }
    }

    mouseClicked({
        gameEngineState,
        mouseX,
        mouseY,
        mouseButton,
    }: {
        gameEngineState: GameEngineState
        mouseX: number
        mouseY: number
        mouseButton: MouseButton
    }): void {
        const currentTeam: BattleSquaddieTeam =
            BattleStateService.getCurrentTeam(
                gameEngineState.battleOrchestratorState.battleState,
                gameEngineState.repository
            )
        if (
            !BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
                currentTeam,
                gameEngineState.repository
            )
        ) {
            return
        }

        FileAccessHUDService.mouseClicked({
            fileAccessHUD:
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            mouseX,
            mouseY,
            mouseButton,
            fileState: gameEngineState.fileState,
        })

        const summaryHUDState =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState

        const playerCommandSelection: PlayerCommandSelection =
            SummaryHUDStateService.mouseClicked({
                mouseX,
                mouseY,
                gameEngineState,
                mouseButton,
                summaryHUDState,
            })

        if (summaryHUDState?.playerCommandState) {
            if (summaryHUDState.playerCommandState.playerSelectedEndTurn) {
                this.playerSelectedEndTurnFromPlayerCommandWindow(
                    gameEngineState
                )
                gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.showSummaryHUD =
                    false
                return
            }
            if (
                summaryHUDState.playerCommandState.playerSelectedSquaddieAction
            ) {
                this.playerSelectedSquaddieActionFromPlayerCommandWindow(
                    gameEngineState,
                    mouseX,
                    mouseY
                )
                return
            }
            if (
                [
                    PlayerCommandSelection.PLAYER_COMMAND_SELECTION_MOVE,
                    PlayerCommandSelection.PLAYER_COMMAND_SELECTION_END_TURN,
                    PlayerCommandSelection.PLAYER_COMMAND_SELECTION_ACTION,
                ].includes(playerCommandSelection)
            ) {
                return
            }
        }

        this.reactToClicking({ gameEngineState, mouseX, mouseY, mouseButton })
        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked(
            {
                mouseX,
                mouseY,
                mouseButton,
                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinatesAsObject(),
            }
        )
    }

    mouseMoved(
        gameEngineState: GameEngineState,
        mouseX: number,
        mouseY: number
    ): void {
        FileAccessHUDService.mouseMoved({
            fileAccessHUD:
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            mouseX,
            mouseY,
        })

        this.sendMessageIfUserPeeksAtSquaddieByMouse({
            gameEngineState,
            mouseX,
            mouseY,
        })

        if (
            !gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.showSummaryHUD
        ) {
            return
        }

        SummaryHUDStateService.mouseMoved({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            mouseY,
            mouseX,
            gameEngineState,
        })
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        if (event.eventType === OrchestratorComponentKeyEventType.PRESSED) {
            const currentTeam: BattleSquaddieTeam =
                BattleStateService.getCurrentTeam(
                    gameEngineState.battleOrchestratorState.battleState,
                    gameEngineState.repository
                )
            if (
                BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
                    currentTeam,
                    gameEngineState.repository
                )
            ) {
                if (this.canSwapHUD(gameEngineState, event.keyCode)) {
                    BattleOrchestratorStateService.swapHUD({
                        battleOrchestratorState:
                            gameEngineState.battleOrchestratorState,
                    })
                }

                gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.keyPressed(
                    event.keyCode,
                    gameEngineState
                )

                if (
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState?.squaddieSummaryPopoversByType.MAIN
                ) {
                    const squaddieInfo =
                        gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                            gameEngineState.battleOrchestratorState
                                .battleHUDState.summaryHUDState
                                .squaddieSummaryPopoversByType.MAIN
                                .battleSquaddieId
                        )
                    if (
                        MissionMapSquaddieLocationHandler.isValid(
                            squaddieInfo
                        ) &&
                        gameEngineState.battleOrchestratorState.battleState.missionMap.areCoordinatesOnMap(
                            squaddieInfo.mapLocation
                        )
                    ) {
                        const squaddieScreenCoordinates =
                            convertMapCoordinatesToScreenCoordinates(
                                squaddieInfo.mapLocation.q,
                                squaddieInfo.mapLocation.r,
                                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
                            )
                        this.reactToClicking({
                            mouseButton: MouseButton.ACCEPT,
                            gameEngineState,
                            mouseX: squaddieScreenCoordinates[0],
                            mouseY: squaddieScreenCoordinates[1],
                        })
                        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked(
                            {
                                mouseX: squaddieScreenCoordinates[0],
                                mouseY: squaddieScreenCoordinates[1],
                                mouseButton: MouseButton.ACCEPT,
                                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinatesAsObject(),
                            }
                        )
                        return
                    }
                }
            }
        }
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: true,
            displayMap: true,
            pauseTimer: false,
        })
    }

    update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ): void {
        if (
            !this.playerCanControlAnySquaddiesOnTheCurrentTeam(gameEngineState)
        ) {
            return
        }
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        let nextMode: BattleOrchestratorMode = undefined

        if (
            this.gaveMovementAction ||
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.playerCommandState
                ?.playerSelectedSquaddieAction ||
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.playerCommandState?.playerSelectedEndTurn
        ) {
            nextMode = BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        } else if (!this.playerCanControlAtLeastOneSquaddie(gameEngineState)) {
            nextMode = BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR
        }

        return {
            displayMap: true,
            nextMode,
        }
    }

    reset(gameEngineState: GameEngineState) {
        this.gaveMovementAction = false
        gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.reset()
    }

    private canSwapHUD(
        gameEngineState: GameEngineState,
        keyCode: number
    ): boolean {
        return (
            KeyWasPressed(KeyButtonName.SWAP_HUD, keyCode) &&
            !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        )
    }

    private playerCanControlAnySquaddiesOnTheCurrentTeam(
        gameEngineState: GameEngineState
    ): boolean {
        const currentTeam: BattleSquaddieTeam =
            BattleStateService.getCurrentTeam(
                gameEngineState.battleOrchestratorState.battleState,
                gameEngineState.repository
            )
        return (
            BattleSquaddieTeamService.hasAnActingSquaddie(
                currentTeam,
                gameEngineState.repository
            ) &&
            BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
                currentTeam,
                gameEngineState.repository
            )
        )
    }

    private playerCanControlAtLeastOneSquaddie(
        state: GameEngineState
    ): boolean {
        const currentTeam = BattleStateService.getCurrentTeam(
            state.battleOrchestratorState.battleState,
            state.repository
        )
        if (!isValidValue(currentTeam)) {
            return false
        }
        return BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
            currentTeam,
            state.repository
        )
    }

    private reactToClicking({
        mouseButton,
        gameEngineState,
        mouseX,
        mouseY,
    }: {
        mouseButton: MouseButton
        gameEngineState: GameEngineState
        mouseX: number
        mouseY: number
    }) {
        const { areCoordinatesOnMap, clickedHexCoordinate } =
            getMouseClickHexCoordinates(gameEngineState, mouseX, mouseY)
        if (
            !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            ) &&
            !areCoordinatesOnMap
        ) {
            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                PlayerBattleActionBuilderStateService.new({})
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                undefined
            return
        }

        if (
            !isValidValue(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ) ||
            isValidValue(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .expirationTime
            )
        ) {
            this.reactToClickingOnMapWhenNoSquaddieSelected(
                gameEngineState,
                clickedHexCoordinate,
                mouseX,
                mouseY
            )
            return
        }
        this.reactToClickingOnMapWhenSquaddieAlreadySelected(
            gameEngineState,
            clickedHexCoordinate,
            mouseX,
            mouseY
        )
    }

    private reactToClickingOnMapWhenNoSquaddieSelected(
        gameEngineState: GameEngineState,
        clickedHexCoordinate: HexCoordinate,
        mouseX: number,
        mouseY: number
    ) {
        const { squaddieTemplate, battleSquaddie } =
            OrchestratorUtilities.getSquaddieAtMapLocation({
                mapLocation: clickedHexCoordinate,
                map: gameEngineState.battleOrchestratorState.battleState
                    .missionMap,
                squaddieRepository: gameEngineState.repository,
            })

        if (!squaddieTemplate) {
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                undefined
            return
        }

        OrchestratorUtilities.highlightSquaddieRange(
            gameEngineState,
            battleSquaddie.battleSquaddieId
        )

        this.selectSquaddieAndOpenHUD(
            gameEngineState,
            battleSquaddie.battleSquaddieId,
            mouseX,
            mouseY
        )
        addActorActionForPlayableSquaddie({
            battleSquaddie,
            squaddieTemplate,
            gameEngineState,
        })
    }

    private reactToClickingOnMapWhenSquaddieAlreadySelected(
        state: GameEngineState,
        clickedHexCoordinate: HexCoordinate,
        mouseX: number,
        mouseY: number
    ) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(state)) {
            return
        }

        const squaddieClickedOnInfoAndMapLocation =
            state.battleOrchestratorState.battleState.missionMap.getSquaddieAtLocation(
                clickedHexCoordinate
            )
        const foundSquaddieAtLocation =
            MissionMapSquaddieLocationHandler.isValid(
                squaddieClickedOnInfoAndMapLocation
            )
        if (foundSquaddieAtLocation) {
            this.reactToSelectingSquaddieThenSelectingSquaddie(
                state,
                squaddieClickedOnInfoAndMapLocation,
                mouseX,
                mouseY
            )
            return
        }

        this.reactToSelectingSquaddieThenSelectingMap(
            state,
            clickedHexCoordinate,
            mouseX,
            mouseY
        )
    }

    private reactToSelectingSquaddieThenSelectingSquaddie(
        gameEngineState: GameEngineState,
        squaddieClickedOnInfoAndMapLocation: MissionMapSquaddieLocation,
        mouseX: number,
        mouseY: number
    ) {
        if (
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        ) {
            this.reactToSelectingSquaddieThenSelectingSquaddieDuringTurn(
                gameEngineState,
                squaddieClickedOnInfoAndMapLocation,
                mouseX,
                mouseY
            )
            return
        }
        this.reactToSelectingSquaddieThenSelectingSquaddieNotDuringTurn(
            gameEngineState,
            squaddieClickedOnInfoAndMapLocation,
            mouseX,
            mouseY
        )
    }

    private reactToSelectingSquaddieThenSelectingSquaddieNotDuringTurn(
        gameEngineState: GameEngineState,
        squaddieClickedOnInfoAndMapLocation: MissionMapSquaddieLocation,
        mouseX: number,
        mouseY: number
    ) {
        const battleSquaddieToHighlightId: string =
            squaddieClickedOnInfoAndMapLocation.battleSquaddieId
        const squaddieIsAlreadyDisplayedInTheLeftSummaryPanel: boolean =
            isValidValue(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState?.squaddieSummaryPopoversByType.MAIN
            ) &&
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieSummaryPopoversByType[
                SummaryPopoverType.MAIN
            ].battleSquaddieId === battleSquaddieToHighlightId
        const squaddieIsAlreadyDisplayedInTheRightSummaryPanel: boolean =
            isValidValue(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState?.squaddieSummaryPopoversByType.TARGET
            ) &&
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieSummaryPopoversByType.TARGET
                .battleSquaddieId === battleSquaddieToHighlightId

        this.highlightSquaddieOnMap(
            gameEngineState,
            battleSquaddieToHighlightId
        )

        if (
            squaddieIsAlreadyDisplayedInTheLeftSummaryPanel ||
            squaddieIsAlreadyDisplayedInTheRightSummaryPanel
        ) {
            return
        }

        this.selectSquaddieAndOpenHUD(
            gameEngineState,
            squaddieClickedOnInfoAndMapLocation.battleSquaddieId,
            mouseX,
            mouseY
        )

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieToHighlightId
            )
        )
        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            PlayerBattleActionBuilderStateService.new({})
        addActorActionForPlayableSquaddie({
            battleSquaddie,
            squaddieTemplate,
            gameEngineState: gameEngineState,
        })
    }

    private reactToSelectingSquaddieThenSelectingSquaddieDuringTurn(
        gameEngineState: GameEngineState,
        squaddieClickedOnInfoAndMapLocation: MissionMapSquaddieLocation,
        mouseX: number,
        mouseY: number
    ) {
        const battleSquaddieToHighlightId: string =
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        const differentSquaddieWasSelected: boolean =
            battleSquaddieToHighlightId !==
            squaddieClickedOnInfoAndMapLocation.battleSquaddieId

        if (
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            ) &&
            differentSquaddieWasSelected
        ) {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
                gameEngineState,
            })
        }
    }

    private highlightSquaddieOnMap = (
        state: GameEngineState,
        battleSquaddieToHighlightId: string
    ) => {
        const { mapLocation: startLocation } =
            state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                battleSquaddieToHighlightId
            )
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()
        const squaddieReachHighlightedOnMap =
            MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                repository: state.repository,
                missionMap:
                    state.battleOrchestratorState.battleState.missionMap,
                battleSquaddieId: battleSquaddieToHighlightId,
                startLocation: startLocation,
                campaignResources: state.campaign.resources,
            })
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles(
            squaddieReachHighlightedOnMap
        )
    }

    private selectSquaddieAndOpenHUD = (
        gameEngineState: GameEngineState,
        battleSquaddieId: string,
        mouseX: number,
        mouseY: number
    ) => {
        gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow(
            {
                battleId: battleSquaddieId,
                repositionWindow: {
                    mouseX: mouseX,
                    mouseY: mouseY,
                },
                gameEngineState: gameEngineState,
            }
        )
    }

    private reactToSelectingSquaddieThenSelectingMap(
        gameEngineState: GameEngineState,
        clickedHexCoordinate: HexCoordinate,
        mouseX: number,
        mouseY: number
    ) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(gameEngineState)) {
            return
        }
        if (
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieSummaryPopoversByType[
                SummaryPopoverType.MAIN
            ].battleSquaddieId === undefined
        ) {
            return
        }

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            )
        )

        const canPlayerControlSquaddieRightNow =
            SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })
        if (
            !canPlayerControlSquaddieRightNow.playerCanControlThisSquaddieRightNow
        ) {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                gameEngineState,
                reason: `You cannot control ${squaddieTemplate.squaddieId.name}`,
                selectionLocation: {
                    x: mouseX,
                    y: mouseY,
                },
            })
            return
        }
        this.moveSquaddieAndCompleteInstruction(
            gameEngineState,
            battleSquaddie,
            squaddieTemplate,
            clickedHexCoordinate
        )

        if (this.gaveMovementAction === true) {
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.showSummaryHUD =
                false
        }
    }

    private moveSquaddieAndCompleteInstruction(
        gameEngineState: GameEngineState,
        battleSquaddie: BattleSquaddie,
        squaddieTemplate: SquaddieTemplate,
        clickedHexCoordinate: HexCoordinate
    ) {
        if (
            !this.isMovementRoutePossible({
                gameEngineState: gameEngineState,
                battleSquaddie,
                squaddieTemplate,
                destination: clickedHexCoordinate,
            })
        ) {
            return
        }

        const { mapLocation: startLocation } =
            gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                battleSquaddie.battleSquaddieId
            )
        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            BattleActionService.new({
                actor: {
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                },
                action: { isMovement: true },
                effect: {
                    movement: {
                        startLocation,
                        endLocation: clickedHexCoordinate,
                    },
                },
            })
        )

        BattleSquaddieSelectorService.createSearchPath({
            state: gameEngineState,
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate,
        })
        const { processedAction, destination } =
            this.createMovementProcessedAction({
                state: gameEngineState,
                squaddieTemplate,
                battleSquaddie,
                clickedHexCoordinate,
            })
        SquaddieTurnService.spendActionPoints(
            battleSquaddie.squaddieTurn,
            processedAction.decidedAction.actionPointCost
        )
        ActionsThisRoundService.updateActionsThisRound({
            state: gameEngineState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation: MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                battleSquaddie.battleSquaddieId
            ).mapLocation,
            processedAction,
        })
        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            PlayerBattleActionBuilderStateService.new({})
        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        })
        PlayerBattleActionBuilderStateService.addAction({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            movement: true,
        })
        PlayerBattleActionBuilderStateService.setConsideredTarget({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            targetLocation: destination,
        })
        PlayerBattleActionBuilderStateService.setConfirmedTarget({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            targetLocation: destination,
        })
        gameEngineState.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(
            battleSquaddie.battleSquaddieId,
            destination
        )

        RecordingService.addEvent(
            gameEngineState.battleOrchestratorState.battleState.recording,
            BattleEventService.new({
                processedAction,
                results: undefined,
            })
        )
        this.gaveMovementAction = true
    }

    private isMovementRoutePossible({
        gameEngineState,
        battleSquaddie,
        squaddieTemplate,
        destination,
    }: {
        gameEngineState: GameEngineState
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        destination: HexCoordinate
    }): boolean {
        const squaddieDatum =
            gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                battleSquaddie.battleSquaddieId
            )
        const { actionPointsRemaining } =
            SquaddieService.getNumberOfActionPoints({
                squaddieTemplate,
                battleSquaddie,
            })
        const searchResults: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [squaddieDatum.mapLocation],
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                movementPerAction:
                    squaddieTemplate.attributes.movement.movementPerAction,
                canPassThroughWalls:
                    squaddieTemplate.attributes.movement.passThroughWalls,
                canPassOverPits:
                    squaddieTemplate.attributes.movement.crossOverPits,
                shapeGenerator: getResultOrThrowError(
                    GetTargetingShapeGenerator(TargetingShape.SNAKE)
                ),
                maximumDistanceMoved: undefined,
                minimumDistanceMoved: undefined,
                canStopOnSquaddies: true,
                ignoreTerrainCost: false,
                stopLocations: [destination],
                numberOfActions: actionPointsRemaining,
            }),
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            repository: gameEngineState.repository,
        })

        const closestRoute: SearchPath =
            SearchResultsService.getShortestPathToLocation(
                searchResults,
                destination.q,
                destination.r
            )
        return isValidValue(closestRoute)
    }

    private isHudInstructingTheCurrentlyActingSquaddie(
        gameEngineState: GameEngineState
    ): boolean {
        const startOfANewSquaddieTurn =
            !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        const squaddieShownInHUD =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.squaddieSummaryPopoversByType[
                SummaryPopoverType.MAIN
            ]?.battleSquaddieId

        return (
            startOfANewSquaddieTurn ||
            squaddieShownInHUD ===
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.battleSquaddieId
        )
    }

    private playerSelectedEndTurnFromPlayerCommandWindow(
        gameEngineState: GameEngineState
    ) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(gameEngineState)) {
            return
        }

        const endTurnBattleAction: BattleAction = BattleActionService.new({
            actor: {
                battleSquaddieId:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState?.squaddieSummaryPopoversByType.MAIN
                        ?.battleSquaddieId,
            },
            action: { isEndTurn: true },
            effect: { endTurn: true },
        })

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_ENDS_TURN,
            gameEngineState,
            battleAction: endTurnBattleAction,
        })
    }

    private playerSelectedSquaddieActionFromPlayerCommandWindow(
        gameEngineState: GameEngineState,
        mouseX: number,
        mouseY: number
    ) {
        if (!this.isHudInstructingTheCurrentlyActingSquaddie(gameEngineState)) {
            return
        }

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            )
        )

        const { mapLocation } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddie.battleSquaddieId
        )
        const newAction =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.playerCommandState.selectedActionTemplate

        const { actionPointsRemaining } =
            SquaddieService.getNumberOfActionPoints({
                squaddieTemplate,
                battleSquaddie,
            })
        if (actionPointsRemaining < newAction.actionPoints) {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                gameEngineState,
                reason: `Need ${newAction.actionPoints} action points`,
                selectionLocation: {
                    x: mouseX,
                    y: mouseY,
                },
            })

            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.selectedActionTemplate =
                undefined
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.playerSelectedSquaddieAction =
                false
            return
        }

        this.playerSelectsAction(
            gameEngineState,
            battleSquaddie,
            mapLocation,
            newAction
        )
        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.showSummaryHUD =
            false
    }

    private playerSelectsAction = (
        gameEngineState: GameEngineState,
        battleSquaddie: BattleSquaddie,
        mapLocation: HexCoordinate,
        newAction: ActionTemplate
    ) => {
        ActionsThisRoundService.updateActionsThisRound({
            state: gameEngineState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startingLocation: mapLocation,
            previewedActionTemplateId: newAction.id,
        })
        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            PlayerBattleActionBuilderStateService.new({})
        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        })
        PlayerBattleActionBuilderStateService.addAction({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            actionTemplate: newAction,
        })
    }

    private createMovementProcessedAction({
        state,
        battleSquaddie,
        squaddieTemplate,
        clickedHexCoordinate,
    }: {
        state: GameEngineState
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        clickedHexCoordinate: HexCoordinate
    }): {
        processedAction: ProcessedAction
        destination: HexCoordinate
    } {
        const locationsByMoveActions: {
            [movementActions: number]: LocationTraveled[]
        } = SquaddieService.searchPathLocationsByNumberOfMovementActions({
            searchPath:
                state.battleOrchestratorState.battleState.squaddieMovePath,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            repository: state.repository,
        })
        const numberOfActionPointsSpentMoving: number =
            Math.max(
                ...Object.keys(locationsByMoveActions).map((str) => Number(str))
            ) || 1

        const decidedActionMovementEffect =
            DecidedActionMovementEffectService.new({
                template: undefined,
                destination: clickedHexCoordinate,
            })

        return {
            processedAction: ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    actionTemplateName: "Move",
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    actionPointCost: numberOfActionPointsSpentMoving,
                    actionEffects: [decidedActionMovementEffect],
                }),
                processedActionEffects: [
                    ProcessedActionMovementEffectService.new({
                        decidedActionEffect: decidedActionMovementEffect,
                    }),
                ],
            }),
            destination: decidedActionMovementEffect.destination,
        }
    }

    private sendMessageIfUserPeeksAtSquaddieByMouse = ({
        mouseX,
        mouseY,
        gameEngineState,
    }: {
        mouseX: number
        mouseY: number
        gameEngineState: GameEngineState
    }) => {
        const { q, r } =
            ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates({
                screenX: mouseX,
                screenY: mouseY,
                camera: gameEngineState.battleOrchestratorState.battleState
                    .camera,
            })

        const { battleSquaddieId } =
            MissionMapService.getBattleSquaddieAtLocation(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                { q, r }
            )

        if (!isValidValue(battleSquaddieId)) {
            return
        }

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
            gameEngineState,
            battleSquaddieSelectedId: battleSquaddieId,
            selectionMethod: {
                mouse: {
                    x: mouseX,
                    y: mouseY,
                },
            },
            squaddieSummaryPopoverPosition:
                SquaddieSummaryPopoverPosition.SELECT_MAIN,
        })
    }
}

const getMouseClickHexCoordinates = (
    gameEngineState: GameEngineState,
    mouseX: number,
    mouseY: number
) => {
    const clickedTileCoordinates: [number, number] =
        convertScreenCoordinatesToMapCoordinates(
            mouseX,
            mouseY,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        )
    const clickedHexCoordinate = {
        q: clickedTileCoordinates[0],
        r: clickedTileCoordinates[1],
    }

    return {
        areCoordinatesOnMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.areCoordinatesOnMap(
                clickedHexCoordinate
            ),
        clickedHexCoordinate,
    }
}

const addActorActionForPlayableSquaddie = ({
    battleSquaddie,
    squaddieTemplate,
    gameEngineState,
}: {
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
    gameEngineState: GameEngineState
}) => {
    const { playerCanControlThisSquaddieRightNow } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            battleSquaddie,
            squaddieTemplate,
        })

    if (playerCanControlThisSquaddieRightNow) {
        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
        })
    }
}
