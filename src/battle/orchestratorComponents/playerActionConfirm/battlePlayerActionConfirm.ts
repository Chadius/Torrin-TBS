import { GOLDEN_RATIO, WINDOW_SPACING } from "../../../ui/constants"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../../orchestrator/battleOrchestratorComponent"
import { UIControlSettings } from "../../orchestrator/uiControlSettings"
import { BattleOrchestratorMode } from "../../orchestrator/battleOrchestrator"
import { TargetingResultsService } from "../../targeting/targetingService"
import { OrchestratorUtilities } from "../orchestratorUtils"
import { isValidValue } from "../../../utils/objectValidityCheck"
import {
    MouseButton,
    MousePress,
    MouseRelease,
    ScreenLocation,
} from "../../../utils/mouseConfig"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { ResourceHandler } from "../../../resource/resourceHandler"
import {
    PlayerInputAction,
    PlayerInputStateService,
} from "../../../ui/playerInput/playerInputState"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { SequenceComposite } from "../../../utils/behaviorTree/composite/sequence/sequence"
import { ExecuteAllComposite } from "../../../utils/behaviorTree/composite/executeAll/executeAll"
import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import {
    PlayerActionConfirmCreateOKButton,
    PlayerActionConfirmShouldCreateOKButton,
} from "./okButton"
import { Button } from "../../../ui/button/button"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { ButtonStatusChangeEventByButtonId } from "../../../ui/button/logic/base"
import {
    PlayerActionConfirmCreateCancelButton,
    PlayerActionConfirmShouldCreateCancelButton,
} from "./cancelButton"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import { BattleCamera } from "../../battleCamera"
import { HEX_TILE_HEIGHT } from "../../../graphicsConstants"
import { DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT } from "../../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import { ImageUI } from "../../../ui/imageUI/imageUI"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"

export interface PlayerActionConfirmLayout {
    okButton: {
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
    cancelButton: {
        height: number
        width: number
        text: string
        fontSize: number
        fillColor: number[]
        strokeColor: number[]
        strokeWeight: number
        fontColor: number[]
        textBoxMargin: number[]
        margin: number[]
        selectedBorder: {
            strokeColor: number[]
            strokeWeight: number
        }
        activeFill: {
            fillColor: number[]
        }
    }
}

export interface PlayerActionConfirmContext {
    buttonStatusChangeEventDataBlob: ButtonStatusChangeEventByButtonId
    battleActionDecisionStep: BattleActionDecisionStep
    camera: BattleCamera
}

export interface PlayerActionConfirmUIObjects {
    okButton: Button
    cancelButton: Button
    graphicsContext?: GraphicsBuffer
    camera?: BattleCamera
    mapIcons: {
        actor: {
            mapIcon?: ImageUI
            hasTinted: boolean
        }
        targets: {
            mapIcons: ImageUI[]
            hasTinted: boolean
        }
    }
}

export class BattlePlayerActionConfirm implements BattleOrchestratorComponent {
    private cancelAbility: boolean
    private hasConfirmedAction: boolean

    data: ComponentDataBlob<
        PlayerActionConfirmLayout,
        PlayerActionConfirmContext,
        PlayerActionConfirmUIObjects
    >
    drawUITask: BehaviorTreeTask

    constructor() {
        this.resetObject()
        this.createContext()
        this.createLayout()
        this.resetUIObjects()
        this.createDrawingTask()
    }

