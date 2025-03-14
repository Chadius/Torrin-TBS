import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventChangeLocation,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexMap/hexCoordinate/hexCoordinate"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { TargetingResultsService } from "../targeting/targetingService"
import { RectAreaService } from "../../ui/rectArea"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { Label, LabelService } from "../../ui/label"
import { isValidValue } from "../../utils/validityCheck"
import { MouseButton, MousePress, MouseRelease } from "../../utils/mouseConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { MissionMapService } from "../../missionMap/missionMap"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { TerrainTileGraphicsService } from "../../hexMap/terrainTileGraphics"
import { PlayerCancelButtonService } from "./commonUI/playerCancelButton"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    GOLDEN_RATIO,
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../ui/constants"
import {
    PlayerInputAction,
    PlayerInputState,
    PlayerInputStateService,
} from "../../ui/playerInput/playerInputState"

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

    hasCompleted(_gameEngineState: GameEngineState): boolean {
        const userWantsADifferentAbility: boolean = this.cancelAbility === true
        const userSelectedTarget: boolean = this.hasSelectedValidTarget === true
        return userWantsADifferentAbility || userSelectedTarget
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void {
        if (
            mouseEvent.eventType ===
            OrchestratorComponentMouseEventType.LOCATION
        ) {
            sendMessageIfUserPeeksOnASquaddie({ gameEngineState, mouseEvent })
            return
        }

        if (
            mouseEvent.eventType !== OrchestratorComponentMouseEventType.RELEASE
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

    uiControlSettings(_: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: true,
            displayMap: true,
            pauseTimer: false,
            displayPlayerHUD: true,
        })
    }

    update({
        gameEngineState,
        graphicsContext,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
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
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            }
        }

        if (this.hasSelectedValidTarget) {
            return {
                nextMode: BattleOrchestratorMode.PLAYER_ACTION_CONFIRM,
            }
        }

        return undefined
    }

    reset(_: GameEngineState) {
        this.resetObject()
    }

    private waitingForValidTarget({
        gameEngineState,
        mouseEvent,
        keyboardEvent,
    }: {
        gameEngineState: GameEngineState
        mouseEvent?: OrchestratorComponentMouseEvent
        keyboardEvent?: OrchestratorComponentKeyEvent
    }) {
        if (
            didUserCancelTargetCoordinate({
                targetComponent: this,
                mouseEvent,
                keyboardEvent,
                playerInputState: gameEngineState.playerInputState,
            })
        ) {
            cancelTargetSelection(this, gameEngineState)

            if (
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ) {
                gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                    SummaryHUDStateService.new()

                SummaryHUDStateService.createActorTiles({
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState,
                    gameEngineState,
                    objectRepository: gameEngineState.repository,
                })
            }
            return
        }

        if (!isValidValue(mouseEvent)) {
            return
        }

        if (
            mouseEvent.eventType !== OrchestratorComponentMouseEventType.RELEASE
        ) {
            return
        }

        const mouseClickedAccept: boolean =
            mouseEvent.mouseRelease.button === MouseButton.ACCEPT
        if (!mouseClickedAccept) {
            return
        }

        this.tryToSelectValidTarget({
            mouseClick: mouseEvent.mouseRelease,
            gameEngineState,
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
        mouseClick,
        gameEngineState,
    }: {
        mouseClick: MousePress | MouseRelease
        gameEngineState: GameEngineState
    }) {
        const selectedCoordinate =
            ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                screenLocation: {
                    x: mouseClick.x,
                    y: mouseClick.y,
                },
                cameraLocation:
                    gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
            })

        if (
            !HexCoordinateService.includes(
                this.highlightedTargetRange,
                selectedCoordinate
            )
        ) {
            return
        }

        const {
            squaddieTemplate: targetSquaddieTemplate,
            battleSquaddie: targetBattleSquaddie,
        } = OrchestratorUtilities.getSquaddieAtScreenLocation({
            screenLocation: {
                x: mouseClick.x,
                y: mouseClick.y,
            },
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
                    squaddieAffiliationRelation:
                        actionTemplate.actionEffectTemplates[0]
                            .targetConstraints.squaddieAffiliationRelation,
                    targetAffiliation:
                        targetSquaddieTemplate.squaddieId.affiliation,
                }
            )
        ) {
            return
        }

        const cameraLocation =
            gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation()
        TerrainTileGraphicsService.mouseClicked({
            terrainTileMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
            mouseClick,
            cameraLocation,
        })
        this.hasSelectedValidTarget = true
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
            gameEngineState,
            targetCoordinate: selectedCoordinate,
        })
    }
}

const sendMessageIfUserPeeksOnASquaddie = ({
    mouseEvent,
    gameEngineState,
}: {
    mouseEvent: OrchestratorComponentMouseEventChangeLocation
    gameEngineState: GameEngineState
}) => {
    const { q, r } =
        ConvertCoordinateService.convertScreenLocationToMapCoordinates({
            screenLocation: {
                x: mouseEvent.mouseLocation.x,
                y: mouseEvent.mouseLocation.y,
            },
            cameraLocation:
                gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
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
            mouse: mouseEvent.mouseLocation,
        },
    })
}

const didUserCancelTargetCoordinate = ({
    mouseEvent,
    keyboardEvent,
    targetComponent,
    playerInputState,
}: {
    targetComponent: BattlePlayerSquaddieTarget
    mouseEvent?: OrchestratorComponentMouseEvent
    keyboardEvent?: OrchestratorComponentKeyEvent
    playerInputState: PlayerInputState
}): boolean => {
    if (
        isValidValue(mouseEvent) &&
        mouseEvent.eventType === OrchestratorComponentMouseEventType.RELEASE
    ) {
        return (
            mouseEvent.mouseRelease.button === MouseButton.CANCEL ||
            RectAreaService.isInside(
                targetComponent.cancelButton.rectangle.area,
                mouseEvent.mouseRelease.x,
                mouseEvent.mouseRelease.y
            )
        )
    }
    if (isValidValue(keyboardEvent)) {
        const actions: PlayerInputAction[] =
            PlayerInputStateService.getActionsForPressedKey(
                playerInputState,
                keyboardEvent.keyCode
            )

        return actions.includes(PlayerInputAction.CANCEL)
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
