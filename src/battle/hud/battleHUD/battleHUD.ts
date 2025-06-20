import {
    FileAccessHUD,
    FileAccessHUDService,
} from "../fileAccess/fileAccessHUD"
import { getValidValueOrDefault } from "../../../utils/objectValidityCheck"
import {
    MessageBoardMessageMoveSquaddieToCoordinate,
    MessageBoardMessagePlayerCancelsTargetConfirmation,
    MessageBoardMessagePlayerCancelsTargetSelection,
    MessageBoardMessagePlayerConfirmsAction,
    MessageBoardMessagePlayerControlledSquaddieNeedsNextAction,
    MessageBoardMessagePlayerPeeksAtSquaddie,
    MessageBoardMessagePlayerSelectsActionTemplate,
    MessageBoardMessagePlayerSelectsAndLocksSquaddie,
    MessageBoardMessagePlayerSelectsTargetCoordinate,
    MessageBoardMessageType,
} from "../../../message/messageBoardMessage"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../../objectRepository"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { OrchestratorUtilities } from "../../orchestratorComponents/orchestratorUtils"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { TargetingResultsService } from "../../targeting/targetingService"
import { BattleSquaddie, BattleSquaddieService } from "../../battleSquaddie"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { SummaryHUDStateService } from "../summary/summaryHUD"
import {
    BattleAction,
    BattleActionService,
} from "../../history/battleAction/battleAction"
import { SquaddieTurnService } from "../../../squaddie/turn"
import { ActionCalculator } from "../../calculator/actionCalculator/calculator"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerSquaddieTypes,
    MapGraphicsLayerType,
} from "../../../hexMap/mapLayer/mapGraphicsLayer"
import { MapHighlightService } from "../../animation/mapHighlight"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { MovementCalculatorService } from "../../calculator/movement/movementCalculator"
import { BattleOrchestratorMode } from "../../orchestrator/battleOrchestrator"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import { ActionTemplateService } from "../../../action/template/actionTemplate"
import { CalculatedResult } from "../../history/calculatedResult"
import { BattleStateService } from "../../battleState/battleState"
import { SquaddieSelectorPanelService } from "../playerActionPanel/squaddieSelectorPanel/squaddieSelectorPanel"
import { PlayerConsideredActionsService } from "../../battleState/playerConsideredActions"
import { DrawSquaddieIconOnMapUtilities } from "../../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"

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
        message: MessageBoardMessagePlayerCancelsTargetSelection
    ) => {
        const battleSquaddieToHighlightId: string =
            BattleActionDecisionStepService.getActor(
                message.battleActionDecisionStep
            ).battleSquaddieId

        OrchestratorUtilities.highlightSquaddieRange({
            battleSquaddieToHighlightId: battleSquaddieToHighlightId,
            missionMap: message.missionMap,
            objectRepository: message.objectRepository,
            squaddieAllMovementCache: message.squaddieAllMovementCache,
        })

        BattleActionDecisionStepService.removeTarget({
            actionDecisionStep: message.battleActionDecisionStep,
        })

        if (message.summaryHUDState) {
            SummaryHUDStateService.reset(message.summaryHUDState)

            SummaryHUDStateService.createActorTiles({
                summaryHUDState: message.summaryHUDState,
                battleActionDecisionStep: message.battleActionDecisionStep,
                campaignResources: message.campaignResources,
                objectRepository: message.objectRepository,
            })
        }
    },
    cancelTargetConfirmation: (
        message: MessageBoardMessagePlayerCancelsTargetConfirmation
    ) => {
        const actionRange = TargetingResultsService.highlightTargetRange({
            missionMap: message.missionMap,
            objectRepository: message.objectRepository,
            battleActionDecisionStep: message.battleActionDecisionStep,
            battleActionRecorder: message.battleActionRecorder,
        })
        const highlightedColor =
            MapGraphicsLayerService.getActionTemplateHighlightedTileDescriptionColor(
                {
                    objectRepository: message.objectRepository,
                    actionTemplateId: BattleActionDecisionStepService.getAction(
                        message.battleActionDecisionStep
                    ).actionTemplateId,
                }
            )

        MapGraphicsLayerSquaddieTypes.forEach((t) =>
            TerrainTileMapService.removeGraphicsLayerByType(
                message.missionMap.terrainTileMap,
                t
            )
        )

        const actionRangeOnMap = MapGraphicsLayerService.new({
            id: BattleActionDecisionStepService.getActor(
                message.battleActionDecisionStep
            ).battleSquaddieId,
            highlightedTileDescriptions: [
                {
                    coordinates: actionRange,
                    pulseColor: highlightedColor,
                },
            ],
            type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
        })
        TerrainTileMapService.addGraphicsLayer(
            message.missionMap.terrainTileMap,
            actionRangeOnMap
        )

        BattleActionDecisionStepService.removeTarget({
            actionDecisionStep: message.battleActionDecisionStep,
        })
    },
    endPlayerSquaddieTurn: (
        gameEngineState: GameEngineState,
        battleAction: BattleAction
    ) => {
        const missionMap =
            gameEngineState.battleOrchestratorState.battleState.missionMap
        const { battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                ).battleSquaddieId
            )
        )

        const { currentMapCoordinate } =
            MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                battleSquaddie.battleSquaddieId
            )

        processEndTurnAction(
            gameEngineState,
            battleSquaddie,
            currentMapCoordinate
        )

        MissionMapService.setOriginMapCoordinateToCurrentMapCoordinate(
            missionMap,
            battleSquaddie.battleSquaddieId
        )

        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )
        DrawSquaddieIconOnMapUtilities.unTintSquaddieMapIcon(
            gameEngineState.repository,
            battleSquaddie
        )

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            battleAction
        )

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
            recommendedMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        })
    },
    playerSelectsSquaddie: (
        _battleHUD: BattleHUD,
        message: MessageBoardMessagePlayerSelectsAndLocksSquaddie
    ) => {
        const gameEngineState = message.gameEngineState
        const battleSquaddieId = message.battleSquaddieSelectedId

        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            SummaryHUDStateService.new()
        gameEngineState.battleOrchestratorState.battleState.playerConsideredActions =
            PlayerConsideredActionsService.new()

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

        OrchestratorUtilities.highlightSquaddieRange({
            battleSquaddieToHighlightId: battleSquaddieId,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            objectRepository: gameEngineState.repository,
            squaddieAllMovementCache:
                gameEngineState.battleOrchestratorState.cache
                    .searchResultsCache,
        })

        if (playerCanControlThisSquaddieRightNow) {
            showHUDForControllableSquaddie(gameEngineState, battleSquaddie)
        }

        if (squaddieIsNormallyControllableByPlayer) {
            createSquaddieStatusTileForNormallyControllableSquaddie(
                gameEngineState
            )
        } else {
            createSquaddieStatusTileForNormallyUncontrollableSquaddie(
                gameEngineState,
                battleSquaddie
            )
        }
    },
    playerPeeksAtSquaddie: (
        message: MessageBoardMessagePlayerPeeksAtSquaddie
    ) => {
        const battleSquaddieId = message.battleSquaddieSelectedId

        if (message.summaryHUDState) {
            SummaryHUDStateService.reset(message.summaryHUDState)
        }
        SummaryHUDStateService.peekAtSquaddie({
            summaryHUDState: message.summaryHUDState,
            battleSquaddieId,
            objectRepository: message.objectRepository,
        })

        const { currentMapCoordinate, originMapCoordinate } =
            MissionMapService.getByBattleSquaddieId(
                message.missionMap,
                battleSquaddieId
            )
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                message.objectRepository,
                battleSquaddieId
            )
        )
        const squaddieReachHighlightedOnMap =
            MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
                repository: message.objectRepository,
                missionMap: message.missionMap,
                battleSquaddieId: battleSquaddieId,
                currentMapCoordinate,
                originMapCoordinate,
                squaddieTurnOverride:
                    squaddieTemplate.squaddieId.affiliation ===
                    SquaddieAffiliation.PLAYER
                        ? undefined
                        : SquaddieTurnService.new(),
                squaddieAllMovementCache: message.squaddieAllMovementCache,
            })

        TerrainTileMapService.removeGraphicsLayerByType(
            message.missionMap.terrainTileMap,
            MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE
        )

        const { squaddieIsNormallyControllableByPlayer } =
            SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })
        if (squaddieIsNormallyControllableByPlayer) return
        const layerType: MapGraphicsLayerType =
            MapGraphicsLayerType.HOVERED_OVER_NORMALLY_UNCONTROLLABLE_SQUADDIE

        const actionRangeLayer = MapGraphicsLayerService.new({
            id: battleSquaddieId,
            highlightedTileDescriptions: squaddieReachHighlightedOnMap,
            type: layerType,
        })

        TerrainTileMapService.addGraphicsLayer(
            message.missionMap.terrainTileMap,
            actionRangeLayer
        )
    },
    playerSelectsActionTemplate: (
        message: MessageBoardMessagePlayerSelectsActionTemplate
    ) => {
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            message.objectRepository,
            message.actionTemplateId
        )

        TerrainTileMapService.removeAllGraphicsLayers(
            message.missionMap.terrainTileMap
        )

        BattleActionDecisionStepService.reset(message.battleActionDecisionStep)
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: message.battleActionDecisionStep,
            battleSquaddieId: message.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: message.battleActionDecisionStep,
            actionTemplateId: actionTemplate.id,
        })

        SummaryHUDStateService.createActionTiles({
            summaryHUDState: message.summaryHUDState,
            battleActionDecisionStep: message.battleActionDecisionStep,
            objectRepository: message.objectRepository,
        })

        message.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
            recommendedMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        })
    },
    playerSelectsTargetCoordinate: (
        message: MessageBoardMessagePlayerSelectsTargetCoordinate
    ) => {
        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep: message.battleActionDecisionStep,
            targetCoordinate: message.targetCoordinate,
        })

        SummaryHUDStateService.createActionPreviewTile({
            summaryHUDState: message.summaryHUDState,
            missionMap: message.missionMap,
            battleActionDecisionStep: message.battleActionDecisionStep,
            objectRepository: message.objectRepository,
            battleActionRecorder: message.battleActionRecorder,
            numberGenerator: message.numberGenerator,
        })

        TerrainTileMapService.removeAllGraphicsLayers(
            message.missionMap.terrainTileMap
        )
    },
    playerConfirmsAction: (
        message: MessageBoardMessagePlayerConfirmsAction
    ) => {
        const {
            battleSquaddie: actingBattleSquaddie,
            squaddieTemplate: actingSquaddieTemplate,
        } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                message.objectRepository,
                BattleActionDecisionStepService.getActor(
                    message.battleActionDecisionStep
                ).battleSquaddieId
            )
        )

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            message.objectRepository,
            BattleActionDecisionStepService.getAction(
                message.battleActionDecisionStep
            ).actionTemplateId
        )

        let actionEffectTemplates =
            ActionTemplateService.getActionEffectTemplates(actionTemplate)

        if (actionEffectTemplates.length === 0) {
            return
        }

        SquaddieTurnService.setSpentMovementActionPointsAsNotRefundable({
            squaddieTurn: actingBattleSquaddie.squaddieTurn,
            actionTemplate,
        })
        InBattleAttributesService.addActionCooldown({
            inBattleAttributes: actingBattleSquaddie.inBattleAttributes,
            actionTemplateId: actionTemplate.id,
            numberOfCooldownTurns: actionTemplate.resourceCost.cooldownTurns,
        })

        const targetCoordinate = BattleActionDecisionStepService.getTarget(
            message.battleActionDecisionStep
        ).targetCoordinate

        BattleActionDecisionStepService.reset(message.battleActionDecisionStep)
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: message.battleActionDecisionStep,
            battleSquaddieId: actingBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: message.battleActionDecisionStep,
            actionTemplateId: actionTemplate.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: message.battleActionDecisionStep,
            targetCoordinate: targetCoordinate,
        })

        let results: CalculatedResult =
            ActionCalculator.calculateAndApplyResults({
                battleActionDecisionStep: message.battleActionDecisionStep,
                missionMap: message.missionMap,
                objectRepository: message.objectRepository,
                battleActionRecorder: message.battleActionRecorder,
                numberGenerator: message.numberGenerator,
                missionStatistics: message.missionStatistics,
            })

        BattleActionDecisionStepService.confirmAlreadyConsideredTarget({
            actionDecisionStep: message.battleActionDecisionStep,
        })

        const squaddieBattleActions: BattleAction[] =
            results.changesPerEffect.map((result) => {
                return BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            actingBattleSquaddie.battleSquaddieId,
                        actorContext: result.actorContext,
                    },
                    action: { actionTemplateId: actionTemplate.id },
                    effect: {
                        squaddie: result.squaddieChanges,
                    },
                })
            })

        squaddieBattleActions.forEach((squaddieBattleAction) => {
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                message.battleActionRecorder,
                squaddieBattleAction
            )
        })
        clearAllHoverAndClickedLayersExceptForThisSquaddie({
            missionMap: message.missionMap,
            actingBattleSquaddie,
            actingSquaddieTemplate,
        })

        MissionMapService.setOriginMapCoordinateToCurrentMapCoordinate(
            message.missionMap,
            actingBattleSquaddie.battleSquaddieId
        )
    },
    tryToMoveSquaddieToLocation: (
        message: MessageBoardMessageMoveSquaddieToCoordinate
    ) => {
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                message.objectRepository,
                message.battleSquaddieId
            )
        )
        const destination = message.targetCoordinate
        if (
            HexCoordinateService.areEqual(
                destination,
                MissionMapService.getByBattleSquaddieId(
                    message.missionMap,
                    battleSquaddie.battleSquaddieId
                ).currentMapCoordinate
            )
        )
            return

        if (
            !MovementCalculatorService.isMovementPossible({
                battleSquaddie,
                squaddieTemplate,
                destination,
                squaddieAllMovementCache: message.squaddieAllMovementCache,
                objectRepository: message.objectRepository,
                missionMap: message.missionMap,
            })
        )
            return

        MovementCalculatorService.setBattleActionDecisionStepReadyToAnimate({
            battleActionDecisionStep: message.battleActionDecisionStep,
            missionMap: message.missionMap,
            battleState: message.battleState,
            objectRepository: message.objectRepository,
            battleSquaddie,
            squaddieTemplate,
            destination,
        })
        MovementCalculatorService.spendActionPointsOnRefundableMovement({
            searchPath: message.battleState.squaddieMovePath,
            objectRepository: message.objectRepository,
            battleSquaddie,
        })
        MovementCalculatorService.queueBattleActionToMove({
            missionMap: message.missionMap,
            battleActionRecorder: message.battleActionRecorder,
            battleSquaddie,
            destination,
        })
        MissionMapService.updateBattleSquaddieCoordinate({
            missionMap: message.missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            coordinate: destination,
        })

        message.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR,
            recommendedMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
        })
    },
    playerControlledSquaddieNeedsNextAction: (
        message: MessageBoardMessagePlayerControlledSquaddieNeedsNextAction
    ) => {
        return playerControlledSquaddieNeedsNextAction(message)
    },
}

