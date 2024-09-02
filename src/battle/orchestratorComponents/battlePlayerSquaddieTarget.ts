import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../ui/constants"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventClicked,
    OrchestratorComponentMouseEventMoved,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { TargetingResultsService } from "../targeting/targetingService"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { LabelService } from "../../ui/label"
import { isValidValue } from "../../utils/validityCheck"
import { MouseButton } from "../../utils/mouseConfig"
import { KeyButtonName, KeyWasPressed } from "../../utils/keyboardConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../hud/summaryHUD"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { MissionMapService } from "../../missionMap/missionMap"
import {
    SquaddieSummaryPopoverPosition,
    SquaddieSummaryPopoverService,
} from "../hud/playerActionPanel/squaddieSummaryPopover"
import { BattleHUDStateService } from "../hud/battleHUDState"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"

export const TARGET_CANCEL_BUTTON_TOP = ScreenDimensions.SCREEN_HEIGHT * 0.9
const MESSAGE_TEXT_SIZE = 24

export class BattlePlayerSquaddieTarget implements BattleOrchestratorComponent {
    hasSelectedValidTarget: boolean
    private cancelAbility: boolean
    private highlightedTargetRange: HexCoordinate[]

    constructor() {
        this.resetObject()
    }

    private get hasHighlightedTargetRange(): boolean {
        return this.highlightedTargetRange.length > 0
    }

    hasCompleted(gameEngineState: GameEngineState): boolean {
        const userWantsADifferentAbility: boolean = this.cancelAbility === true
        const userSelectedTarget: boolean = this.hasSelectedValidTarget === true
        return userWantsADifferentAbility || userSelectedTarget
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void {
        if (
            mouseEvent.eventType === OrchestratorComponentMouseEventType.MOVED
        ) {
            this.seeIfSquaddiePeekedOnASquaddie({ gameEngineState, mouseEvent })
            return
        }

        if (
            mouseEvent.eventType !== OrchestratorComponentMouseEventType.CLICKED
        ) {
            return
        }

        if (!this.hasSelectedValidTarget) {
            this.waitingForValidTarget({ gameEngineState, mouseEvent })
        }
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        keyboardEvent: OrchestratorComponentKeyEvent
    ): void {
        if (
            keyboardEvent.eventType !==
            OrchestratorComponentKeyEventType.PRESSED
        ) {
            return
        }

        if (!this.hasSelectedValidTarget) {
            this.waitingForValidTarget({ gameEngineState, keyboardEvent })
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
        if (!this.hasHighlightedTargetRange) {
            return this.highlightTargetRange(gameEngineState)
        }

        this.movePopoversPositions(
            gameEngineState,
            SquaddieSummaryPopoverPosition.SELECT_TARGET
        )

        if (!this.hasSelectedValidTarget) {
            this.drawCancelAbilityButton(
                gameEngineState.battleOrchestratorState,
                graphicsContext
            )
        }
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        if (this.cancelAbility) {
            this.movePopoversPositions(
                gameEngineState,
                SquaddieSummaryPopoverPosition.SELECT_MAIN
            )
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            }
        }

        if (this.hasSelectedValidTarget) {
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.PLAYER_ACTION_CONFIRM,
            }
        }

        return undefined
    }

    reset(state: GameEngineState) {
        this.resetObject()
    }

    private waitingForValidTarget = ({
        gameEngineState,
        mouseEvent,
        keyboardEvent,
    }: {
        gameEngineState: GameEngineState
        mouseEvent?: OrchestratorComponentMouseEventClicked
        keyboardEvent?: OrchestratorComponentKeyEvent
    }) => {
        if (
            this.didUserCancelTargetLocation({
                gameEngineState,
                mouseEvent,
                keyboardEvent,
            })
        ) {
            this.cancelTargetSelection(gameEngineState)

            if (
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ) {
                const actingSquaddieBattleId =
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                        .battleSquaddieId
                gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                    SummaryHUDStateService.new({
                        mouseSelectionLocation:
                            BattleHUDStateService.getPositionToOpenPlayerCommandWindow(
                                { gameEngineState }
                            ),
                    })

                SummaryHUDStateService.setMainSummaryPopover({
                    battleSquaddieId: actingSquaddieBattleId,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState,
                    gameEngineState,
                    resourceHandler: gameEngineState.resourceHandler,
                    objectRepository: gameEngineState.repository,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                SummaryHUDStateService.createCommandWindow({
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState,
                    gameEngineState,
                    resourceHandler: gameEngineState.resourceHandler,
                    objectRepository: gameEngineState.repository,
                })
            }
            return
        }

        if (!isValidValue(mouseEvent)) {
            return
        }

        const mouseClickedAccept: boolean =
            isValidValue(mouseEvent) &&
            mouseEvent.mouseButton === MouseButton.ACCEPT
        if (!mouseClickedAccept) {
            return
        }

        this.tryToSelectValidTarget({
            mouseX: mouseEvent.mouseX,
            mouseY: mouseEvent.mouseY,
            gameEngineState,
            mouseButton: mouseEvent.mouseButton,
        })
    }

    private didUserCancelTargetLocation = ({
        gameEngineState,
        mouseEvent,
        keyboardEvent,
    }: {
        gameEngineState: GameEngineState
        mouseEvent?: OrchestratorComponentMouseEventClicked
        keyboardEvent?: OrchestratorComponentKeyEvent
    }): boolean => {
        if (isValidValue(mouseEvent)) {
            return (
                mouseEvent.mouseButton === MouseButton.CANCEL ||
                mouseEvent.mouseY > TARGET_CANCEL_BUTTON_TOP
            )
        }
        if (isValidValue(keyboardEvent)) {
            return KeyWasPressed(KeyButtonName.CANCEL, keyboardEvent.keyCode)
        }
        return false
    }

    private cancelTargetSelection = (
        gameEngineState: GameEngineState
    ): void => {
        this.cancelAbility = true
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
            gameEngineState,
        })
    }

