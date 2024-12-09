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
    MessageBoardMessagePlayerSelectsActionThatRequiresATarget,
    MessageBoardMessagePlayerSelectsAndLocksSquaddie,
    MessageBoardMessagePlayerSelectsEmptyTile,
    MessageBoardMessagePlayerSelectsTargetLocation,
    MessageBoardMessageSelectAndLockNextSquaddie,
    MessageBoardMessageType,
    SquaddieSelectionMethod,
} from "../../message/messageBoardMessage"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { MissionMapService } from "../../missionMap/missionMap"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { OrchestratorUtilities } from "../orchestratorComponents/orchestratorUtils"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
import { TargetingResultsService } from "../targeting/targetingService"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import {
    CoordinateSystem,
    HexCoordinate,
} from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieService } from "../../squaddie/squaddieService"
import { SummaryHUDStateService } from "./summaryHUD"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { SquaddieTurnService } from "../../squaddie/turn"
import { SquaddieSquaddieResults } from "../history/squaddieSquaddieResults"
import { ActionCalculator } from "../calculator/actionCalculator/calculator"
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
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { PopupWindowService } from "./popupWindow"
import { BattleCamera, BattleCameraService } from "../battleCamera"
import { ActionTilePosition } from "./playerActionPanel/tile/actionTilePosition"

export interface BattleHUD {
    fileAccessHUD: FileAccessHUD
}

export const BattleHUDService = {
    new: ({ fileAccessHUD }: { fileAccessHUD?: FileAccessHUD }): BattleHUD => {
        return {
            fileAccessHUD: getValidValueOrDefault(
                fileAccessHUD,
                FileAccessHUDService.new()
            ),
        }
    },
    cancelTargetSelection: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerCancelsTargetSelection
    ) => {
        const gameEngineState = message.gameEngineState
        const battleSquaddieToHighlightId: string =
            BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId

        OrchestratorUtilities.highlightSquaddieRange(
            gameEngineState,
            battleSquaddieToHighlightId
        )

        BattleActionDecisionStepService.removeAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
        })
        BattleActionDecisionStepService.removeTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
        })
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
            id: BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId,
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
                BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                ).battleSquaddieId
            )
        )

        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddie.battleSquaddieId
        )

        processEndTurnAction(gameEngineState, battleSquaddie, mapCoordinate)

        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            battleAction
        )

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

        const { x, y } = getScreenSelectionCoordinates(
            message.selectionMethod,
            gameEngineState.battleOrchestratorState.battleState.camera
        )

        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            SummaryHUDStateService.new({
                screenSelectionCoordinates: { x, y },
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
            SummaryHUDStateService.createActorTiles({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                resourceHandler: gameEngineState.resourceHandler,
                objectRepository: gameEngineState.repository,
                gameEngineState,
            })
        } else {
            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                gameEngineState,
                removeExpirationTime: true,
            })
        }
    },
    playerPeeksAtSquaddie: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerPeeksAtSquaddie
    ) => {
        const gameEngineState = message.gameEngineState
        const battleSquaddieId = message.battleSquaddieSelectedId

        if (
            !isValidValue(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            )
        ) {
            const { x, y } = getScreenSelectionCoordinates(
                message.selectionMethod,
                gameEngineState.battleOrchestratorState.battleState.camera
            )

            gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
                SummaryHUDStateService.new({
                    screenSelectionCoordinates: { x, y },
                })
        }

        SummaryHUDStateService.peekAtSquaddie({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            battleSquaddieId,
            gameEngineState,
        })

        const { mapCoordinate: startLocation } =
            MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
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
    },
    playerSelectsActionThatRequiresATarget: (
        battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerSelectsActionThatRequiresATarget
    ) => {
        const gameEngineState = message.gameEngineState
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            message.actionTemplateId
        )

        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.showPlayerCommand =
            false

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

        const { battleSquaddie: actingBattleSquaddie, squaddieTemplate } =
            getResultOrThrowError(
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

        let actionEffectTemplates =
            ActionTemplateService.getActionEffectTemplates(actionTemplate)

        if (actionEffectTemplates.length === 0) {
            return
        }

        SquaddieTurnService.spendActionPoints(
            actingBattleSquaddie.squaddieTurn,
            actionTemplate.resourceCost.actionPoints
        )

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

        let results: SquaddieSquaddieResults[] =
            ActionCalculator.calculateResults({
                gameEngineState: gameEngineState,
                actingBattleSquaddie,
                validTargetLocation: targetLocation,
                battleActionDecisionStep: actionStep,
            })

        BattleActionDecisionStepService.confirmAlreadyConsideredTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
        })

        const squaddieBattleActions: BattleAction[] = results.map((result) => {
            return BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        actingBattleSquaddie.battleSquaddieId,
                    actorContext: result.actingContext,
                },
                action: { actionTemplateId: actionTemplate.id },
                effect: {
                    squaddie: result.squaddieChanges,
                },
            })
        })

        squaddieBattleActions.forEach((squaddieBattleAction) => {
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                squaddieBattleAction
            )
        })
        clearAllHoverAndClickedLayersExceptForThisSquaddie(
            gameEngineState,
            actingBattleSquaddie,
            squaddieTemplate
        )
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
                        .summaryHUDState?.squaddieNameTiles[
                        ActionTilePosition.ACTOR_NAME
                    ]?.battleSquaddieId
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
                mouse: BattleHUDStateService.getPositionToOpenPlayerCommandWindow(
                    {
                        gameEngineState,
                    }
                ),
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
            const { screenX, screenY } =
                ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                    {
                        q: message.targetLocation.q,
                        r: message.targetLocation.r,
                        ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                    }
                )

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                gameEngineState,
                popupWindow: PopupWindowService.newWarningWindow({
                    screenX: screenX,
                    screenY: screenY,
                    camera: gameEngineState.battleOrchestratorState.battleState
                        .camera,
                    text: "out of range",
                    coordinateSystem: CoordinateSystem.SCREEN,
                }),
            })
            return
        }

        MovementCalculatorService.setBattleActionDecisionStepReadyToAnimate({
            gameEngineState,
            battleSquaddie,
            squaddieTemplate,
            destination,
        })
        MovementCalculatorService.spendActionPointsMoving({
            gameEngineState,
            battleSquaddie,
            destination,
        })
        MovementCalculatorService.queueBattleActionToMove({
            gameEngineState,
            battleSquaddie,
            destination,
        })
        MissionMapService.updateBattleSquaddieLocation(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            battleSquaddie.battleSquaddieId,
            destination
        )

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

