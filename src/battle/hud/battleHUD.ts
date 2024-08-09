import { FileAccessHUD, FileAccessHUDService } from "./fileAccessHUD"
import { getValidValueOrDefault, isValidValue } from "../../utils/validityCheck"
import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessagePlayerCancelsTargetConfirmation,
    MessageBoardMessagePlayerCancelsTargetSelection,
    MessageBoardMessagePlayerConfirmsAction,
    MessageBoardMessagePlayerPeeksAtSquaddie,
    MessageBoardMessagePlayerSelectionIsInvalid,
    MessageBoardMessagePlayerSelectsActionThatRequiresATarget,
    MessageBoardMessagePlayerSelectsAndLocksSquaddie,
    MessageBoardMessagePlayerSelectsTargetLocation,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import {
    PopupWindow,
    PopupWindowService,
    PopupWindowStatus,
} from "./popupWindow"
import { BattleCamera } from "../battleCamera"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { LabelService, TextBoxMargin } from "../../ui/label"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { MissionMapService } from "../../missionMap/missionMap"
import {
    ConvertCoordinateService,
    convertScreenCoordinatesToWorldCoordinates,
} from "../../hexMap/convertCoordinates"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { OrchestratorUtilities } from "../orchestratorComponents/orchestratorUtils"
import { VERTICAL_ALIGN } from "../../ui/constants"
import * as p5 from "p5"
import { HEX_TILE_WIDTH } from "../../graphicsConstants"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { HighlightPulseRedColor } from "../../hexMap/hexDrawingUtils"
import { TargetingResultsService } from "../targeting/targetingService"
import { DecidedActionEndTurnEffectService } from "../../action/decided/decidedActionEndTurnEffect"
import { ActionEffectEndTurnTemplateService } from "../../action/template/actionEffectEndTurnTemplate"
import {
    ProcessedAction,
    ProcessedActionService,
} from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { ProcessedActionEndTurnEffectService } from "../../action/processed/processedActionEndTurnEffect"
import { RecordingService } from "../history/recording"
import { BattleEvent, BattleEventService } from "../history/battleEvent"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SummaryHUDStateService } from "./summaryHUD"
import {
    BattleAction,
    BattleActionQueueService,
    BattleActionService,
} from "../history/battleAction"
import {
    SquaddieSummaryPopoverPosition,
    SquaddieSummaryPopoverService,
} from "./playerActionPanel/squaddieSummaryPopover"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { SquaddieTurnService } from "../../squaddie/turn"
import { SquaddieSquaddieResults } from "../history/squaddieSquaddieResults"
import { ActionCalculator } from "../actionCalculator/calculator"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import {
    DecidedActionSquaddieEffect,
    DecidedActionSquaddieEffectService,
} from "../../action/decided/decidedActionSquaddieEffect"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import { BattleActionSquaddieChange } from "../history/battleActionSquaddieChange"

const SUMMARY_POPOVER_PEEK_EXPIRATION_MS = 2000

export enum PopupWindowType {
    DIFFERENT_SQUADDIE_TURN = "DIFFERENT_SQUADDIE_TURN",
    PLAYER_INVALID_SELECTION = "PLAYER_INVALID_SELECTION",
}

export interface BattleHUD {
    fileAccessHUD: FileAccessHUD
    popupWindows: {
        [key in PopupWindowType]: PopupWindow
    }
}

const warningPopupConstants: {
    width: number
    label: {
        fillColor: number[]
        textSize: number
        vertAlign: p5.VERT_ALIGN
        fontColor: number[]
    } & TextBoxMargin
    height: number
} = {
    label: {
        textSize: 16,
        fontColor: [245, 20, 90],
        fillColor: [60, 40, 10],
        vertAlign: VERTICAL_ALIGN.CENTER,
        textBoxMargin: 8,
    },
    width: 150,
    height: 80,
}