    private resetObject() {
        this.highlightedTargetRange = []
        this.cancelAbility = false
        this.hasSelectedValidTarget = false
    }

    private highlightTargetRange(state: GameEngineState) {
        const actionRange = TargetingResultsService.highlightTargetRange(state)
        this.highlightedTargetRange = [...actionRange]
    }

    private drawCancelAbilityButton(
        state: BattleOrchestratorState,
        graphicsContext: GraphicsBuffer
    ) {
        const cancelAbilityButtonText =
            "CONFIRM: Click on the target.     CANCEL: Click here."
        this.drawButton(
            RectAreaService.new({
                left: 0,
                top: TARGET_CANCEL_BUTTON_TOP,
                width: ScreenDimensions.SCREEN_WIDTH,
                height:
                    ScreenDimensions.SCREEN_HEIGHT - TARGET_CANCEL_BUTTON_TOP,
            }),
            cancelAbilityButtonText,
            graphicsContext
        )
    }

    private tryToSelectValidTarget({
        mouseX,
        mouseY,
        mouseButton,
        gameEngineState,
    }: {
        mouseX: number
        mouseY: number
        mouseButton: MouseButton
        gameEngineState: GameEngineState
    }) {
        const clickedLocation =
            ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates({
                screenX: mouseX,
                screenY: mouseY,
                camera: gameEngineState.battleOrchestratorState.battleState
                    .camera,
            })

        if (
            !this.highlightedTargetRange.some(
                (tile) =>
                    tile.q === clickedLocation.q && tile.r === clickedLocation.r
            )
        ) {
            return
        }

        const {
            squaddieTemplate: targetSquaddieTemplate,
            battleSquaddie: targetBattleSquaddie,
        } = OrchestratorUtilities.getSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
            map: gameEngineState.battleOrchestratorState.battleState.missionMap,
            squaddieRepository: gameEngineState.repository,
        })

        if (targetSquaddieTemplate === undefined) {
            return
        }

        const {
            squaddieTemplate: actingSquaddieTemplate,
            battleSquaddie: actorBattleSquaddie,
        } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.battleSquaddieId
            )
        )

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .previewedActionTemplateId
        )

        if (!isValidValue(actionTemplate)) {
            return
        }

        if (
            !TargetingResultsService.shouldTargetDueToAffiliationAndTargetTraits(
                {
                    actorAffiliation:
                        actingSquaddieTemplate.squaddieId.affiliation,
                    actorBattleSquaddieId: actorBattleSquaddie.battleSquaddieId,
                    targetBattleSquaddieId:
                        targetBattleSquaddie.battleSquaddieId,
                    actionTraits: (
                        actionTemplate
                            .actionEffectTemplates[0] as ActionEffectSquaddieTemplate
                    ).traits,
                    targetAffiliation:
                        targetSquaddieTemplate.squaddieId.affiliation,
                }
            )
        ) {
            return
        }

        const cameraCoordinates =
            gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        TerrainTileMapService.mouseClicked({
            terrainTileMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
            mouseX,
            mouseY,
            mouseButton,
            cameraX: cameraCoordinates[0],
            cameraY: cameraCoordinates[1],
        })
        this.hasSelectedValidTarget = true
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_LOCATION,
            gameEngineState,
            targetLocation: clickedLocation,
        })
    }

    private drawButton(
        area: RectArea,
        buttonText: string,
        graphicsContext: GraphicsBuffer
    ) {
        const buttonBackground = LabelService.new({
            area,
            fillColor: [0, 0, 60],
            strokeColor: [0, 0, 0],
            strokeWeight: 4,

            text: buttonText,
            textSize: MESSAGE_TEXT_SIZE,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            fontColor: [0, 0, 16],
            textBoxMargin: [0, 0, 0, 0],
        })

        LabelService.draw(buttonBackground, graphicsContext)
    }

    private seeIfSquaddiePeekedOnASquaddie = ({
        mouseEvent,
        gameEngineState,
    }: {
        mouseEvent: OrchestratorComponentMouseEventMoved
        gameEngineState: GameEngineState
    }) => {
        const { q, r } =
            ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates({
                screenX: mouseEvent.mouseX,
                screenY: mouseEvent.mouseY,
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
                mouseMovement: {
                    x: mouseEvent.mouseX,
                    y: mouseEvent.mouseY,
                },
            },
            squaddieSummaryPopoverPosition:
                SquaddieSummaryPopoverPosition.SELECT_TARGET,
        })
    }
    private movePopoversPositions = (
        gameEngineState: GameEngineState,
        position: SquaddieSummaryPopoverPosition
    ) => {
        SquaddieSummaryPopoverService.changePopoverPosition({
            popover:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN,
            position,
        })
        SquaddieSummaryPopoverService.changePopoverPosition({
            popover:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.TARGET,
            position,
        })
    }
}
