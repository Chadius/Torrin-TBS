import { GameEngineState } from "../gameEngine/gameEngine"
import { BattleAction } from "../battle/history/battleAction/battleAction"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { MousePress, ScreenLocation } from "../utils/mouseConfig"
import { BattleOrchestratorMode } from "../battle/orchestrator/battleOrchestrator"
import { PopupWindow } from "../battle/hud/popupWindow/popupWindow"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../resource/resourceHandler"
import { LoadSaveState } from "../dataLoader/playerData/loadSaveState"
import { BattleSaveState } from "../battle/history/battleSaveState"
import { MovementDecision } from "../battle/playerSelectionService/playerSelectionContext"
import { BattleActionDecisionStep } from "../battle/actionDecision/battleActionDecisionStep"
import { MissionMap } from "../missionMap/missionMap"
import { ObjectRepository } from "../battle/objectRepository"
import { CampaignResources } from "../campaign/campaignResources"
import { SummaryHUDState } from "../battle/hud/summary/summaryHUD"
import { NumberGeneratorStrategy } from "../battle/numberGenerator/strategy"
import { BattleActionRecorder } from "../battle/history/battleAction/battleActionRecorder"
import { MessageBoard } from "./messageBoard"
import { MissionStatistics } from "../battle/missionStatistics/missionStatistics"
import { PlayerConsideredActions } from "../battle/battleState/playerConsideredActions"
import { PlayerDecisionHUD } from "../battle/hud/playerActionPanel/playerDecisionHUD"
import { PlayerCommandState } from "../battle/hud/playerCommand/playerCommandHUD"
import { BattleState } from "../battle/battleState/battleState"
import { SearchResultsCache } from "../hexMap/pathfinder/searchResults/searchResultsCache"
import { Glossary } from "../campaign/glossary/glossary"

export type MessageBoardMessage =
    | MessageBoardMessageBase
    | MessageBoardMessageStartedPlayerPhase
    | MessageBoardMessagePlayerCanControlDifferentSquaddie
    | MessageBoardMessageSquaddieIsInjured
    | MessageBoardMessagePlayerSelectionIsInvalid
    | MessageBoardMessagePlayerCancelsTargetSelection
    | MessageBoardMessagePlayerCancelsTargetConfirmation
    | MessageBoardMessagePlayerEndsTurn
    | MessageBoardMessagePlayerSelectsAndLocksSquaddie
    | MessageBoardMessagePlayerPeeksAtSquaddie
    | MessageBoardBattleActionFinishesAnimation
    | MessageBoardMessagePlayerConsidersAction
    | MessageBoardMessagePlayerConsidersMovement
    | MessageBoardMessagePlayerSelectsActionTemplate
    | MessageBoardMessagePlayerSelectsTargetCoordinate
    | MessageBoardMessagePlayerConfirmsAction
    | MessageBoardMessageSquaddiePhaseStarts
    | MessageBoardMessageSquaddiePhaseEnds
    | MessageBoardMessageSelectAndLockNextSquaddie
    | MessageBoardMessageMoveSquaddieToCoordinate
    | MessageBoardMessagePlayerCancelsPlayerActionConsiderations
    | MessageBoardMessagePlayerConfirmsDecisionStepActor
    | MessageBoardMessagePlayerControlledSquaddieNeedsNextAction
    | MessageBoardMessageSquaddieTurnEnds
    | MessageBoardMessagePlayerDataLoadUserRequest
    | MessageBoardMessagePlayerDataLoadBegin
    | MessageBoardMessagePlayerDataLoadComplete
    | MessageBoardMessagePlayerDataLoadErrorDuring
    | MessageBoardMessagePlayerDataLoadUserCancel
    | MessageBoardMessagePlayerDataLoadFinishRequest
    | MessageBoardMessageTypeLoadBlockerBeginsLoadingResources
    | MessageBoardMessageTypeLoadBlockerFinishesLoadingResources

