import { BattleSquaddieSelectedHUD } from "./BattleSquaddieSelectedHUD"
import { FileAccessHUD, FileAccessHUDService } from "./fileAccessHUD"
import { getValidValueOrDefault, isValidValue } from "../../utils/validityCheck"
import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessagePlayerCancelsTargetConfirmation,
    MessageBoardMessagePlayerCancelsTargetSelection,
    MessageBoardMessagePlayerSelectionIsInvalid,
    MessageBoardMessagePlayerSelectsSquaddie,
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
    convertMapCoordinatesToWorldCoordinates,
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
import { PlayerBattleActionBuilderStateService } from "../actionBuilder/playerBattleActionBuilderState"
import { HighlightPulseRedColor } from "../../hexMap/hexDrawingUtils"
import { TargetingResultsService } from "../targeting/targetingService"
import { DecidedActionEndTurnEffectService } from "../../action/decided/decidedActionEndTurnEffect"
import { ActionEffectEndTurnTemplateService } from "../../action/template/actionEffectEndTurnTemplate"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { ProcessedActionEndTurnEffectService } from "../../action/processed/processedActionEndTurnEffect"
import { RecordingService } from "../history/recording"
import { BattleEventService } from "../history/battleEvent"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SummaryHUDStateService } from "./summaryHUD"
import { BattleAction, BattleActionQueueService } from "../history/battleAction"

export enum PopupWindowType {
    DIFFERENT_SQUADDIE_TURN = "DIFFERENT_SQUADDIE_TURN",
    PLAYER_INVALID_SELECTION = "PLAYER_INVALID_SELECTION",
}

export interface BattleHUD {
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD
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
    new: ({
        fileAccessHUD,
        battleSquaddieSelectedHUD,
    }: {
        fileAccessHUD?: FileAccessHUD
        battleSquaddieSelectedHUD?: BattleSquaddieSelectedHUD
    }): BattleHUD => {
        return {
            fileAccessHUD: getValidValueOrDefault(
                fileAccessHUD,
                FileAccessHUDService.new({})
            ),
            battleSquaddieSelectedHUD,
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

        PlayerBattleActionBuilderStateService.removeAction({
            actionBuilderState:
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
    },
    endPlayerSquaddieTurn: (
        gameEngineState: GameEngineState,
        battleAction: BattleAction
    ) => {
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.summaryPanelLeft.battleSquaddieId
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
        message: MessageBoardMessagePlayerSelectsSquaddie
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
            SummaryHUDStateService.setLeftSummaryPanel({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                battleSquaddieId,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                gameEngineState,
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
            SummaryHUDStateService.setRightSummaryPanel({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                battleSquaddieId,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                gameEngineState,
            })
        }
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
            case MessageBoardMessageType.PLAYER_SELECTS_SQUADDIE:
                BattleHUDService.playerSelectsSquaddie(
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
        ;[left, top] = convertMapCoordinatesToWorldCoordinates(
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
        endTurn: true,
    })
    PlayerBattleActionBuilderStateService.setConfirmedTarget({
        actionBuilderState:
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