export const BattleHUDService = {
    new: ({ fileAccessHUD }: { fileAccessHUD?: FileAccessHUD }): BattleHUD => {
        return {
            fileAccessHUD: getValidValueOrDefault(
                fileAccessHUD,
                FileAccessHUDService.new({})
            ),
            popupWindows: {
                [PopupWindowType.DIFFERENT_SQUADDIE_TURN]: undefined,
                [PopupWindowType.PLAYER_INVALID_SELECTION]: undefined,
            },
        }
    },
    draw: (battleHUD: BattleHUD, graphicsContext: GraphicsBuffer) => {
        Object.values(battleHUD.popupWindows)
            .filter(isValidValue)
            .forEach((popupWindow) => {
                PopupWindowService.draw(popupWindow, graphicsContext)
            })
    },
    setPopupWindow: (
        battleHUD: BattleHUD,
        popupWindow: PopupWindow,
        popupWindowType: PopupWindowType
    ) => {
        battleHUD.popupWindows[popupWindowType] = popupWindow
    },
    createPlayerSelectsDifferentSquaddieMidTurnPopup: (
        battleHUD: BattleHUD,
        gameEngineState: GameEngineState
    ) => {
        let { popupText, labelArea, camera } = calculateMidTurnPopup(
            gameEngineState.battleOrchestratorState.battleState
                .actionsThisRound,
            gameEngineState
        )

        const differentSquaddiePopup: PopupWindow = PopupWindowService.new({
            label: LabelService.new({
                area: labelArea,
                text: popupText,
                ...warningPopupConstants.label,
            }),
            camera,
        })
        PopupWindowService.changeStatus(
            differentSquaddiePopup,
            PopupWindowStatus.ACTIVE
        )
        PopupWindowService.setInactiveAfterTimeElapsed(
            differentSquaddiePopup,
            2000
        )

        BattleHUDService.setPopupWindow(
            battleHUD,
            differentSquaddiePopup,
            PopupWindowType.DIFFERENT_SQUADDIE_TURN
        )
    },
    createPlayerInvalidSelectionPopup: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerSelectionIsInvalid
    ) => {
        let gameEngineState = message.gameEngineState

        let { popupText, labelArea, camera } =
            calculatePlayerInvalidSelectionPopup(gameEngineState, message)

        const differentSquaddiePopup: PopupWindow = PopupWindowService.new({
            label: LabelService.new({
                area: labelArea,
                text: popupText,
                ...warningPopupConstants.label,
            }),
            camera,
        })
        PopupWindowService.changeStatus(
            differentSquaddiePopup,
            PopupWindowStatus.ACTIVE
        )
        PopupWindowService.setInactiveAfterTimeElapsed(
            differentSquaddiePopup,
            2000
        )

        BattleHUDService.setPopupWindow(
            battleHUD,
            differentSquaddiePopup,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )
    },
    cancelTargetSelection: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerCancelsTargetSelection
    ) => {
        const gameEngineState = message.gameEngineState
        const battleSquaddieToHighlightId: string =
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId

        OrchestratorUtilities.highlightSquaddieRange(
            gameEngineState,
            battleSquaddieToHighlightId
        )
        gameEngineState.battleOrchestratorState.battleState.actionsThisRound.previewedActionTemplateId =
            undefined

        BattleActionDecisionStepService.removeAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
        })

        if (
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .processedActions.length === 0
        ) {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
                undefined
            gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
                undefined
        }
    },
    cancelTargetConfirmation: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerCancelsTargetConfirmation
    ) => {
        const gameEngineState = message.gameEngineState
        const actionRange =
            TargetingResultsService.highlightTargetRange(gameEngineState)

        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()
        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles(
            [
                {
                    tiles: actionRange,
                    pulseColor: HighlightPulseRedColor,
                    overlayImageResourceName: "map icon attack 1 action",
                },
            ]
        )

        BattleActionDecisionStepService.removeTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
        })
    },
    endPlayerSquaddieTurn: (
        gameEngineState: GameEngineState,
        battleAction: BattleAction
    ) => {
        const { battleSquaddie } = getResultOrThrowError(
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

        processEndTurnAction(gameEngineState, battleSquaddie, mapLocation)

        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()

        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            battleAction
        )
    },
    playerSelectsSquaddie: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerSelectsAndLocksSquaddie
    ) => {
        const gameEngineState = message.gameEngineState
        const battleSquaddieId = message.battleSquaddieSelectedId

        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            SummaryHUDStateService.new({
                mouseSelectionLocation: message.selectionMethod.mouse
                    ? {
                          x: message.selectionMethod.mouse.x,
                          y: message.selectionMethod.mouse.y,
                      }
                    : { x: 0, y: 0 },
            })

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )
        const { squaddieIsNormallyControllableByPlayer } =
            SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })

        if (squaddieIsNormallyControllableByPlayer) {
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                battleSquaddieId,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            SummaryHUDStateService.createCommandWindow({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                gameEngineState,
            })
        } else {
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                battleSquaddieId,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
        }
    },
    playerPeeksAtSquaddie: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerPeeksAtSquaddie
    ) => {
        const gameEngineState = message.gameEngineState
        const battleSquaddieId = message.battleSquaddieSelectedId
        const squaddieSummaryPopoverPosition =
            message.squaddieSummaryPopoverPosition

        if (
            !isValidValue(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            )
        ) {
            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new({
                    mouseSelectionLocation: message.selectionMethod.mouse
                        ? {
                              x: message.selectionMethod.mouse.x,
                              y: message.selectionMethod.mouse.y,
                          }
                        : { x: 0, y: 0 },
                })
        }

        const popoverArgs = {
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            battleSquaddieId,
            resourceHandler: gameEngineState.resourceHandler,
            objectRepository: gameEngineState.repository,
            gameEngineState,
            expirationTime: Date.now() + SUMMARY_POPOVER_PEEK_EXPIRATION_MS,
            position: squaddieSummaryPopoverPosition,
        }

        switch (true) {
            case !isValidValue(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
            ):
            case SquaddieSummaryPopoverService.willExpireOverTime({
                squaddieSummaryPopover:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.squaddieSummaryPopoversByType.MAIN,
            }):
                SummaryHUDStateService.setMainSummaryPopover(popoverArgs)
                return
            case gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                .battleSquaddieId !== battleSquaddieId:
                SummaryHUDStateService.setTargetSummaryPopover(popoverArgs)
                return
        }
    },
    playerSelectsActionThatRequiresATarget: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerSelectsActionThatRequiresATarget
    ) => {
        const gameEngineState = message.gameEngineState
        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.showPlayerCommand =
            false

        ActionsThisRoundService.updateActionsThisRound({
            state: gameEngineState,
            battleSquaddieId: message.battleSquaddieId,
            startingLocation: message.mapStartingLocation,
            previewedActionTemplateId: message.actionTemplate.id,
        })
        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            battleSquaddieId: message.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            actionTemplate: message.actionTemplate,
        })
    },
    playerSelectsTargetLocation: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerSelectsTargetLocation
    ) => {
        const gameEngineState = message.gameEngineState

        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            targetLocation: message.targetLocation,
        })

        const { battleSquaddieId: targetBattleSquaddieId } =
            MissionMapService.getBattleSquaddieAtLocation(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                message.targetLocation
            )

        SummaryHUDStateService.setTargetSummaryPopover({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            battleSquaddieId: targetBattleSquaddieId,
            gameEngineState,
            objectRepository: gameEngineState.repository,
            resourceHandler: gameEngineState.resourceHandler,
            position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
        })

        gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()
    },
    playerConfirmsAction: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerConfirmsAction
    ) => {
        const gameEngineState = message.gameEngineState

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

        const targetLocation = BattleActionDecisionStepService.getTarget(
            gameEngineState.battleOrchestratorState.battleState
                .playerBattleActionBuilderState
        ).targetLocation

        const decidedAction = createDecidedAction(
            actionsThisRound,
            actionTemplate,
            firstActionEffectTemplate,
            targetLocation
        )
        const processedAction = ProcessedActionService.new({
            decidedAction,
        })
        actionsThisRound.processedActions.push(processedAction)

        let results: SquaddieSquaddieResults =
            ActionCalculator.calculateResults({
                gameEngineState: gameEngineState,
                actingBattleSquaddie,
                validTargetLocation: targetLocation,
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

        BattleActionDecisionStepService.confirmAlreadyConsideredTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
        })

        const squaddieChanges: BattleActionSquaddieChange[] = Object.values(
            results.squaddieChanges
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
    },
}

