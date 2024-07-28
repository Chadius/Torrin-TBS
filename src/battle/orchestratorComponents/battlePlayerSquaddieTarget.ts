import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../ui/constants"
import { RecordingService } from "../history/recording"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { ATTACK_MODIFIER } from "../modifierConstants"
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
import {
    ConvertCoordinateService,
    convertScreenCoordinatesToMapCoordinates,
} from "../../hexMap/convertCoordinates"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { FriendlyAffiliationsByAffiliation } from "../../squaddie/squaddieAffiliation"
import { Trait } from "../../trait/traitStatusStorage"
import { LabelService } from "../../ui/label"
import { ActionCalculator } from "../actionCalculator/calculator"
import { BattleEvent, BattleEventService } from "../history/battleEvent"
import { isValidValue } from "../../utils/validityCheck"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import { ActionResultTextService } from "../animation/actionResultTextService"
import { ActionTemplate } from "../../action/template/actionTemplate"
import {
    ProcessedAction,
    ProcessedActionService,
} from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"
import {
    DecidedActionSquaddieEffect,
    DecidedActionSquaddieEffectService,
} from "../../action/decided/decidedActionSquaddieEffect"
import { SquaddieTurnService } from "../../squaddie/turn"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import { SquaddieSquaddieResults } from "../history/squaddieSquaddieResults"
import { MouseButton } from "../../utils/mouseConfig"
import { KeyButtonName, KeyWasPressed } from "../../utils/keyboardConfig"
import { PlayerBattleActionBuilderStateService } from "../actionBuilder/playerBattleActionBuilderState"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../hud/summaryHUD"
import { HEX_TILE_WIDTH } from "../../graphicsConstants"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import {
    BattleActionQueueService,
    BattleActionService,
    BattleActionSquaddieChange,
} from "../history/battleAction"
import { ActionResultPerSquaddie } from "../history/actionResultPerSquaddie"
import { MissionMapService } from "../../missionMap/missionMap"
import {
    SquaddieSummaryPopoverPosition,
    SquaddieSummaryPopoverService,
} from "../hud/playerActionPanel/squaddieSummaryPopover"

export const TARGET_CANCEL_BUTTON_TOP = ScreenDimensions.SCREEN_HEIGHT * 0.9
const BUTTON_MIDDLE_DIVIDER = ScreenDimensions.SCREEN_WIDTH / 2
const MESSAGE_TEXT_SIZE = 24

export class BattlePlayerSquaddieTarget implements BattleOrchestratorComponent {
    hasSelectedValidTarget: boolean
    private cancelAbility: boolean
    private hasConfirmedAction: boolean
    private validTargetLocation?: HexCoordinate
    private highlightedTargetRange: HexCoordinate[]

    constructor() {
        this.resetObject()
    }

    private get hasHighlightedTargetRange(): boolean {
        return this.highlightedTargetRange.length > 0
    }

    hasCompleted(state: GameEngineState): boolean {
        const userWantsADifferentAbility: boolean = this.cancelAbility === true
        const userConfirmedTarget: boolean = this.hasConfirmedAction === true
        return userWantsADifferentAbility || userConfirmedTarget
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
            return
        }

        if (!this.hasConfirmedAction) {
            this.waitingForConfirmation({ gameEngineState, mouseEvent })
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
            return
        }

        if (!this.hasConfirmedAction) {
            this.waitingForConfirmation({ gameEngineState, keyboardEvent })
        }
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: !this.shouldDrawConfirmWindow(),
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