const processEndTurnAction = (
    gameEngineState: GameEngineState,
    battleSquaddie: BattleSquaddie,
    mapCoordinate: HexCoordinate
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
        targetLocation: mapCoordinate,
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
    const selectedMapCoordinates = MissionMapService.getByBattleSquaddieId(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        nextBattleSquaddieId
    )
    if (MissionMapSquaddieLocationService.isValid(selectedMapCoordinates)) {
        const selectedWorldCoordinates =
            ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                selectedMapCoordinates.mapCoordinate.q,
                selectedMapCoordinates.mapCoordinate.r
            )
        gameEngineState.battleOrchestratorState.battleState.camera.pan({
            xDestination: selectedWorldCoordinates.worldX,
            yDestination: selectedWorldCoordinates.worldY,
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
                    ).mapCoordinate !== undefined
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
            BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId
        )
    )

    TerrainTileMapService.removeAllGraphicsLayers(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap
    )

    const { mapCoordinate: startLocation } =
        MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
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
        id: BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ).battleSquaddieId,
        highlightedTileDescriptions: squaddieReachHighlightedOnMap,
        type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
    })
    TerrainTileMapService.addGraphicsLayer(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap,
        actionRangeOnMap
    )
}

const getScreenSelectionCoordinates = (
    selectionMethod: SquaddieSelectionMethod,
    camera: BattleCamera
): { x: number; y: number } => {
    if (selectionMethod.mouse) {
        return {
            x: selectionMethod.mouse.x,
            y: selectionMethod.mouse.y,
        }
    }

    const { screenX: x, screenY: y } =
        ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates({
            q: selectionMethod.mapCoordinate.q,
            r: selectionMethod.mapCoordinate.r,
            ...BattleCameraService.getCoordinates(camera),
        })
    return { x, y }
}