    hasCompleted(_gameEngineState: GameEngineState): boolean {
        const userWantsADifferentAbility: boolean = this.cancelAbility === true
        const userConfirmedTarget: boolean = this.hasConfirmedAction === true
        return userWantsADifferentAbility || userConfirmedTarget
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void {
        switch (mouseEvent.eventType) {
            case OrchestratorComponentMouseEventType.PRESS:
                return this.mousePressed(gameEngineState, mouseEvent.mousePress)
            case OrchestratorComponentMouseEventType.RELEASE:
                return this.mouseReleased(
                    gameEngineState,
                    mouseEvent.mouseRelease
                )
            case OrchestratorComponentMouseEventType.LOCATION:
                return this.mouseMoved(
                    gameEngineState,
                    mouseEvent.mouseLocation
                )
        }
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        keyboardEvent: OrchestratorComponentKeyEvent
    ): void {
        this.keyPressed(gameEngineState, keyboardEvent)
    }

    mousePressed(gameEngineState: GameEngineState, mousePress: MousePress) {
        this.getButtons().forEach((button) => {
            button.mousePressed({
                mousePress,
            })
        })
        const uiObjects: PlayerActionConfirmUIObjects = this.data.getUIObjects()
        if (
            uiObjects.okButton?.getStatusChangeEvent()?.mousePress != undefined
        ) {
            this.reactToOKButtonStatusChangeEvent(gameEngineState)
        }
        if (
            uiObjects.cancelButton?.getStatusChangeEvent()?.mousePress !=
            undefined
        ) {
            this.reactToCancelButtonStatusChangeEvent(gameEngineState)
        }
    }

    mouseReleased(
        gameEngineState: GameEngineState,
        mouseRelease: MouseRelease
    ) {
        if (mouseRelease.button == MouseButton.CANCEL) {
            this.userCancels(gameEngineState)
        }

        this.getButtons().forEach((button) => {
            button.mouseReleased({
                mouseRelease,
            })
        })

        const uiObjects: PlayerActionConfirmUIObjects = this.data.getUIObjects()
        if (
            uiObjects.okButton?.getStatusChangeEvent()?.mouseRelease !=
            undefined
        ) {
            this.reactToOKButtonStatusChangeEvent(gameEngineState)
        }
        if (
            uiObjects.cancelButton?.getStatusChangeEvent()?.mouseRelease !=
            undefined
        ) {
            this.reactToCancelButtonStatusChangeEvent(gameEngineState)
        }
    }

    keyPressed(
        gameEngineState: GameEngineState,
        keyboardEvent: OrchestratorComponentKeyEvent
    ) {
        if (
            keyboardEvent.eventType !==
            OrchestratorComponentKeyEventType.PRESSED
        ) {
            return
        }

        const actions: PlayerInputAction[] = isValidValue(keyboardEvent)
            ? PlayerInputStateService.getActionsForPressedKey(
                  gameEngineState.playerInputState,
                  keyboardEvent.keyCode
              )
            : []
        if (
            isValidValue(keyboardEvent) &&
            actions.includes(PlayerInputAction.CANCEL)
        ) {
            TargetingResultsService.highlightTargetRange({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
            })
            this.cancelAbility = true
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
            })
            return
        }