export class BattleHUDListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        switch (message.type) {
            case MessageBoardMessageType.STARTED_PLAYER_PHASE:
            case MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE:
                FileAccessHUDService.enableButtons(
                    message.gameEngineState.battleOrchestratorState.battleHUD
                        .fileAccessHUD
                )
                break
            case MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN:
                BattleHUDService.createPlayerSelectsDifferentSquaddieMidTurnPopup(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message.gameEngineState
                )
                break
            case MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID:
                BattleHUDService.createPlayerInvalidSelectionPopup(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message
                )
                break
            case MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION:
                BattleHUDService.cancelTargetSelection(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message
                )
                break
            case MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION:
                BattleHUDService.cancelTargetConfirmation(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message
                )
                break
            case MessageBoardMessageType.PLAYER_ENDS_TURN:
                BattleHUDService.endPlayerSquaddieTurn(
                    message.gameEngineState,
                    message.battleAction
                )
                break
            case MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE:
                BattleHUDService.playerSelectsSquaddie(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message
                )
                break
            case MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE:
                BattleHUDService.playerPeeksAtSquaddie(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message
                )
                break
            case MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET:
                BattleHUDService.playerSelectsActionThatRequiresATarget(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message
                )
                break
            case MessageBoardMessageType.PLAYER_SELECTS_TARGET_LOCATION:
                BattleHUDService.playerSelectsTargetLocation(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message
                )
                break
            case MessageBoardMessageType.PLAYER_CONFIRMS_ACTION:
                BattleHUDService.playerConfirmsAction(
                    message.gameEngineState.battleOrchestratorState.battleHUD,
                    message
                )
                break
        }
    }
}

