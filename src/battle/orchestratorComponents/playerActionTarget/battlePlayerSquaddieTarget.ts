import { GameEngineState } from "../../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../../objectRepository"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventChangeLocation,
    OrchestratorComponentMouseEventType,
} from "../../orchestrator/battleOrchestratorComponent"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../../hexMap/hexCoordinate/hexCoordinate"
import { UIControlSettings } from "../../orchestrator/uiControlSettings"
import { BattleOrchestratorMode } from "../../orchestrator/battleOrchestrator"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { TargetingResultsService } from "../../targeting/targetingService"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { OrchestratorUtilities } from "../orchestratorUtils"
import { Label, LabelService } from "../../../ui/label"
import { isValidValue } from "../../../utils/objectValidityCheck"
import {
    MouseButton,
    MousePress,
    MouseRelease,
    ScreenLocation,
} from "../../../utils/mouseConfig"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../../hud/summary/summaryHUD"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import { TerrainTileGraphicsService } from "../../../hexMap/terrainTileGraphics"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { GOLDEN_RATIO, WINDOW_SPACING } from "../../../ui/constants"
import {
    PlayerInputAction,
    PlayerInputStateService,
} from "../../../ui/playerInput/playerInputState"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import { MissionMapSquaddieCoordinateService } from "../../../missionMap/squaddieCoordinate"
import { BattleSquaddie } from "../../battleSquaddie"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { Button } from "../../../ui/button/button"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { SequenceComposite } from "../../../utils/behaviorTree/composite/sequence/sequence"
import { ExecuteAllComposite } from "../../../utils/behaviorTree/composite/executeAll/executeAll"
import {
    PlayerActionTargetCreateCancelButton,
    PlayerActionTargetShouldCreateCancelButton,
} from "./cancelButton"
import { HEX_TILE_HEIGHT } from "../../../graphicsConstants"
import { BattleCamera } from "../../battleCamera"
import { ButtonStatusChangeEventByButtonId } from "../../../ui/button/logic/base"
import {
    PlayerActionTargetCreateExplanationLabel,
    PlayerActionTargetShouldCreateExplanationLabel,
} from "./explanation"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import {
    DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT,
    DrawSquaddieIconOnMapUtilities,
} from "../../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"

export interface PlayerActionTargetLayout {
    targetExplanationLabel: {
        area: RectArea
        fontSize: number
        fillColor: [number, number, number, number]
        noStroke: boolean
        fontColor: [number, number, number]
        textBoxMargin: [number, number, number, number]
        margin: [number, number]
    }
    cancelButton: {
        topOffset: number
        height: number
        width: number
        text: string
        fontSize: number
        fillColor: number[]
        strokeColor: number[]
        strokeWeight: number
        fontColor: number[]
        textBoxMargin: number[]
        margin: number
        selectedBorder: {
            strokeColor: number[]
            strokeWeight: number
        }
        activeFill: {
            fillColor: number[]
        }
    }
}

export interface PlayerActionTargetUIObjects {
    cancelButton: Button
    explanationLabel: Label
    graphicsContext?: GraphicsBuffer
}

export interface PlayerActionTargetContext {
    highlightedTargetRange: HexCoordinate[]
    cancelAbility: boolean
    hasSelectedValidTarget: boolean
    buttonStatusChangeEventDataBlob: ButtonStatusChangeEventByButtonId
    battleActionDecisionStep: BattleActionDecisionStep
    camera: BattleCamera
    missionMap: MissionMap
    explanationLabelText: string
}

export class BattlePlayerSquaddieTarget implements BattleOrchestratorComponent {
    data: ComponentDataBlob<
        PlayerActionTargetLayout,
        PlayerActionTargetContext,
        PlayerActionTargetUIObjects
    >
    drawUITask: BehaviorTreeTask