const processEndTurnAction = (
    gameEngineState: GameEngineState,
    battleSquaddie: BattleSquaddie,
    mapCoordinate: HexCoordinate
) => {
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
    BattleActionDecisionStepService.reset(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    )
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
        targetCoordinate: mapCoordinate,
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

const clearAllHoverAndClickedLayersExceptForThisSquaddie = ({
    missionMap,
    actingBattleSquaddie,
    actingSquaddieTemplate,
}: {
    missionMap: MissionMap
    actingBattleSquaddie: BattleSquaddie
    actingSquaddieTemplate: SquaddieTemplate
}) => {
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
        terrainTileMap: missionMap.terrainTileMap,
        id: actingBattleSquaddie.battleSquaddieId,
        type: layerType,
    })
    MapGraphicsLayerSquaddieTypes.forEach((t) =>
        TerrainTileMapService.removeGraphicsLayerByType(
            missionMap.terrainTileMap,
            t
        )
    )
    if (confirmLayer) {
        TerrainTileMapService.addGraphicsLayer(
            missionMap.terrainTileMap,
            confirmLayer
        )
    }
}

const playerControlledSquaddieNeedsNextAction = (
    message: MessageBoardMessagePlayerControlledSquaddieNeedsNextAction
) => {
    const objectRepository = message.objectRepository
    const battleSquaddieId = message.battleSquaddieId
    const missionMap = message.missionMap

    TerrainTileMapService.removeAllGraphicsLayers(missionMap.terrainTileMap)

    const { currentMapCoordinate, originMapCoordinate } =
        MissionMapService.getByBattleSquaddieId(missionMap, battleSquaddieId)
    const squaddieReachHighlightedOnMap =
        MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
            repository: objectRepository,
            missionMap,
            battleSquaddieId,
            currentMapCoordinate,
            originMapCoordinate,
            squaddieAllMovementCache: message.squaddieAllMovementCache,
        })
    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: battleSquaddieId,
        highlightedTileDescriptions: squaddieReachHighlightedOnMap,
        type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
    })
    TerrainTileMapService.addGraphicsLayer(
        missionMap.terrainTileMap,
        actionRangeOnMap
    )

    message.playerCommandState.actionValidity = undefined
}