        if (this.hasSelectedValidTarget && !this.hasConfirmedAction) {
            this.drawConfirmWindow(gameEngineState, graphicsContext)
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
        }
        if (this.hasConfirmedAction) {
            this.movePopoversPositions(
                gameEngineState,
                SquaddieSummaryPopoverPosition.ANIMATE_SQUADDIE_ACTION
            )
        }
        if (this.cancelAbility || this.hasConfirmedAction) {
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            }
        }

        return undefined
    }

    reset(state: GameEngineState) {
        this.resetObject()
    }

    shouldDrawConfirmWindow(): boolean {
        return this.hasSelectedValidTarget === true
    }

    private waitingForConfirmation({
        gameEngineState,
        mouseEvent,
        keyboardEvent,
    }: {
        gameEngineState: GameEngineState
        mouseEvent?: OrchestratorComponentMouseEventClicked
        keyboardEvent?: OrchestratorComponentKeyEvent
    }) {
        if (
            this.didUserCancelActionConfirmation({
                gameEngineState,
                mouseEvent,
                keyboardEvent,
            })
        ) {
            this.hasSelectedValidTarget = false
            this.highlightTargetRange(gameEngineState)
            return
        }

        if (
            !this.didUserConfirmActionConfirmation({
                gameEngineState,
                mouseEvent,
                keyboardEvent,
            })
        ) {
            return
        }

        this.confirmTargetSelection(gameEngineState)
    }

    private didUserConfirmActionConfirmation({
        gameEngineState,
        mouseEvent,
        keyboardEvent,
    }: {
        gameEngineState: GameEngineState
        mouseEvent?: OrchestratorComponentMouseEventClicked
        keyboardEvent?: OrchestratorComponentKeyEvent
    }) {
        if (
            isValidValue(mouseEvent) &&
            mouseEvent.mouseButton !== MouseButton.ACCEPT
        ) {
            return false
        }
        if (
            isValidValue(keyboardEvent) &&
            KeyWasPressed(KeyButtonName.ACCEPT, keyboardEvent.keyCode) !== true
        ) {
            return false
        }
        return true
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
            let repositionWindow = {
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2,
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
            }
            if (
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState?.playerCommandState?.playerCommandWindow
            ) {
                repositionWindow.mouseX =
                    RectAreaService.left(
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState.playerCommandState
                            .playerCommandWindow.area
                    ) + HEX_TILE_WIDTH
                repositionWindow.mouseY =
                    RectAreaService.top(
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState.playerCommandState
                            .playerCommandWindow.area
                    ) - HEX_TILE_WIDTH
            }

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
                        mouseSelectionLocation: {
                            x: repositionWindow.mouseX,
                            y: repositionWindow.mouseY,
                        },
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

    private didUserCancelActionConfirmation = ({
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
        this.hasConfirmedAction = false
        this.highlightedTargetRange = []
        this.cancelAbility = false
        this.hasSelectedValidTarget = false
        this.validTargetLocation = undefined
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
        const coordinates = convertScreenCoordinatesToMapCoordinates(
            mouseX,
            mouseY,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        )

        const clickedLocation: HexCoordinate = {
            q: coordinates[0],
            r: coordinates[1],
        }

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

        const { squaddieTemplate: actingSquaddieTemplate } =
            getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.battleSquaddieId
                )
            )

        const actorAndTargetAreFriends: boolean =
            FriendlyAffiliationsByAffiliation[
                actingSquaddieTemplate.squaddieId.affiliation
            ][targetSquaddieTemplate.squaddieId.affiliation]

        const actionTemplate = actingSquaddieTemplate.actionTemplates.find(
            (template) =>
                template.id ===
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound.previewedActionTemplateId
        )

        if (!isValidValue(actionTemplate)) {
            return
        }

        const actionEffectTemplate = actionTemplate.actionEffectTemplates[0]
        if (actionEffectTemplate.type !== ActionEffectType.SQUADDIE) {
            return
        }

        if (
            actorAndTargetAreFriends &&
            actionEffectTemplate.traits.booleanTraits[Trait.TARGETS_ALLIES] !==
                true
        ) {
            return
        }
        if (
            !actorAndTargetAreFriends &&
            actionEffectTemplate.traits.booleanTraits[Trait.TARGETS_ALLIES] ===
                true
        ) {
            return
        }

        const cameraCoordinates =
            gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked(
            {
                mouseX,
                mouseY,
                mouseButton,
                cameraX: cameraCoordinates[0],
                cameraY: cameraCoordinates[1],
            }
        )
        this.hasSelectedValidTarget = true
        this.validTargetLocation = clickedLocation

        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()
        PlayerBattleActionBuilderStateService.setConsideredTarget({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            targetLocation: clickedLocation,
        })

        SummaryHUDStateService.setTargetSummaryPopover({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            battleSquaddieId: targetBattleSquaddie.battleSquaddieId,
            gameEngineState,
            objectRepository: gameEngineState.repository,
            resourceHandler: gameEngineState.resourceHandler,
            position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
        })
    }

    private drawConfirmWindow(
        state: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        this.drawButton(
            RectAreaService.new({
                left: 0,
                top: TARGET_CANCEL_BUTTON_TOP,
                width: ScreenDimensions.SCREEN_WIDTH,
                height:
                    ScreenDimensions.SCREEN_HEIGHT - TARGET_CANCEL_BUTTON_TOP,
            }),
            "CANCEL: Click here.",
            graphicsContext
        )

        let actingSquaddieModifiers: {
            [modifier in ATTACK_MODIFIER]?: number
        } = {}
        let { multipleAttackPenalty } =
            ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(
                state.battleOrchestratorState.battleState.actionsThisRound
            )
        if (multipleAttackPenalty !== 0) {
            actingSquaddieModifiers[ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY] =
                multipleAttackPenalty
        }

        const { found, actionTemplate, actionEffectSquaddieTemplate } =
            getActionEffectSquaddieTemplate({ gameEngineState: state })
        if (!found) {
            return
        }

        const intentMessages = ActionResultTextService.outputIntentForTextOnly({
            currentActionEffectSquaddieTemplate: actionEffectSquaddieTemplate,
            actionTemplate,
            actingBattleSquaddieId:
                state.battleOrchestratorState.battleState.actionsThisRound
                    .battleSquaddieId,
            squaddieRepository: state.repository,
            actingSquaddieModifiers,
        })

        intentMessages.push(
            ...["", "CONFIRM: Left Mouse Button", "CANCEL: Right Mouse Button"]
        )

        const messageToShow = intentMessages.join("\n")

        this.drawButton(
            RectAreaService.new({
                left: ScreenDimensions.SCREEN_WIDTH / 12,
                top: ScreenDimensions.SCREEN_HEIGHT / 2,
                width: BUTTON_MIDDLE_DIVIDER,
                height: MESSAGE_TEXT_SIZE * (intentMessages.length + 2),
            }),
            messageToShow,
            graphicsContext
        )
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

    private confirmTargetSelection(gameEngineState: GameEngineState) {
        let actionsThisRound =
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        const {
            squaddieTemplate: actingSquaddieTemplate,
            battleSquaddie: actingBattleSquaddie,
        } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                actionsThisRound.battleSquaddieId
            )
        )

        const actionTemplate = actingSquaddieTemplate.actionTemplates.find(
            (template) =>
                template.id === actionsThisRound.previewedActionTemplateId
        )
        let firstActionEffectTemplate = actionTemplate.actionEffectTemplates[0]
        if (firstActionEffectTemplate.type !== ActionEffectType.SQUADDIE) {
            return
        }

        SquaddieTurnService.spendActionPoints(
            actingBattleSquaddie.squaddieTurn,
            actionTemplate.actionPoints
        )
        gameEngineState.battleOrchestratorState.battleState.actionsThisRound.previewedActionTemplateId =
            undefined

        const decidedAction = createDecidedAction(
            actionsThisRound,
            actionTemplate,
            firstActionEffectTemplate,
            this.validTargetLocation
        )
        const processedAction = ProcessedActionService.new({
            decidedAction,
        })
        actionsThisRound.processedActions.push(processedAction)

        let results: SquaddieSquaddieResults =
            ActionCalculator.calculateResults({
                gameEngineState: gameEngineState,
                actingBattleSquaddie,
                validTargetLocation: this.validTargetLocation,
                actionsThisRound:
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound,
                actionEffect:
                    ActionsThisRoundService.getDecidedButNotProcessedActionEffect(
                        gameEngineState.battleOrchestratorState.battleState
                            .actionsThisRound
                    ).decidedActionEffect,
            })
        processedAction.processedActionEffects.push(
            ProcessedActionSquaddieEffectService.new({
                decidedActionEffect: decidedAction.actionEffects.find(
                    (actionEffect) =>
                        actionEffect.type === ActionEffectType.SQUADDIE
                ) as DecidedActionSquaddieEffect,
                results,
            })
        )
        addEventToRecording(processedAction, results, gameEngineState)

        PlayerBattleActionBuilderStateService.confirmAlreadyConsideredTarget({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
        })

        const getBattleActionSquaddieChange = (
            targetBattleSquaddieId: string,
            actionResultPerSquaddie: ActionResultPerSquaddie
        ): BattleActionSquaddieChange => {
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    targetBattleSquaddieId
                )
            )
            return {
                battleSquaddieId: targetBattleSquaddieId,
                attributesAfter: battleSquaddie.inBattleAttributes,
                result: actionResultPerSquaddie,
            }
        }

        const squaddieChanges: BattleActionSquaddieChange[] = Object.entries(
            results.resultPerTarget
        ).map(([targetBattleSquaddieId, actionResultPerSquaddie]) =>
            getBattleActionSquaddieChange(
                targetBattleSquaddieId,
                actionResultPerSquaddie
            )
        )

        const squaddieBattleAction = BattleActionService.new({
            actor: {
                battleSquaddieId: actingBattleSquaddie.battleSquaddieId,
            },
            action: { id: actionTemplate.id },
            effect: {
                squaddie: squaddieChanges,
            },
        })

        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            squaddieBattleAction
        )

        this.hasConfirmedAction = true
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
                mouse: {
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

const getActionEffectSquaddieTemplate = ({
    gameEngineState,
}: {
    gameEngineState: GameEngineState
}): {
    found: boolean
    actionTemplate: ActionTemplate
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate
} => {
    const { squaddieTemplate: actingSquaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        )
    )
    const actionTemplate = actingSquaddieTemplate.actionTemplates.find(
        (template) =>
            template.id ===
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .previewedActionTemplateId
    )
    if (!isValidValue(actionTemplate)) {
        return {
            found: false,
            actionTemplate,
            actionEffectSquaddieTemplate: undefined,
        }
    }

    const actionEffectTemplate = actionTemplate.actionEffectTemplates[0]
    if (actionEffectTemplate.type !== ActionEffectType.SQUADDIE) {
        return {
            found: false,
            actionTemplate,
            actionEffectSquaddieTemplate: undefined,
        }
    }

    return {
        found: true,
        actionTemplate,
        actionEffectSquaddieTemplate: actionEffectTemplate,
    }
}

const createDecidedAction = (
    actionsThisRound: ActionsThisRound,
    actionTemplate: ActionTemplate,
    firstActionEffectTemplate: ActionEffectSquaddieTemplate,
    targetLocation: HexCoordinate
) => {
    return DecidedActionService.new({
        battleSquaddieId: actionsThisRound.battleSquaddieId,
        actionTemplateName: actionTemplate.name,
        actionTemplateId: actionTemplate.id,
        actionPointCost: actionTemplate.actionPoints,
        actionEffects: [
            DecidedActionSquaddieEffectService.new({
                template: firstActionEffectTemplate,
                target: targetLocation,
            }),
        ],
    })
}

const addEventToRecording = (
    processedAction: ProcessedAction,
    results: SquaddieSquaddieResults,
    state: GameEngineState
) => {
    const newEvent: BattleEvent = BattleEventService.new({
        processedAction,
        results,
    })
    RecordingService.addEvent(
        state.battleOrchestratorState.battleState.recording,
        newEvent
    )
}
