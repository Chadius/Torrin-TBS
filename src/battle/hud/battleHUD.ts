import { FileAccessHUD, FileAccessHUDService } from "./fileAccessHUD"
import { getValidValueOrDefault, isValidValue } from "../../utils/validityCheck"
import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageMoveSquaddieToLocation,
    MessageBoardMessagePlayerCancelsSquaddieSelection,
    MessageBoardMessagePlayerCancelsTargetConfirmation,
    MessageBoardMessagePlayerCancelsTargetSelection,
    MessageBoardMessagePlayerConfirmsAction,
    MessageBoardMessagePlayerControlledSquaddieNeedsNextAction,
    MessageBoardMessagePlayerPeeksAtSquaddie,
    MessageBoardMessagePlayerSelectionIsInvalid,
    MessageBoardMessagePlayerSelectsActionThatRequiresATarget,
    MessageBoardMessagePlayerSelectsAndLocksSquaddie,
    MessageBoardMessagePlayerSelectsEmptyTile,
    MessageBoardMessagePlayerSelectsTargetLocation,
    MessageBoardMessageSelectAndLockNextSquaddie,
    MessageBoardMessageSummaryPopoverExpires,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import {
    PopupWindow,
    PopupWindowService,
    PopupWindowStatus,
} from "./popupWindow"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { LabelService, TextBoxMargin } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import { ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { MissionMapService } from "../../missionMap/missionMap"
import {
    ConvertCoordinateService,
    convertScreenCoordinatesToWorldCoordinates,
} from "../../hexMap/convertCoordinates"
import { OrchestratorUtilities } from "../orchestratorComponents/orchestratorUtils"
import { VERTICAL_ALIGN } from "../../ui/constants"
import * as p5 from "p5"
import { HEX_TILE_WIDTH } from "../../graphicsConstants"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
import { TargetingResultsService } from "../targeting/targetingService"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { ProcessedActionEndTurnEffectService } from "../../action/processed/processedActionEndTurnEffect"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SummaryHUDStateService } from "./summaryHUD"
import { BattleAction, BattleActionService } from "../history/battleAction"
import {
    SquaddieSummaryPopoverPosition,
    SquaddieSummaryPopoverService,
} from "./playerActionPanel/squaddieSummaryPopover"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { SquaddieTurnService } from "../../squaddie/turn"
import { SquaddieSquaddieResults } from "../history/squaddieSquaddieResults"
import { ActionCalculator } from "../calculator/actionCalculator/calculator"
import { BattleActionSquaddieChange } from "../history/battleActionSquaddieChange"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerSquaddieTypes,
    MapGraphicsLayerType,
} from "../../hexMap/mapGraphicsLayer"
import { MapHighlightService } from "../animation/mapHighlight"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { MissionMapSquaddieLocationService } from "../../missionMap/squaddieLocation"
import { BattleHUDStateService } from "./battleHUDState"
import { MovementCalculatorService } from "../calculator/movement/movementCalculator"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattleActionRecorderService } from "../history/battleActionRecorder"

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
                FileAccessHUDService.new()
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
    createPlayerInvalidSelectionPopup: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerSelectionIsInvalid
    ) => {
        let gameEngineState = message.gameEngineState

        let { popupText, labelArea, camera } =
            calculatePlayerInvalidSelectionPopup(gameEngineState, message)

        const invalidSelectionPopupWindow: PopupWindow = PopupWindowService.new(
            {
                label: LabelService.new({
                    area: labelArea,
                    text: popupText,
                    ...warningPopupConstants.label,
                }),
                camera,
            }
        )
        PopupWindowService.changeStatus(
            invalidSelectionPopupWindow,
            PopupWindowStatus.ACTIVE
        )
        PopupWindowService.setInactiveAfterTimeElapsed(
            invalidSelectionPopupWindow,
            2000
        )

        BattleHUDService.setPopupWindow(
            battleHUD,
            invalidSelectionPopupWindow,
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
                    .battleActionDecisionStep,
        })

        if (
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .processedActions.length === 0
        ) {
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
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

        MapGraphicsLayerSquaddieTypes.forEach((t) =>
            TerrainTileMapService.removeGraphicsLayerByType(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
                t
            )
        )

        const actionRangeOnMap = MapGraphicsLayerService.new({
            id: gameEngineState.battleOrchestratorState.battleState
                .actionsThisRound.battleSquaddieId,
            highlightedTileDescriptions: [
                {
                    tiles: actionRange,
                    pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                    overlayImageResourceName: "map icon attack 1 action",
                },
            ],
            type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
        })
        TerrainTileMapService.addGraphicsLayer(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap,
            actionRangeOnMap
        )

        BattleActionDecisionStepService.removeTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
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

        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            battleAction
        )

        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.showSummaryHUD =
            false

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
            gameEngineState,
            recommendedMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        })
    },
    playerSelectsSquaddie: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerSelectsAndLocksSquaddie
    ) => {
        const gameEngineState = message.gameEngineState
        const battleSquaddieId = message.battleSquaddieSelectedId

        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            SummaryHUDStateService.new({
                mouseSelectionLocation: message.selectionMethod.mouseClick
                    ? {
                          x: message.selectionMethod.mouseClick.x,
                          y: message.selectionMethod.mouseClick.y,
                      }
                    : { x: 0, y: 0 },
            })

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )
        const {
            squaddieIsNormallyControllableByPlayer,
            playerCanControlThisSquaddieRightNow,
        } = SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })

        OrchestratorUtilities.highlightSquaddieRange(
            gameEngineState,
            battleSquaddieId
        )

        if (playerCanControlThisSquaddieRightNow) {
            if (
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep === undefined
            ) {
                gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                    BattleActionDecisionStepService.new()
            }
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            })
        }

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
                    mouseSelectionLocation: message.selectionMethod
                        .mouseMovement
                        ? {
                              x: message.selectionMethod.mouseMovement.x,
                              y: message.selectionMethod.mouseMovement.y,
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
        const { mapLocation: startLocation } =
            gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                battleSquaddieId
            )
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )
        const squaddieReachHighlightedOnMap =
            MapHighlightService.highlightAllLocationsWithinSquaddieRange({
                repository: gameEngineState.repository,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleSquaddieId: battleSquaddieId,
                startLocation: startLocation,
                campaignResources: gameEngineState.campaign.resources,
                squaddieTurnOverride:
                    squaddieTemplate.squaddieId.affiliation ===
                    SquaddieAffiliation.PLAYER
                        ? undefined
                        : SquaddieTurnService.new(),
            })

        ;[
            MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE,
            MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE,
        ].forEach((type) => {
            TerrainTileMapService.removeGraphicsLayerByType(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
                type
            )
        })

        const { squaddieIsNormallyControllableByPlayer } =
            SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })
        const layerType: MapGraphicsLayerType =
            squaddieIsNormallyControllableByPlayer
                ? MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE
                : MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE

        const actionRangeLayer = MapGraphicsLayerService.new({
            id: battleSquaddieId,
            highlightedTileDescriptions: squaddieReachHighlightedOnMap,
            type: layerType,
        })

        TerrainTileMapService.addGraphicsLayer(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap,
            actionRangeLayer
        )

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
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                message.battleSquaddieId
            )
        )
        const { actionPointsRemaining } =
            SquaddieService.getNumberOfActionPoints({
                squaddieTemplate,
                battleSquaddie,
            })
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            message.actionTemplateId
        )
        if (actionPointsRemaining < actionTemplate.actionPoints) {
            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                gameEngineState,
                reason: `Need ${actionTemplate.actionPoints} action points`,
                selectionLocation: {
                    x: message.mouseLocation.x,
                    y: message.mouseLocation.y,
                },
            })
            return
        }

        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.showPlayerCommand =
            false

        ActionsThisRoundService.updateActionsThisRound({
            state: gameEngineState,
            battleSquaddieId: message.battleSquaddieId,
            startingLocation: message.mapStartingLocation,
            previewedActionTemplateId: message.actionTemplateId,
        })
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: message.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            actionTemplateId: actionTemplate.id,
        })

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
            gameEngineState,
            recommendedMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
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
                    .battleActionDecisionStep,
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

        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )
    },
    playerConfirmsAction: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerConfirmsAction
    ) => {
        const gameEngineState = message.gameEngineState

        let actionsThisRound =
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        const { battleSquaddie: actingBattleSquaddie, squaddieTemplate } =
            getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    actionsThisRound.battleSquaddieId
                )
            )

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionsThisRound.previewedActionTemplateId
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
                .battleActionDecisionStep
        ).targetLocation

        const actionStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionStep,
            battleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionStep,
            actionTemplateId: actionTemplate.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetLocation,
        })

        let results: SquaddieSquaddieResults =
            ActionCalculator.calculateResults({
                gameEngineState: gameEngineState,
                actingBattleSquaddie,
                validTargetLocation: targetLocation,
                actionsThisRound:
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound,
                battleActionDecisionStep: actionStep,
            })

        const processedAction = ProcessedActionService.new({
            actionPointCost: actionTemplate.actionPoints,
        })
        processedAction.processedActionEffects.push(
            ProcessedActionSquaddieEffectService.new({
                battleActionDecisionStep: actionStep,
                objectRepository: gameEngineState.repository,
                battleActionSquaddieChange: results.squaddieChanges[0],
            })
        )

        actionsThisRound.processedActions.push(processedAction)

        BattleActionDecisionStepService.confirmAlreadyConsideredTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
        })

        const squaddieChanges: BattleActionSquaddieChange[] =
            results.squaddieChanges

        const squaddieBattleAction: BattleAction = BattleActionService.new({
            actor: {
                actorBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
                actorContext: results.actingContext,
            },
            action: { actionTemplateId: actionTemplate.id },
            effect: {
                squaddie: squaddieChanges,
            },
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            squaddieBattleAction
        )
        clearAllHoverAndClickedLayersExceptForThisSquaddie(
            gameEngineState,
            actingBattleSquaddie,
            squaddieTemplate
        )
    },
    enablePlayerCommand: (
        battleHUD: BattleHUD,
        gameEngineState: GameEngineState
    ) => {
        if (
            gameEngineState?.battleOrchestratorState?.battleHUDState
                ?.summaryHUDState?.squaddieSummaryPopoversByType?.MAIN
        ) {
            SquaddieSummaryPopoverService.update({
                objectRepository: gameEngineState.repository,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
                squaddieSummaryPopover:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.squaddieSummaryPopoversByType.MAIN,
            })
        }
    },
    summaryPopoverExpires: (
        message: MessageBoardMessageSummaryPopoverExpires
    ) => {
        const gameEngineState = message.gameEngineState
        const summaryHUDState =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState
        const popoverType = message.popoverType

        ;[
            MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE,
            MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE,
        ].forEach((t) => {
            TerrainTileMapService.removeGraphicsLayerWithIdAndType({
                terrainTileMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap.terrainTileMap,
                id: summaryHUDState.squaddieSummaryPopoversByType[popoverType]
                    .battleSquaddieId,
                type: t,
            })
        })

        summaryHUDState.squaddieSummaryPopoversByType[popoverType] = undefined
    },
    selectAndLockNextSquaddie: (
        message: MessageBoardMessageSelectAndLockNextSquaddie
    ) => {
        const gameEngineState = message.gameEngineState

        if (
            gameEngineState.battleOrchestratorState.battleHUDState
                .nextSquaddieBattleSquaddieIdsToCycleThrough.length === 0
        ) {
            resetNextBattleSquaddieIds(gameEngineState)
        }

        if (
            gameEngineState.battleOrchestratorState.battleHUDState
                .nextSquaddieBattleSquaddieIdsToCycleThrough.length === 0
        ) {
            return
        }

        const nextBattleSquaddieId: string =
            gameEngineState.battleOrchestratorState.battleHUDState.nextSquaddieBattleSquaddieIdsToCycleThrough.find(
                (id) =>
                    id !==
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState?.squaddieSummaryPopoversByType.MAIN
                        ?.battleSquaddieId
            )

        gameEngineState.battleOrchestratorState.battleHUDState.nextSquaddieBattleSquaddieIdsToCycleThrough =
            gameEngineState.battleOrchestratorState.battleHUDState.nextSquaddieBattleSquaddieIdsToCycleThrough.filter(
                (id) => id != nextBattleSquaddieId
            )
        panCameraToSquaddie(gameEngineState, nextBattleSquaddieId)

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            gameEngineState,
            battleSquaddieSelectedId: nextBattleSquaddieId,
            selectionMethod: {
                mouseClick:
                    BattleHUDStateService.getPositionToOpenPlayerCommandWindow({
                        gameEngineState,
                    }),
            },
        })
    },
    tryToMoveSquaddieToLocation: (
        message: MessageBoardMessageMoveSquaddieToLocation
    ) => {
        const gameEngineState = message.gameEngineState
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                message.battleSquaddieId
            )
        )
        const destination = message.targetLocation
        const isMovementPossible = MovementCalculatorService.isMovementPossible(
            {
                gameEngineState,
                battleSquaddie,
                squaddieTemplate,
                destination,
            }
        )

        if (!isMovementPossible) {
            const { x, y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                    {
                        q: message.targetLocation.q,
                        r: message.targetLocation.r,
                        camera: gameEngineState.battleOrchestratorState
                            .battleState.camera,
                    }
                )

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                gameEngineState,
                reason: "out of range",
                selectionLocation: {
                    x,
                    y,
                },
            })
            return
        }

        MovementCalculatorService.setBattleActionDecisionStepReadyToAnimate({
            gameEngineState,
            battleSquaddie,
            squaddieTemplate,
            destination,
        })
        const processedAction =
            MovementCalculatorService.createMovementProcessedAction({
                gameEngineState,
                battleSquaddie,
                destination,
            })
        MovementCalculatorService.addProcessedActionToHistory({
            gameEngineState,
            processedAction,
            battleSquaddie,
        })

        const squaddieDatum =
            gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                battleSquaddie.battleSquaddieId
            )
        MovementCalculatorService.recordBattleAction({
            gameEngineState,
            startLocation: squaddieDatum.mapLocation,
            endLocation: destination,
            battleSquaddie,
        })
        MovementCalculatorService.consumeSquaddieActions({
            processedAction,
            battleSquaddie,
        })
        MovementCalculatorService.queueBattleActionToMove({
            gameEngineState,
            battleSquaddie,
            destination,
        })
        gameEngineState.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(
            battleSquaddie.battleSquaddieId,
            destination
        )

        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.showSummaryHUD =
            false

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
            gameEngineState,
            recommendedMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        })
    },
    cancelSquaddieSelectionAtStartOfTurn: (
        message: MessageBoardMessagePlayerCancelsSquaddieSelection
    ) => {
        const gameEngineState = message.gameEngineState
        if (
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        ) {
            return
        }

        TerrainTileMapService.removeGraphicsLayerByType(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap,
            MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE
        )
        TerrainTileMapService.removeGraphicsLayerByType(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap,
            MapGraphicsLayerType.HOVERED_OVER_CONTROLLABLE_SQUADDIE
        )

        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            undefined
    },
    clicksOnAnEmptyTileAtTheStartOfTheTurn: (
        message: MessageBoardMessagePlayerSelectsEmptyTile
    ) => {
        const gameEngineState = message.gameEngineState
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            undefined
        gameEngineState.battleOrchestratorState.battleState.actionsThisRound =
            undefined
    },
    playerControlledSquaddieNeedsNextAction: (
        message: MessageBoardMessagePlayerControlledSquaddieNeedsNextAction
    ) => {
        return playerControlledSquaddieNeedsNextAction(message)
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
                BattleHUDService.enablePlayerCommand(
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
            case MessageBoardMessageType.SUMMARY_POPOVER_EXPIRES:
                BattleHUDService.summaryPopoverExpires(message)
                break
            case MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE:
                BattleHUDService.selectAndLockNextSquaddie(message)
                break
            case MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION:
                BattleHUDService.tryToMoveSquaddieToLocation(message)
                break
            case MessageBoardMessageType.PLAYER_CANCELS_SQUADDIE_SELECTION:
                BattleHUDService.cancelSquaddieSelectionAtStartOfTurn(message)
                break
            case MessageBoardMessageType.PLAYER_SELECTS_EMPTY_TILE:
                BattleHUDService.clicksOnAnEmptyTileAtTheStartOfTheTurn(message)
                break
            case MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION:
                BattleHUDService.playerControlledSquaddieNeedsNextAction(
                    message
                )
                break
        }
    }
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
    const endTurnDecision: BattleActionDecisionStep =
        BattleActionDecisionStepService.new()
    BattleActionDecisionStepService.setActor({
        actionDecisionStep: endTurnDecision,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
    })
    BattleActionDecisionStepService.addAction({
        actionDecisionStep: endTurnDecision,
        endTurn: true,
    })

    const endTurnAction: BattleAction = BattleActionService.new({
        actor: { actorBattleSquaddieId: battleSquaddie.battleSquaddieId },
        action: { isEndTurn: true },
        effect: { endTurn: true },
    })
    BattleActionRecorderService.addReadyToAnimateBattleAction(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionRecorder,
        endTurnAction
    )

    const processedAction = ProcessedActionService.new({
        actionPointCost: "End Turn",
        processedActionEffects: [
            ProcessedActionEndTurnEffectService.new({
                battleActionDecisionStep: endTurnDecision,
            }),
        ],
    })

    ActionsThisRoundService.updateActionsThisRound({
        state: gameEngineState,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        startingLocation: mapLocation,
        processedAction,
    })
    gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
        BattleActionDecisionStepService.new()
    BattleActionDecisionStepService.setActor({
        actionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
    })
    BattleActionDecisionStepService.addAction({
        actionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep,
        endTurn: true,
    })
    BattleActionDecisionStepService.setConfirmedTarget({
        actionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep,
        targetLocation: mapLocation,
    })

    MapGraphicsLayerSquaddieTypes.forEach((t) =>
        TerrainTileMapService.removeGraphicsLayerByType(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap,
            t
        )
    )
    BattleActionRecorderService.addReadyToAnimateBattleAction(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionRecorder,
        endTurnAction
    )
    BattleSquaddieService.endTurn(battleSquaddie)
}