const showHUDForControllableSquaddie = (
    gameEngineState: GameEngineState,
    battleSquaddie: BattleSquaddie
) => {
    if (
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep === undefined
    ) {
        BattleActionDecisionStepService.reset(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    }
    BattleActionDecisionStepService.setActor({
        actionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
    })

    if (
        gameEngineState.battleOrchestratorState.battleHUDState
            .squaddieSelectorPanel == undefined
    ) {
        const currentTeam = BattleStateService.getCurrentTeam(
            gameEngineState.battleOrchestratorState.battleState,
            gameEngineState.repository
        )

        if (currentTeam) {
            gameEngineState.battleOrchestratorState.battleHUDState.squaddieSelectorPanel =
                SquaddieSelectorPanelService.new({
                    battleSquaddieIds: currentTeam.battleSquaddieIds,
                    objectRepository: gameEngineState.repository,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                })
        }
    }
    SquaddieSelectorPanelService.selectSquaddie(
        gameEngineState.battleOrchestratorState.battleHUDState
            .squaddieSelectorPanel,
        battleSquaddie.battleSquaddieId
    )
}

const createSquaddieStatusTileForNormallyControllableSquaddie = (
    gameEngineState: GameEngineState
) => {
    SummaryHUDStateService.createActorTiles({
        battleActionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep,
        campaignResources: gameEngineState.campaign.resources,
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        objectRepository: gameEngineState.repository,
    })
}

const createSquaddieStatusTileForNormallyUncontrollableSquaddie = (
    gameEngineState: GameEngineState,
    battleSquaddie: BattleSquaddie
) => {
    SummaryHUDStateService.peekAtSquaddie({
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        objectRepository: gameEngineState.repository,
        removeExpirationTime: true,
    })
}