    constructor() {
        this.data = new ComponentDataBlob<
            PlayerActionTargetLayout,
            PlayerActionTargetContext,
            PlayerActionTargetUIObjects
        >()

        this.data.setLayout({
            targetExplanationLabel: {
                fontSize: 16,
                area: RectAreaService.new({
                    left: (ScreenDimensions.SCREEN_WIDTH / 12) * 4,
                    width: (ScreenDimensions.SCREEN_WIDTH / 12) * 2,
                    height: 48,
                    top:
                        ScreenDimensions.SCREEN_HEIGHT -
                        (ScreenDimensions.SCREEN_WIDTH / 12) * GOLDEN_RATIO +
                        WINDOW_SPACING.SPACING1,
                }),
                fillColor: [0, 0, 0, 32],
                noStroke: true,
                fontColor: [0, 0, 128],
                textBoxMargin: [0, 0, 0, 0],
                margin: [0, WINDOW_SPACING.SPACING1],
            },
            cancelButton: {
                width:
                    (ScreenDimensions.SCREEN_WIDTH / 12) * (GOLDEN_RATIO - 1),
                topOffset: HEX_TILE_HEIGHT / 2,
                height: HEX_TILE_HEIGHT * GOLDEN_RATIO * (GOLDEN_RATIO - 1),
                text: "Cancel",
                fontSize: 16,
                fillColor: [0, 0, 64],
                strokeColor: [0, 0, 0],
                strokeWeight: 1,
                fontColor: [0, 0, 16],
                textBoxMargin: [0, 0, 0, 0],
                margin: 0,
                selectedBorder: {
                    strokeColor: [0, 85, 50],
                    strokeWeight: 4,
                },
                activeFill: {
                    fillColor: [0, 0, 32],
                },
            },
        })

        this.resetContext()
        this.resetUIObjects()
        this.createDrawingTask()
    }

    private get hasHighlightedTargetRange(): boolean {
        return this.data.getContext()?.highlightedTargetRange.length > 0
    }