const clearAllHoverAndClickedLayersExceptForThisSquaddie = (
    gameEngineState: GameEngineState,
    actingBattleSquaddie: BattleSquaddie,
    actingSquaddieTemplate: SquaddieTemplate
) => {
    const { squaddieIsNormallyControllableByPlayer } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate: actingSquaddieTemplate,
            battleSquaddie: actingBattleSquaddie,
        })

    const layerType: MapGraphicsLayerType =
        squaddieIsNormallyControllableByPlayer
            ? MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE
            : MapGraphicsLayerType.CLICKED_ON_NORMALLY_UNCONTROLLABLE_SQUADDIE

    let confirmLayer = TerrainTileMapService.getGraphicsLayer({
        terrainTileMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap,
        id: actingBattleSquaddie.battleSquaddieId,
        type: layerType,
    })
    MapGraphicsLayerSquaddieTypes.forEach((t) =>
        TerrainTileMapService.removeGraphicsLayerByType(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap,
            t
        )
    )
    if (confirmLayer) {
        TerrainTileMapService.addGraphicsLayer(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap,
            confirmLayer
        )
    }
}

const panCameraToSquaddie = (
    gameEngineState: GameEngineState,
    nextBattleSquaddieId: string
) => {
    const selectedMapCoordinates =
        gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
            nextBattleSquaddieId
        )
    if (MissionMapSquaddieLocationService.isValid(selectedMapCoordinates)) {
        const selectedWorldCoordinates =
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                selectedMapCoordinates.mapLocation.q,
                selectedMapCoordinates.mapLocation.r
            )
        gameEngineState.battleOrchestratorState.battleState.camera.pan({
            xDestination: selectedWorldCoordinates[0],
            yDestination: selectedWorldCoordinates[1],
            timeToPan: 500,
            respectConstraints: true,
        })
    }
}

