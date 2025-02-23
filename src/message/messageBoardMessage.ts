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
    | MessageBoardMessagePlayerSelectsActionThatRequiresATarget
    | MessageBoardMessagePlayerSelectsTargetCoordinate
    | MessageBoardMessagePlayerConfirmsAction
    | MessageBoardMessageSquaddiePhaseStarts
    | MessageBoardMessageSquaddiePhaseEnds
    | MessageBoardMessageSelectAndLockNextSquaddie
    | MessageBoardMessageMoveSquaddieToCoordinate
    | MessageBoardMessagePlayerCancelsPlayerActionConsiderations
    | MessageBoardMessagePlayerSelectsEmptyTile
    | MessageBoardMessagePlayerSelectsActionWithKnownTargets
    | MessageBoardMessagePlayerConfirmsDecisionStepActor
    | MessageBoardMessagePlayerControlledSquaddieNeedsNextAction
    | MessageBoardMessageSquaddieTurnEnds
    | MessageBoardMessagePlayerDataLoadUserRequest
    | MessageBoardMessagePlayerDataLoadBegin
    | MessageBoardMessagePlayerDataLoadComplete
    | MessageBoardMessagePlayerDataLoadErrorDuring
    | MessageBoardMessagePlayerDataLoadUserCancel
    | MessageBoardMessagePlayerDataLoadFinishRequest

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
    PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET = "PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET",
    PLAYER_SELECTS_ACTION_WITH_KNOWN_TARGETS = "PLAYER_SELECTS_ACTION_WITH_KNOWN_TARGETS",
    PLAYER_SELECTS_TARGET_COORDINATE = "PLAYER_SELECTS_TARGET_COORDINATE",
    PLAYER_CONFIRMS_ACTION = "PLAYER_CONFIRMS_ACTION",
    SQUADDIE_PHASE_STARTS = "SQUADDIE_PHASE_STARTS",
    SQUADDIE_PHASE_ENDS = "SQUADDIE_PHASE_ENDS",
    SELECT_AND_LOCK_NEXT_SQUADDIE = "SELECT_AND_LOCK_NEXT_SQUADDIE",
    MOVE_SQUADDIE_TO_COORDINATE = "MOVE_SQUADDIE_TO_COORDINATE",
    PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS = "PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS",
    PLAYER_SELECTS_EMPTY_TILE = "PLAYER_SELECTS_EMPTY_TILE",
    PLAYER_CONFIRMS_DECISION_STEP_ACTOR = "PLAYER_CONFIRMS_DECISION_STEP_ACTOR",
    PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION = "PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION",
    SQUADDIE_TURN_ENDS = "SQUADDIE_TURN_ENDS",
    PLAYER_DATA_LOAD_USER_REQUEST = "PLAYER_DATA_LOAD_USER_REQUEST",
    PLAYER_DATA_LOAD_COMPLETE = "PLAYER_DATA_LOAD_COMPLETE",
    PLAYER_DATA_LOAD_BEGIN = "PLAYER_DATA_LOAD_BEGIN",
    PLAYER_DATA_LOAD_ERROR_DURING = "PLAYER_DATA_LOAD_ERROR_DURING",
    PLAYER_DATA_LOAD_USER_CANCEL = "PLAYER_DATA_LOAD_USER_CANCEL",
    PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD = "PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD",
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
    gameEngineState: GameEngineState
}

export interface MessageBoardMessagePlayerCancelsTargetConfirmation {
    type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION
    gameEngineState: GameEngineState
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
    gameEngineState: GameEngineState
    battleSquaddieSelectedId: string
    selectionMethod: SquaddieSelectionMethod
}

export interface MessageBoardBattleActionFinishesAnimation {
    type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION
    gameEngineState: GameEngineState
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}

export interface MessageBoardMessagePlayerSelectsActionThatRequiresATarget {
    type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET
    gameEngineState: GameEngineState
    actionTemplateId: string
    battleSquaddieId: string
    mapStartingCoordinate: HexCoordinate
    mouseLocation: ScreenLocation
}

export interface MessageBoardMessagePlayerSelectsActionWithKnownTargets {
    type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_WITH_KNOWN_TARGETS
    gameEngineState: GameEngineState
    actionTemplateId: string
    actorBattleSquaddieId: string
    targetBattleSquaddieIds: string[]
    mapStartingCoordinate: HexCoordinate
}

export interface MessageBoardMessagePlayerSelectsTargetCoordinate {
    type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE
    targetCoordinate: HexCoordinate
    gameEngineState: GameEngineState
}

export interface MessageBoardMessagePlayerConfirmsAction {
    type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION
    gameEngineState: GameEngineState
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
    gameEngineState: GameEngineState
}

export interface MessageBoardMessagePlayerCancelsPlayerActionConsiderations {
    type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS
    gameEngineState: GameEngineState
}

export interface MessageBoardMessagePlayerSelectsEmptyTile {
    type: MessageBoardMessageType.PLAYER_SELECTS_EMPTY_TILE
    gameEngineState: GameEngineState
    coordinate: HexCoordinate
}

export interface MessageBoardMessagePlayerConfirmsDecisionStepActor {
    type: MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
    gameEngineState: GameEngineState
    recommendedMode: BattleOrchestratorMode
}

export interface MessageBoardMessagePlayerControlledSquaddieNeedsNextAction {
    type: MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION
    gameEngineState: GameEngineState
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
    gameEngineState: GameEngineState
    useAction: {
        actionTemplateId: string
        isEndTurn: boolean
        movement?: MovementDecision
    }
    cancelAction?: {
        actionTemplate?: boolean
        movement?: boolean
    }
}