export enum MessageBoardMessageType {
    BASE = "BASE",
    STARTED_PLAYER_PHASE = "STARTED_PLAYER_PHASE",
    PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE = "PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE",
    SQUADDIE_IS_INJURED = "SQUADDIE_IS_INJURED",
    PLAYER_SELECTION_IS_INVALID = "PLAYER_SELECTION_IS_INVALID",
    PLAYER_CANCELS_TARGET_SELECTION = "PLAYER_CANCELS_TARGET_SELECTION",
    PLAYER_CANCELS_TARGET_CONFIRMATION = "PLAYER_CANCELS_TARGET_CONFIRMATION",
    PLAYER_ENDS_TURN = "PLAYER_ENDS_TURN",
    PLAYER_SELECTS_AND_LOCKS_SQUADDIE = "PLAYER_SELECTS_AND_LOCKS_SQUADDIE",
    PLAYER_PEEKS_AT_SQUADDIE = "PLAYER_PEEKS_AT_SQUADDIE",
    BATTLE_ACTION_FINISHES_ANIMATION = "BATTLE_ACTION_FINISHES_ANIMATION",
    PLAYER_CONSIDERS_ACTION = "PLAYER_CONSIDERS_ACTION",
    PLAYER_CONSIDERS_MOVEMENT = "PLAYER_CONSIDERS_MOVEMENT",
    PLAYER_SELECTS_ACTION_TEMPLATE = "PLAYER_SELECTS_ACTION_TEMPLATE",
    PLAYER_SELECTS_TARGET_COORDINATE = "PLAYER_SELECTS_TARGET_COORDINATE",
    PLAYER_CONFIRMS_ACTION = "PLAYER_CONFIRMS_ACTION",
    SQUADDIE_PHASE_STARTS = "SQUADDIE_PHASE_STARTS",
    SQUADDIE_PHASE_ENDS = "SQUADDIE_PHASE_ENDS",
    SELECT_AND_LOCK_NEXT_SQUADDIE = "SELECT_AND_LOCK_NEXT_SQUADDIE",
    MOVE_SQUADDIE_TO_COORDINATE = "MOVE_SQUADDIE_TO_COORDINATE",
    PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS = "PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS",
    PLAYER_CONFIRMS_DECISION_STEP_ACTOR = "PLAYER_CONFIRMS_DECISION_STEP_ACTOR",
    PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION = "PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION",
    SQUADDIE_TURN_ENDS = "SQUADDIE_TURN_ENDS",
    PLAYER_DATA_LOAD_USER_REQUEST = "PLAYER_DATA_LOAD_USER_REQUEST",
    PLAYER_DATA_LOAD_COMPLETE = "PLAYER_DATA_LOAD_COMPLETE",
    PLAYER_DATA_LOAD_BEGIN = "PLAYER_DATA_LOAD_BEGIN",
    PLAYER_DATA_LOAD_ERROR_DURING = "PLAYER_DATA_LOAD_ERROR_DURING",
    PLAYER_DATA_LOAD_USER_CANCEL = "PLAYER_DATA_LOAD_USER_CANCEL",
    PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD = "PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD",
    LOAD_BLOCKER_BEGINS_LOADING_RESOURCES = "LOAD_BLOCKER_BEGINS_LOADING_RESOURCES",
    LOAD_BLOCKER_FINISHES_LOADING_RESOURCES = "LOAD_BLOCKER_FINISHES_LOADING_RESOURCES",
}

export interface MessageBoardMessageBase {
    type: MessageBoardMessageType.BASE
    message: string
}

export interface MessageBoardMessageStartedPlayerPhase {
    type: MessageBoardMessageType.STARTED_PLAYER_PHASE
    gameEngineState: GameEngineState
}

export interface MessageBoardMessagePlayerCanControlDifferentSquaddie {
    type: MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE
    gameEngineState: GameEngineState
}

export interface MessageBoardMessageSquaddieIsInjured {
    type: MessageBoardMessageType.SQUADDIE_IS_INJURED
    gameEngineState: GameEngineState
    battleSquaddieIdsThatWereInjured: string[]
}

export interface MessageBoardMessagePlayerSelectionIsInvalid {
    type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID
    gameEngineState: GameEngineState
    popupWindow: PopupWindow
}

export interface MessageBoardMessagePlayerCancelsTargetSelection {
    type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION
    summaryHUDState: SummaryHUDState
    battleActionDecisionStep: BattleActionDecisionStep
    missionMap: MissionMap
    objectRepository: ObjectRepository
    campaignResources: CampaignResources
    squaddieAllMovementCache: SearchResultsCache
}

export interface MessageBoardMessagePlayerCancelsTargetConfirmation {
    type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION
    missionMap: MissionMap
    objectRepository: ObjectRepository
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
}

export interface MessageBoardMessagePlayerEndsTurn {
    type: MessageBoardMessageType.PLAYER_ENDS_TURN
    gameEngineState: GameEngineState
    battleAction: BattleAction
}

export type SquaddieSelectionMethod = {
    mouse?: MousePress | ScreenLocation
    mapCoordinate?: HexCoordinate
}

export interface MessageBoardMessagePlayerSelectsAndLocksSquaddie {
    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
    gameEngineState: GameEngineState
    battleSquaddieSelectedId: string
}

export interface MessageBoardMessagePlayerPeeksAtSquaddie {
    type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE
    battleSquaddieSelectedId: string
    selectionMethod: SquaddieSelectionMethod
    summaryHUDState: SummaryHUDState
    missionMap: MissionMap
    objectRepository: ObjectRepository
    campaignResources: CampaignResources
    squaddieAllMovementCache: SearchResultsCache
}

export interface MessageBoardBattleActionFinishesAnimation {
    type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION
    gameEngineState: GameEngineState
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}

export interface MessageBoardMessagePlayerSelectsActionTemplate {
    type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_TEMPLATE
    objectRepository: ObjectRepository
    missionMap: MissionMap
    summaryHUDState: SummaryHUDState
    battleActionDecisionStep: BattleActionDecisionStep
    messageBoard: MessageBoard
    actionTemplateId: string
    battleSquaddieId: string
    mapStartingCoordinate: HexCoordinate
    glossary: Glossary
}