    hasCompleted(_gameEngineState: GameEngineState): boolean {
        const context = this.data.getContext()
        const userWantsADifferentAbility: boolean =
            context.cancelAbility === true
        const userSelectedTarget: boolean =
            context.hasSelectedValidTarget === true
        return userWantsADifferentAbility || userSelectedTarget
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void {
        switch (mouseEvent.eventType) {
            case OrchestratorComponentMouseEventType.LOCATION:
                return this.mouseMoved(gameEngineState, mouseEvent)
            case OrchestratorComponentMouseEventType.PRESS:
                return this.mousePressed(mouseEvent.mousePress)
            case OrchestratorComponentMouseEventType.RELEASE:
                return this.mouseReleased(
                    gameEngineState,
                    mouseEvent.mouseRelease
                )
        }
    }

    mouseMoved(
        gameEngineState: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEventChangeLocation
    ) {
        const mouseLocation = mouseEvent.mouseLocation
        this.getButtons().forEach((button) => {
            button.mouseMoved({
                mouseLocation,
            })
        })
        sendMessageIfUserPeeksOnASquaddie({ gameEngineState, mouseLocation })
    }

    mousePressed(mousePress: MousePress) {
        this.getButtons().forEach((button) =>
            button.mousePressed({ mousePress })
        )
    }

    mouseReleased(
        gameEngineState: GameEngineState,
        mouseRelease: MouseRelease
    ) {
        if (mouseRelease.button == MouseButton.CANCEL) {
            return this.cancelTargetSelectionAndResetSummaryHUDState(
                gameEngineState
            )
        }

        const uiObjects: PlayerActionTargetUIObjects = this.data.getUIObjects()
        this.getButtons().forEach((button) =>
            button.mouseReleased({ mouseRelease })
        )
        if (
            uiObjects.cancelButton?.getStatusChangeEvent()?.mouseRelease !=
            undefined
        ) {
            this.reactToCancelButtonStatusChangeEvent(gameEngineState)
            return
        }

        this.tryToSelectValidTarget({
            mouseClick: mouseRelease,
            gameEngineState,
        })
    }

    private coordinateIsInRange(selectedCoordinate: HexCoordinate): boolean {
        const context = this.data.getContext()
        return HexCoordinateService.includes(
            context.highlightedTargetRange,
            selectedCoordinate
        )
    }

    private getCoordinateSelectedOnScreen(
        screenLocation: ScreenLocation,
        gameEngineState: GameEngineState
    ) {
        return ConvertCoordinateService.convertScreenLocationToMapCoordinates({
            screenLocation,
            cameraLocation:
                gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
        })
    }

    private getSquaddieAtCoordinate(
        gameEngineState: GameEngineState,
        mapCoordinate: HexCoordinate
    ): {
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
    } {
        const info = MissionMapService.getBattleSquaddieAtCoordinate(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            mapCoordinate
        )

        if (!MissionMapSquaddieCoordinateService.isValid(info)) {
            return {
                battleSquaddie: undefined,
                squaddieTemplate: undefined,
            }
        }

        return getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                info.battleSquaddieId
            )
        )
    }

    cancelTargetSelectionAndResetSummaryHUDState(
        gameEngineState: GameEngineState
    ) {
        this.unTintHighlightedSquaddies(gameEngineState)

        const context = this.data.getContext()
        context.cancelAbility = true
        this.data.setContext(context)
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
            gameEngineState,
        })

        this.getButtons().forEach((button) => {
            button.clearStatus()
        })

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
    }

    private unTintHighlightedSquaddies(gameEngineState: GameEngineState) {
        this.getSquaddiesToHighlight(gameEngineState)
            .filter((x) => x)
            .forEach((battleSquaddieId) => {
                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        battleSquaddieId
                    )
                )
                DrawSquaddieIconOnMapUtilities.unTintSquaddieMapIcon(
                    gameEngineState.repository,
                    battleSquaddie
                )
            })
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

        const context = this.data.getContext()
        if (!context.hasSelectedValidTarget) {
            if (
                this.doesUserWantToCancelUsingTheKeyboard(
                    gameEngineState,
                    keyboardEvent
                )
            ) {
                this.cancelTargetSelectionAndResetSummaryHUDState(
                    gameEngineState
                )
            }
        }
    }

    doesUserWantToCancelUsingTheKeyboard(
        gameEngineState: GameEngineState,
        keyboardEvent: OrchestratorComponentKeyEvent
    ): boolean {
        const actions: PlayerInputAction[] =
            PlayerInputStateService.getActionsForPressedKey(
                gameEngineState.playerInputState,
                keyboardEvent.keyCode
            )

        return actions.includes(PlayerInputAction.CANCEL)
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

        this.updateContextDuringDraw(gameEngineState)
        this.updateUIObjectsDuringDraw(graphicsContext)
        this.drawUITask.run()

        const context = this.data.getContext()
        const uiObjects = this.data.getUIObjects()
        if (!context.hasSelectedValidTarget) {
            LabelService.draw(uiObjects.explanationLabel, graphicsContext)
            this.getButtons().forEach((button) => {
                DataBlobService.add<GraphicsBuffer>(
                    button.buttonStyle.dataBlob,
                    "graphicsContext",
                    graphicsContext
                )
                button.draw()
            })
        }
        this.highlightActorSquaddie(gameEngineState)
        if (
            !this.data.getContext().cancelAbility &&
            !this.data.getContext().hasSelectedValidTarget
        ) {
            this.highlightTargetSquaddies(gameEngineState)
        }

        this.getButtons().forEach((button) => {
            button.clearStatus()
        })
    }

    private highlightActorSquaddie(gameEngineState: GameEngineState) {
        if (
            !BattleActionDecisionStepService.isActorSet(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ) {
            return
        }
        DrawSquaddieIconOnMapUtilities.tintSquaddieMapIconWithPulseColor({
            repository: gameEngineState.repository,
            battleSquaddieId: BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId,
            pulseColor:
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.actorSquaddie
                    .pulseColorForMapIcon,
        })
    }

    private highlightTargetSquaddies(gameEngineState: GameEngineState) {
        let squaddiesToHighlight = this.getSquaddiesToHighlight(gameEngineState)
        squaddiesToHighlight
            .filter((x) => x)
            .forEach((battleSquaddieId) => {
                DrawSquaddieIconOnMapUtilities.tintSquaddieMapIconWithPulseColor(
                    {
                        repository: gameEngineState.repository,
                        battleSquaddieId,
                        pulseColor:
                            DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.targetEnemySquaddie
                                .pulseColorForMapIcon,
                    }
                )
            })
    }

    private getSquaddiesToHighlight(gameEngineState: GameEngineState) {
        if (
            BattleActionDecisionStepService.isTargetConfirmed(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ) {
            return [
                MissionMapService.getBattleSquaddieAtCoordinate(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                    BattleActionDecisionStepService.getTarget(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    ).targetCoordinate
                )?.battleSquaddieId,
            ]
        }
        return this.data.getContext().highlightedTargetRange.map(
            (selectedCoordinate) =>
                this.getValidTargetSquaddieAtLocation({
                    selectedCoordinate: selectedCoordinate,
                    gameEngineState: gameEngineState,
                }).battleSquaddie?.battleSquaddieId
        )
    }

    private updateUIObjectsDuringDraw(graphicsContext: GraphicsBuffer) {
        const uiObjects: PlayerActionTargetUIObjects = this.data.getUIObjects()
        uiObjects.graphicsContext = graphicsContext
        this.data.setUIObjects(uiObjects)
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        const context = this.data.getContext()
        if (context.cancelAbility) {
            return {
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            }
        }

        if (context.hasSelectedValidTarget) {
            return {
                nextMode: BattleOrchestratorMode.PLAYER_ACTION_CONFIRM,
            }
        }

        return undefined
    }

    reset(_: GameEngineState) {
        this.resetContext()
        this.resetUIObjects()
        this.drawUITask = undefined
        this.createDrawingTask()
    }

    resetContext() {
        this.data.setContext({
            explanationLabelText: "Select a target",
            buttonStatusChangeEventDataBlob: DataBlobService.new(),
            highlightedTargetRange: [],
            cancelAbility: false,
            hasSelectedValidTarget: false,
            battleActionDecisionStep: undefined,
            camera: undefined,
            missionMap: undefined,
        })
    }

    resetUIObjects() {
        this.data.setUIObjects({
            cancelButton: undefined,
            explanationLabel: undefined,
            graphicsContext: undefined,
        })
    }

    private highlightTargetRange(gameEngineState: GameEngineState) {
        const actionRange =
            TargetingResultsService.highlightTargetRange(gameEngineState)
        const context = this.data.getContext()
        context.highlightedTargetRange = [...actionRange]
        this.data.setContext(context)
    }

    getValidTargetSquaddieAtLocation({
        selectedCoordinate,
        gameEngineState,
    }: {
        selectedCoordinate: HexCoordinate
        gameEngineState: GameEngineState
    }): {
        isValid: boolean
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
    } {
        if (!this.coordinateIsInRange(selectedCoordinate)) {
            this.updateExplanationLabelToIndicateItIsOutOfRange({
                selectedCoordinate: selectedCoordinate,
                gameEngineState: gameEngineState,
            })
            return {
                isValid: false,
                battleSquaddie: undefined,
                squaddieTemplate: undefined,
            }
        }

        const {
            squaddieTemplate: targetSquaddieTemplate,
            battleSquaddie: targetBattleSquaddie,
        } = this.getSquaddieAtCoordinate(gameEngineState, selectedCoordinate)

        if (targetSquaddieTemplate === undefined) {
            return {
                isValid: false,
                battleSquaddie: undefined,
                squaddieTemplate: undefined,
            }
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

        const actionTemplateId = BattleActionDecisionStepService.getAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )?.actionTemplateId
        if (!actionTemplateId) {
            return {
                isValid: false,
                battleSquaddie: undefined,
                squaddieTemplate: undefined,
            }
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionTemplateId
        )

        if (!isValidValue(actionTemplate)) {
            return {
                isValid: false,
                battleSquaddie: undefined,
                squaddieTemplate: undefined,
            }
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
            return {
                isValid: false,
                battleSquaddie: undefined,
                squaddieTemplate: undefined,
            }
        }

        return {
            isValid: true,
            squaddieTemplate: targetSquaddieTemplate,
            battleSquaddie: targetBattleSquaddie,
        }
    }

    private tryToSelectValidTarget({
        mouseClick,
        gameEngineState,
    }: {
        mouseClick: MousePress | MouseRelease
        gameEngineState: GameEngineState
    }) {
        const selectedCoordinate = this.getCoordinateSelectedOnScreen(
            mouseClick,
            gameEngineState
        )

        if (
            !this.getValidTargetSquaddieAtLocation({
                selectedCoordinate: selectedCoordinate,
                gameEngineState: gameEngineState,
            }).isValid
        ) {
            return false
        }

        this.tellMapItWasClicked(gameEngineState, mouseClick)

        this.unTintHighlightedSquaddies(gameEngineState)
        const context = this.data.getContext()
        context.hasSelectedValidTarget = true
        this.data.setContext(context)
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
            gameEngineState,
            targetCoordinate: selectedCoordinate,
        })
    }

    private tellMapItWasClicked(
        gameEngineState: GameEngineState,
        mouseClick: MousePress | MouseRelease
    ) {
        const cameraLocation =
            gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation()
        TerrainTileGraphicsService.mouseClicked({
            terrainTileMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
            mouseClick,
            cameraLocation,
        })
    }

    private reactToCancelButtonStatusChangeEvent(
        gameEngineState: GameEngineState
    ) {
        const uiObjects: PlayerActionTargetUIObjects = this.data.getUIObjects()
        const cancelButton = uiObjects.cancelButton
        const statusChangeEvent = cancelButton.getStatusChangeEvent()
        if (
            !(
                statusChangeEvent?.previousStatus == ButtonStatus.ACTIVE &&
                statusChangeEvent?.newStatus == ButtonStatus.HOVER
            )
        )
            return

        return this.cancelTargetSelectionAndResetSummaryHUDState(
            gameEngineState
        )
    }

    private createDrawingTask() {
        const createCancelButtonTask = new SequenceComposite(this.data, [
            new PlayerActionTargetShouldCreateCancelButton(this.data),
            new PlayerActionTargetCreateCancelButton(this.data),
        ])

        const createExplanationLabelTask = new SequenceComposite(this.data, [
            new PlayerActionTargetShouldCreateExplanationLabel(this.data),
            new PlayerActionTargetCreateExplanationLabel(this.data),
        ])

        this.drawUITask = new ExecuteAllComposite(this.data, [
            createCancelButtonTask,
            createExplanationLabelTask,
        ])
    }

    getButtons() {
        const uiObjects: PlayerActionTargetUIObjects = this.data.getUIObjects()
        return [uiObjects.cancelButton].filter((x) => x)
    }

    private updateContextDuringDraw(gameEngineState: GameEngineState) {
        const context: PlayerActionTargetContext = this.data.getContext()
        context.battleActionDecisionStep =
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep
        context.camera =
            gameEngineState.battleOrchestratorState.battleState.camera
        context.missionMap =
            gameEngineState.battleOrchestratorState.battleState.missionMap
        this.data.setContext(context)
    }

    private updateExplanationLabelToIndicateItIsOutOfRange({
        selectedCoordinate,
        gameEngineState,
    }: {
        selectedCoordinate: HexCoordinate
        gameEngineState: GameEngineState
    }) {
        const { squaddieTemplate } = this.getSquaddieAtCoordinate(
            gameEngineState,
            selectedCoordinate
        )
        const selectedDescription =
            squaddieTemplate?.squaddieId.name ??
            HexCoordinateService.toString(selectedCoordinate)

        const context: PlayerActionTargetContext = this.data.getContext()
        context.explanationLabelText = `${selectedDescription}\n is out of range`
        this.data.setContext(context)
    }
}

const sendMessageIfUserPeeksOnASquaddie = ({
    mouseLocation,
    gameEngineState,
}: {
    gameEngineState: GameEngineState
    mouseLocation: ScreenLocation
}) => {
    const { q, r } =
        ConvertCoordinateService.convertScreenLocationToMapCoordinates({
            screenLocation: mouseLocation,
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
            mouse: mouseLocation,
        },
    })
}