const calculateMidTurnPopup = (
    actionsThisRound: ActionsThisRound,
    gameEngineState: GameEngineState
) => {
    let popupText: string = `PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN but there is no actor`
    let camera: BattleCamera = undefined

    let left = Math.round(Math.random() * ScreenDimensions.SCREEN_WIDTH)
    let top = Math.round(Math.random() * ScreenDimensions.SCREEN_HEIGHT)
    let labelArea: RectArea = RectAreaService.new({
        left,
        top,
        width: warningPopupConstants.width,
        height: warningPopupConstants.height,
    })

    if (
        !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)
    ) {
        return { popupText, labelArea, camera }
    }

    const { squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            actionsThisRound.battleSquaddieId
        )
    )

    popupText = `${squaddieTemplate.squaddieId.name}\n is not done yet`

    const { mapLocation } = MissionMapService.getByBattleSquaddieId(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        actionsThisRound.battleSquaddieId
    )

    if (isValidValue(mapLocation)) {
        ;[left, top] =
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                mapLocation.q,
                mapLocation.r
            )
        left -= warningPopupConstants.width / 2
        top += HEX_TILE_WIDTH

        labelArea = RectAreaService.new({
            left,
            top,
            width: warningPopupConstants.width,
            height: warningPopupConstants.height,
        })
        camera = gameEngineState.battleOrchestratorState.battleState.camera
    }
    return { popupText, labelArea, camera }
}

const calculatePlayerInvalidSelectionPopup = (
    gameEngineState: GameEngineState,
    message: MessageBoardMessagePlayerSelectionIsInvalid
) => {
    let [left, top] = convertScreenCoordinatesToWorldCoordinates(
        message.selectionLocation.x,
        message.selectionLocation.y,
        ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
    )
    left -= warningPopupConstants.width / 2
    top += HEX_TILE_WIDTH

    let labelArea = RectAreaService.new({
        left,
        top,
        width: warningPopupConstants.width,
        height: warningPopupConstants.height,
    })
    return {
        popupText: message.reason,
        labelArea,
        camera: gameEngineState.battleOrchestratorState.battleState.camera,
    }
}

const processEndTurnAction = (
    gameEngineState: GameEngineState,
    battleSquaddie: BattleSquaddie,
    mapLocation: HexCoordinate
) => {
    const decidedActionEndTurnEffect = DecidedActionEndTurnEffectService.new({
        template: ActionEffectEndTurnTemplateService.new({}),
    })
    const processedAction = ProcessedActionService.new({
        decidedAction: DecidedActionService.new({
            actionTemplateName: "End Turn",
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            actionEffects: [decidedActionEndTurnEffect],
        }),
        processedActionEffects: [
            ProcessedActionEndTurnEffectService.new({
                decidedActionEffect: decidedActionEndTurnEffect,
            }),
        ],
    })

    ActionsThisRoundService.updateActionsThisRound({
        state: gameEngineState,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        startingLocation: mapLocation,
        processedAction,
    })
    gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
        BattleActionDecisionStepService.new()
    BattleActionDecisionStepService.setActor({
        actionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .playerBattleActionBuilderState,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
    })
    BattleActionDecisionStepService.addAction({
        actionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .playerBattleActionBuilderState,
        endTurn: true,
    })
    BattleActionDecisionStepService.setConfirmedTarget({
        actionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .playerBattleActionBuilderState,
        targetLocation: mapLocation,
    })

    gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()
    RecordingService.addEvent(
        gameEngineState.battleOrchestratorState.battleState.recording,
        BattleEventService.new({
            processedAction,
            results: undefined,
        })
    )
    BattleSquaddieService.endTurn(battleSquaddie)
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
