import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
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
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { TargetingResultsService } from "../targeting/targetingService"
import { RectAreaService } from "../../ui/rectArea"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { Label, LabelService } from "../../ui/label"
import { isValidValue } from "../../utils/validityCheck"
import { MouseButton } from "../../utils/mouseConfig"
import { KeyButtonName, KeyWasPressed } from "../../utils/keyboardConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../hud/summaryHUD"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { MissionMapService } from "../../missionMap/missionMap"
import { BattleHUDStateService } from "../hud/battleHUDState"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { TerrainTileGraphicsService } from "../../hexMap/terrainTileGraphics"
import { ResourceHandler } from "../../resource/resourceHandler"
import { PlayerCancelButtonService } from "./commonUI/playerCancelButton"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    GOLDEN_RATIO,
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../ui/constants"

const layout = {
    targetExplanationLabel: {
        text: "Click on the target",
        fontSize: 24,
        centerX: (ScreenDimensions.SCREEN_WIDTH * 13) / 24,
        width: (ScreenDimensions.SCREEN_WIDTH * 2) / 12,
        height: ScreenDimensions.SCREEN_WIDTH / 12,
        top:
            ScreenDimensions.SCREEN_HEIGHT -
            (ScreenDimensions.SCREEN_WIDTH / 12) * GOLDEN_RATIO,
        fillColor: [0, 0, 128],
        strokeColor: [0, 0, 0],
        strokeWeight: 2,
        fontColor: [0, 0, 16],
        textBoxMargin: [0, 0, 0, 0],
        margin: [0, WINDOW_SPACING.SPACING1],
    },
}

export class BattlePlayerSquaddieTarget implements BattleOrchestratorComponent {
    hasSelectedValidTarget: boolean
    cancelAbility: boolean
    highlightedTargetRange: HexCoordinate[]
    cancelButton: Label
    explanationLabel: Label

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
            sendMessageIfUserPeeksOnASquaddie({ gameEngineState, mouseEvent })
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

    update({
        gameEngineState,
        graphicsContext,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        if (!this.hasHighlightedTargetRange) {
            return this.highlightTargetRange(gameEngineState)
        }

        if (!this.hasSelectedValidTarget) {
            LabelService.draw(this.explanationLabel, graphicsContext)
            LabelService.draw(this.cancelButton, graphicsContext)
        }
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        if (this.cancelAbility) {
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

    private waitingForValidTarget({
        gameEngineState,
        mouseEvent,
        keyboardEvent,
    }: {
        gameEngineState: GameEngineState
        mouseEvent?: OrchestratorComponentMouseEventClicked
        keyboardEvent?: OrchestratorComponentKeyEvent
    }) {
        if (
            didUserCancelTargetCoordinate({
                targetComponent: this,
                mouseEvent,
                keyboardEvent,
            })
        ) {
            cancelTargetSelection(this, gameEngineState)

            if (
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ) {
                gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                    SummaryHUDStateService.new({
                        screenSelectionCoordinates:
                            BattleHUDStateService.getPositionToOpenPlayerCommandWindow(
                                { gameEngineState }
                            ),
                    })

                SummaryHUDStateService.createActorTiles({
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

    private resetObject() {
        this.highlightedTargetRange = []
        this.cancelAbility = false
        this.hasSelectedValidTarget = false
        this.cancelButton = PlayerCancelButtonService.new()
        this.explanationLabel = createExplanationLabel()
    }

    private highlightTargetRange(gameEngineState: GameEngineState) {
        const actionRange =
            TargetingResultsService.highlightTargetRange(gameEngineState)
        this.highlightedTargetRange = [...actionRange]
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
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenX: mouseX,
                screenY: mouseY,
                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
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
                BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                ).battleSquaddieId
            )
        )

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            BattleActionDecisionStepService.getAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).actionTemplateId
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
                    actionTraits:
                        actionTemplate.actionEffectTemplates[0].traits,
                    targetAffiliation:
                        targetSquaddieTemplate.squaddieId.affiliation,
                }
            )
        ) {
            return
        }

        TerrainTileGraphicsService.mouseClicked({
            terrainTileMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
            mouseX,
            mouseY,
            mouseButton,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
        })
        this.hasSelectedValidTarget = true
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
            gameEngineState,
            targetCoordinate: clickedLocation,
        })
    }
}

const sendMessageIfUserPeeksOnASquaddie = ({
    mouseEvent,
    gameEngineState,
}: {
    mouseEvent: OrchestratorComponentMouseEventMoved
    gameEngineState: GameEngineState
}) => {
    const { q, r } =
        ConvertCoordinateService.convertScreenLocationToMapCoordinates({
            screenX: mouseEvent.mouseX,
            screenY: mouseEvent.mouseY,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
        })

    const { battleSquaddieId } =
        MissionMapService.getBattleSquaddieAtCoordinate(
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
                x: mouseEvent.mouseX,
                y: mouseEvent.mouseY,
            },
        },
    })
}

const didUserCancelTargetCoordinate = ({
    mouseEvent,
    keyboardEvent,
    targetComponent,
}: {
    targetComponent: BattlePlayerSquaddieTarget
    mouseEvent?: OrchestratorComponentMouseEventClicked
    keyboardEvent?: OrchestratorComponentKeyEvent
}): boolean => {
    if (isValidValue(mouseEvent)) {
        return (
            mouseEvent.mouseButton === MouseButton.CANCEL ||
            RectAreaService.isInside(
                targetComponent.cancelButton.rectangle.area,
                mouseEvent.mouseX,
                mouseEvent.mouseY
            )
        )
    }
    if (isValidValue(keyboardEvent)) {
        return KeyWasPressed(KeyButtonName.CANCEL, keyboardEvent.keyCode)
    }
    return false
}

const cancelTargetSelection = (
    targetComponent: BattlePlayerSquaddieTarget,
    gameEngineState: GameEngineState
): void => {
    targetComponent.cancelAbility = true
    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
        gameEngineState,
    })
}

const createExplanationLabel = () => {
    return LabelService.new({
        ...layout.targetExplanationLabel,
        area: RectAreaService.new({
            centerX: layout.targetExplanationLabel.centerX,
            width: layout.targetExplanationLabel.width,
            margin: layout.targetExplanationLabel.margin,
            top: layout.targetExplanationLabel.top,
            height: layout.targetExplanationLabel.height,
        }),
        fontSize: layout.targetExplanationLabel.fontSize,
        horizAlign: HORIZONTAL_ALIGN.CENTER,
        vertAlign: VERTICAL_ALIGN.CENTER,
    })
}