const resetNextBattleSquaddieIds = (gameEngineState: GameEngineState) => {
    gameEngineState.battleOrchestratorState.battleHUDState.nextSquaddieBattleSquaddieIdsToCycleThrough =
        ObjectRepositoryService.getBattleSquaddieIterator(
            gameEngineState.repository
        )
            .filter((info) => {
                const { squaddieTemplate, battleSquaddie } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            gameEngineState.repository,
                            info.battleSquaddieId
                        )
                    )

                const { playerCanControlThisSquaddieRightNow } =
                    SquaddieService.canPlayerControlSquaddieRightNow({
                        squaddieTemplate,
                        battleSquaddie,
                    })

                return playerCanControlThisSquaddieRightNow
            })
            .filter(
                (info) =>
                    MissionMapService.getByBattleSquaddieId(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                        info.battleSquaddieId
                    ).mapLocation !== undefined
            )
            .map((info) => info.battleSquaddieId)
}

const playerControlledSquaddieNeedsNextAction = (
    message: MessageBoardMessagePlayerControlledSquaddieNeedsNextAction
) => {
    const gameEngineState = message.gameEngineState
    const { battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        )
    )

    TerrainTileMapService.removeAllGraphicsLayers(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap
    )

    const { mapLocation: startLocation } =
        gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
            battleSquaddie.battleSquaddieId
        )
    const squaddieReachHighlightedOnMap =
        MapHighlightService.highlightAllLocationsWithinSquaddieRange({
            repository: gameEngineState.repository,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startLocation: startLocation,
            campaignResources: gameEngineState.campaign.resources,
        })
    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: gameEngineState.battleOrchestratorState.battleState.actionsThisRound
            .battleSquaddieId,
        highlightedTileDescriptions: squaddieReachHighlightedOnMap,
        type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
    })
    TerrainTileMapService.addGraphicsLayer(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap,
        actionRangeOnMap
    )
}