export interface MessageBoardMessagePlayerSelectsTargetCoordinate {
    type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE
    numberGenerator: NumberGeneratorStrategy
    missionMap: MissionMap
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
    summaryHUDState: SummaryHUDState
    objectRepository: ObjectRepository
    targetCoordinate: HexCoordinate
}

export interface MessageBoardMessagePlayerConfirmsAction {
    type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION
    objectRepository: ObjectRepository
    missionMap: MissionMap
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
    numberGenerator: NumberGeneratorStrategy
    missionStatistics: MissionStatistics
}

export interface MessageBoardMessageSquaddiePhaseStarts {
    type: MessageBoardMessageType.SQUADDIE_PHASE_STARTS
    phase: BattlePhase
    gameEngineState: GameEngineState
}

export interface MessageBoardMessageSquaddiePhaseEnds {
    type: MessageBoardMessageType.SQUADDIE_PHASE_ENDS
    phase: BattlePhase
    gameEngineState: GameEngineState
}

export interface MessageBoardMessageSelectAndLockNextSquaddie {
    type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE
    gameEngineState: GameEngineState
}

export interface MessageBoardMessageMoveSquaddieToCoordinate {
    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE
    battleSquaddieId: string
    targetCoordinate: HexCoordinate
    missionMap: MissionMap
    objectRepository: ObjectRepository
    messageBoard: MessageBoard
    battleActionDecisionStep: BattleActionDecisionStep
    campaignResources: CampaignResources
    battleState: BattleState
    battleActionRecorder: BattleActionRecorder
    squaddieAllMovementCache: SearchResultsCache
}

export interface MessageBoardMessagePlayerCancelsPlayerActionConsiderations {
    type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS
    missionMap: MissionMap
    summaryHUDState: SummaryHUDState
    playerCommandState: PlayerCommandState
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
    playerConsideredActions: PlayerConsideredActions
    playerDecisionHUD: PlayerDecisionHUD
    objectRepository: ObjectRepository
}

export interface MessageBoardMessagePlayerConfirmsDecisionStepActor {
    type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
    recommendedMode: BattleOrchestratorMode
}

export interface MessageBoardMessagePlayerControlledSquaddieNeedsNextAction {
    type: MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION
    objectRepository: ObjectRepository
    battleSquaddieId: string
    missionMap: MissionMap
    playerCommandState: PlayerCommandState
    campaignResources: CampaignResources
    squaddieAllMovementCache: SearchResultsCache
}

export interface MessageBoardMessageSquaddieTurnEnds {
    type: MessageBoardMessageType.SQUADDIE_TURN_ENDS
    gameEngineState: GameEngineState
}

export interface MessageBoardMessagePlayerDataLoadUserRequest {
    type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
    loadSaveState: LoadSaveState
}

export interface MessageBoardMessagePlayerDataLoadBegin {
    type: MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN
    loadSaveState: LoadSaveState
}

export interface MessageBoardMessagePlayerDataLoadComplete {
    type: MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE
    loadSaveState: LoadSaveState
    saveState: BattleSaveState
}

export interface MessageBoardMessagePlayerDataLoadErrorDuring {
    type: MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING
    loadSaveState: LoadSaveState
}

export interface MessageBoardMessagePlayerDataLoadUserCancel {
    type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_CANCEL
    loadSaveState: LoadSaveState
}

export interface MessageBoardMessagePlayerDataLoadFinishRequest {
    type: MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD
    loadSaveState: LoadSaveState
}

export interface MessageBoardMessagePlayerConsidersAction {
    type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION
    playerConsideredActions: PlayerConsideredActions
    summaryHUDState: SummaryHUDState
    playerDecisionHUD: PlayerDecisionHUD
    missionMap: MissionMap
    battleActionDecisionStep: BattleActionDecisionStep
    objectRepository: ObjectRepository
    glossary: Glossary
    useAction: {
        actionTemplateId: string
        isEndTurn: boolean
    }
}

export interface MessageBoardMessagePlayerConsidersMovement {
    type: MessageBoardMessageType.PLAYER_CONSIDERS_MOVEMENT
    playerConsideredActions: PlayerConsideredActions
    summaryHUDState: SummaryHUDState
    playerDecisionHUD: PlayerDecisionHUD
    missionMap: MissionMap
    battleActionDecisionStep: BattleActionDecisionStep
    objectRepository: ObjectRepository
    movementDecision: MovementDecision
}

export interface MessageBoardMessageTypeLoadBlockerBeginsLoadingResources {
    type: MessageBoardMessageType.LOAD_BLOCKER_BEGINS_LOADING_RESOURCES
}

export interface MessageBoardMessageTypeLoadBlockerFinishesLoadingResources {
    type: MessageBoardMessageType.LOAD_BLOCKER_FINISHES_LOADING_RESOURCES
}