        if (
            isValidValue(keyboardEvent) &&
            actions.includes(PlayerInputAction.ACCEPT)
        ) {
            this.hasConfirmedAction = true
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                numberGenerator:
                    gameEngineState.battleOrchestratorState.numberGenerator,
                missionStatistics:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionStatistics,
            })
        }
    }

    uiControlSettings(_state: GameEngineState): UIControlSettings {
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
        resourceHandler: ResourceHandler
    }): void {
        if (this.hasCompleted(gameEngineState)) {
            return
        }

        this.updateContextDuringDraw(gameEngineState)
        this.updateUIObjectsDuringDraw({
            graphicsContext: graphicsContext,
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            objectRepository: gameEngineState.repository,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
        })
        this.drawUITask.run()
        this.getButtons().forEach((button) => {
            DataBlobService.add<GraphicsBuffer>(
                button.buttonStyle.dataBlob,
                "graphicsContext",
                graphicsContext
            )
            button.draw()
        })
        this.getButtons().forEach((button) => {
            button.clearStatus()
        })
    }

    private highlightActorSquaddie({
        battleActionDecisionStep,
        objectRepository,
        uiObjects,
    }: {
        battleActionDecisionStep: BattleActionDecisionStep
        objectRepository: ObjectRepository
        uiObjects: PlayerActionConfirmUIObjects
    }) {
        if (
            !BattleActionDecisionStepService.isActorSet(
                battleActionDecisionStep
            ) ||
            uiObjects.mapIcons.actor.hasTinted
        ) {
            return
        }

        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            battleActionDecisionStep
        ).battleSquaddieId

        const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId({
            repository: objectRepository,
            battleSquaddieId: battleSquaddieId,
            throwErrorIfNotFound: false,
        })

        if (!mapIcon) return

        mapIcon.setPulseColor(
            DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.actorSquaddie.pulseColorForMapIcon
        )

        uiObjects.mapIcons.actor.mapIcon = mapIcon
        uiObjects.mapIcons.actor.hasTinted = true
    }

    private highlightTargetSquaddies({
        battleActionDecisionStep,
        missionMap,
        objectRepository,
        uiObjects,
    }: {
        missionMap: MissionMap
        battleActionDecisionStep: BattleActionDecisionStep
        objectRepository: ObjectRepository
        uiObjects: PlayerActionConfirmUIObjects
    }) {
        if (uiObjects.mapIcons.targets.hasTinted) return

        let squaddiesToHighlight = this.getSquaddiesToHighlight({
            battleActionDecisionStep,
            missionMap,
        })
            .filter((x) => x)
            .filter(
                (battleSquaddieId) =>
                    !!ObjectRepositoryService.getImageUIByBattleSquaddieId({
                        repository: objectRepository,
                        battleSquaddieId: battleSquaddieId,
                        throwErrorIfNotFound: false,
                    })
            )
        uiObjects.mapIcons.targets.mapIcons ||= []

        squaddiesToHighlight.forEach((battleSquaddieId) => {
            const mapIcon =
                ObjectRepositoryService.getImageUIByBattleSquaddieId({
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddieId,
                    throwErrorIfNotFound: false,
                })
            uiObjects.mapIcons.targets.mapIcons.push(mapIcon)

            mapIcon.setPulseColor(
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.targetEnemySquaddie
                    .pulseColorForMapIcon
            )
        })

        if (squaddiesToHighlight.length > 0) {
            uiObjects.mapIcons.targets.hasTinted = true
        }
    }

    private getSquaddiesToHighlight({
        battleActionDecisionStep,
        missionMap,
    }: {
        missionMap: MissionMap
        battleActionDecisionStep: BattleActionDecisionStep
    }) {
        if (
            BattleActionDecisionStepService.isTargetConfirmed(
                battleActionDecisionStep
            )
        ) {
            return [
                MissionMapService.getBattleSquaddieAtCoordinate(
                    missionMap,
                    BattleActionDecisionStepService.getTarget(
                        battleActionDecisionStep
                    ).targetCoordinate
                )?.battleSquaddieId,
            ]
        }
        return [
            MissionMapService.getBattleSquaddieAtCoordinate(
                missionMap,
                this.data.getContext().battleActionDecisionStep.target
                    .targetCoordinate
            )?.battleSquaddieId,
        ]
    }

    private updateUIObjectsDuringDraw({
        graphicsContext,
        battleActionDecisionStep,
        objectRepository,
        missionMap,
    }: {
        graphicsContext: GraphicsBuffer
        battleActionDecisionStep: BattleActionDecisionStep
        objectRepository: ObjectRepository
        missionMap: MissionMap
    }) {
        const uiObjects: PlayerActionConfirmUIObjects = this.data.getUIObjects()
        uiObjects.graphicsContext = graphicsContext
        this.highlightActorSquaddie({
            battleActionDecisionStep,
            objectRepository,
            uiObjects,
        })
        this.highlightTargetSquaddies({
            battleActionDecisionStep,
            missionMap,
            objectRepository,
            uiObjects,
        })
        this.data.setUIObjects(uiObjects)
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        if (this.cancelAbility) {
            return {
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET,
            }
        }
        if (this.hasConfirmedAction) {
            return {
                nextMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
            }
        }

        return undefined
    }

    reset(_gameEngineState: GameEngineState) {
        this.resetObject()
    }

    private resetObject() {
        this.hasConfirmedAction = false
        this.cancelAbility = false

        this.data = new ComponentDataBlob()

        this.drawUITask = undefined
        this.createContext()
        this.createLayout()
        this.resetUIObjects()
        this.createDrawingTask()
    }

    private createContext() {
        this.data.setContext({
            buttonStatusChangeEventDataBlob: DataBlobService.new(),
            battleActionDecisionStep: undefined,
            camera: undefined,
        })
    }

    private createLayout() {
        const okButtonHeight = HEX_TILE_HEIGHT * GOLDEN_RATIO
        this.data.setLayout({
            okButton: {
                width: ScreenDimensions.SCREEN_WIDTH / 12,
                topOffset: HEX_TILE_HEIGHT / 2,
                height: okButtonHeight,
                text: "OK",
                fontSize: 24,
                fillColor: [0, 0, 128],
                strokeColor: [0, 0, 0],
                strokeWeight: 2,
                fontColor: [0, 0, 16],
                textBoxMargin: [0, 0, 0, 0],
                margin: 0,
                selectedBorder: {
                    strokeColor: [0, 85, 50],
                    strokeWeight: 8,
                },
                activeFill: {
                    fillColor: [0, 0, 64],
                },
            },
            cancelButton: {
                height: okButtonHeight * (GOLDEN_RATIO - 1),
                width:
                    (ScreenDimensions.SCREEN_WIDTH / 12) * (GOLDEN_RATIO - 1),
                text: "Cancel",
                fontSize: 16,
                fillColor: [0, 0, 64],
                strokeColor: [0, 0, 0],
                strokeWeight: 1,
                fontColor: [0, 0, 16],
                textBoxMargin: [0, 0, 0, 0],
                margin: [0, WINDOW_SPACING.SPACING1],
                selectedBorder: {
                    strokeColor: [0, 85, 50],
                    strokeWeight: 4,
                },
                activeFill: {
                    fillColor: [0, 0, 32],
                },
            },
        })
    }

    private resetUIObjects() {
        const oldUiObjects = this.data.getUIObjects()
        ;[
            oldUiObjects?.mapIcons.actor.mapIcon,
            ...(oldUiObjects?.mapIcons.targets.mapIcons ?? []),
        ]
            .filter((x) => x)
            .forEach((mapIcon) => {
                mapIcon.removePulseColor()
            })

        const uiObjects: PlayerActionConfirmUIObjects = {
            okButton: undefined,
            cancelButton: undefined,
            graphicsContext: undefined,
            mapIcons: {
                actor: {
                    mapIcon: undefined,
                    hasTinted: false,
                },
                targets: {
                    mapIcons: [],
                    hasTinted: false,
                },
            },
        }
        this.data.setUIObjects(uiObjects)
    }

    private createDrawingTask() {
        const createOKButtonTask = new SequenceComposite(this.data, [
            new PlayerActionConfirmShouldCreateOKButton(this.data),
            new PlayerActionConfirmCreateOKButton(this.data),
        ])

        const createCancelButtonTask = new SequenceComposite(this.data, [
            new PlayerActionConfirmShouldCreateCancelButton(this.data),
            new PlayerActionConfirmCreateCancelButton(this.data),
        ])

        this.drawUITask = new ExecuteAllComposite(this.data, [
            createOKButtonTask,
            createCancelButtonTask,
        ])
    }

    getButtons() {
        const uiObjects: PlayerActionConfirmUIObjects = this.data.getUIObjects()
        return [uiObjects.okButton, uiObjects.cancelButton].filter((x) => x)
    }

    reactToOKButtonStatusChangeEvent(gameEngineState: GameEngineState) {
        const uiObjects: PlayerActionConfirmUIObjects = this.data.getUIObjects()
        const okButton = uiObjects.okButton
        const statusChangeEvent = okButton.getStatusChangeEvent()
        if (
            !(
                statusChangeEvent?.previousStatus == ButtonStatus.ACTIVE &&
                statusChangeEvent?.newStatus == ButtonStatus.HOVER
            )
        )
            return
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            objectRepository: gameEngineState.repository,
            battleActionRecorder:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
            numberGenerator:
                gameEngineState.battleOrchestratorState.numberGenerator,
            missionStatistics:
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics,
        })
        this.hasConfirmedAction = true
    }

    reactToCancelButtonStatusChangeEvent(gameEngineState: GameEngineState) {
        const uiObjects: PlayerActionConfirmUIObjects = this.data.getUIObjects()
        const cancelButton = uiObjects.cancelButton
        const statusChangeEvent = cancelButton.getStatusChangeEvent()
        if (
            !(
                statusChangeEvent?.previousStatus == ButtonStatus.ACTIVE &&
                statusChangeEvent?.newStatus == ButtonStatus.HOVER
            )
        )
            return
        this.userCancels(gameEngineState)
    }

    private userCancels = (gameEngineState: GameEngineState) => {
        TargetingResultsService.highlightTargetRange({
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            objectRepository: gameEngineState.repository,
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleActionRecorder:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
        })
        this.cancelAbility = true
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            objectRepository: gameEngineState.repository,
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleActionRecorder:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
        })
    }

    private mouseMoved(
        gameEngineState: GameEngineState,
        mouseLocation: ScreenLocation
    ) {
        this.getButtons().forEach((button) => {
            button.mouseMoved({
                mouseLocation,
            })
        })

        const uiObjects: PlayerActionConfirmUIObjects = this.data.getUIObjects()
        if (
            uiObjects.okButton?.getStatusChangeEvent()?.mouseLocation !=
            undefined
        ) {
            this.reactToOKButtonStatusChangeEvent(gameEngineState)
        }
        if (
            uiObjects.cancelButton?.getStatusChangeEvent()?.mouseLocation !=
            undefined
        ) {
            this.reactToCancelButtonStatusChangeEvent(gameEngineState)
        }
    }

    private updateContextDuringDraw(gameEngineState: GameEngineState) {
        const context: PlayerActionConfirmContext = this.data.getContext()
        context.battleActionDecisionStep =
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep
        context.camera =
            gameEngineState.battleOrchestratorState.battleState.camera
        this.data.setContext(context)
    }
}
