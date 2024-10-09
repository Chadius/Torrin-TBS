import { GameEngineState } from "../gameEngine/gameEngine"
import { BattleAction } from "../battle/history/battleAction/battleAction"
import { SquaddieSummaryPopoverPosition } from "../battle/hud/playerActionPanel/squaddieSummaryPopover"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { SummaryPopoverType } from "../battle/hud/summaryHUD"
import { MouseClick, ScreenCoordinate } from "../utils/mouseConfig"
import { BattleOrchestratorMode } from "../battle/orchestrator/battleOrchestrator"

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
    | MessageBoardMessagePlayerSelectsActionThatRequiresATarget
    | MessageBoardMessagePlayerSelectsTargetLocation
    | MessageBoardMessagePlayerConfirmsAction
    | MessageBoardMessageSquaddiePhaseStarts
    | MessageBoardMessageSquaddiePhaseEnds
    | MessageBoardMessageSummaryPopoverExpires
    | MessageBoardMessageSelectAndLockNextSquaddie
    | MessageBoardMessageMoveSquaddieToLocation
    | MessageBoardMessagePlayerCancelsSquaddieSelection
    | MessageBoardMessagePlayerSelectsEmptyTile
    | MessageBoardMessagePlayerSelectsActionThatDoesNotNeedATarget
    | MessageBoardMessagePlayerConfirmsDecisionStepActor
    | MessageBoardMessagePlayerControlledSquaddieNeedsNextAction
    | MessageBoardMessageSquaddieTurnEnds

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
    PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET = "PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET",
    PLAYER_SELECTS_ACTION_THAT_DOES_NOT_NEED_A_TARGET = "PLAYER_SELECTS_ACTION_THAT_DOES_NOT_NEED_A_TARGET",
    PLAYER_SELECTS_TARGET_LOCATION = "PLAYER_SELECTS_TARGET_LOCATION",
    PLAYER_CONFIRMS_ACTION = "PLAYER_CONFIRMS_ACTION",
    SQUADDIE_PHASE_STARTS = "SQUADDIE_PHASE_STARTS",
    SQUADDIE_PHASE_ENDS = "SQUADDIE_PHASE_ENDS",
    SUMMARY_POPOVER_EXPIRES = "SUMMARY_POPOVER_EXPIRES",
    SELECT_AND_LOCK_NEXT_SQUADDIE = "SELECT_AND_LOCK_NEXT_SQUADDIE",
    MOVE_SQUADDIE_TO_LOCATION = "MOVE_SQUADDIE_TO_LOCATION",
    PLAYER_CANCELS_SQUADDIE_SELECTION = "PLAYER_CANCELS_SQUADDIE_SELECTION",
    PLAYER_SELECTS_EMPTY_TILE = "PLAYER_SELECTS_EMPTY_TILE",
    PLAYER_CONFIRMS_DECISION_STEP_ACTOR = "PLAYER_CONFIRMS_DECISION_STEP_ACTOR",
    PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION = "PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION",
    SQUADDIE_TURN_ENDS = "SQUADDIE_TURN_ENDS",
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
    reason: string
    selectionLocation: {
        x: number
        y: number
    }
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

export interface MessageBoardMessagePlayerSelectsAndLocksSquaddie {
    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
    gameEngineState: GameEngineState
    battleSquaddieSelectedId: string
    selectionMethod: {
        mouseClick: MouseClick
    }
}

export interface MessageBoardMessagePlayerPeeksAtSquaddie {
    type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE
    gameEngineState: GameEngineState
    battleSquaddieSelectedId: string
    selectionMethod: {
        mouseMovement: {
            x: number
            y: number
        }
    }
    squaddieSummaryPopoverPosition: SquaddieSummaryPopoverPosition
}

export interface MessageBoardBattleActionFinishesAnimation {
    type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION
    gameEngineState: GameEngineState
}

export interface MessageBoardMessagePlayerSelectsActionThatRequiresATarget {
    type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET
    gameEngineState: GameEngineState
    actionTemplateId: string
    battleSquaddieId: string
    mapStartingLocation: HexCoordinate
    mouseLocation: ScreenCoordinate
}

export interface MessageBoardMessagePlayerSelectsActionThatDoesNotNeedATarget {
    type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_DOES_NOT_NEED_A_TARGET
    gameEngineState: GameEngineState
    actionTemplateId: string
    battleSquaddieId: string
    mapStartingLocation: HexCoordinate
}

export interface MessageBoardMessagePlayerSelectsTargetLocation {
    type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_LOCATION
    targetLocation: HexCoordinate
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

export interface MessageBoardMessageSummaryPopoverExpires {
    type: MessageBoardMessageType.SUMMARY_POPOVER_EXPIRES
    gameEngineState: GameEngineState
    popoverType: SummaryPopoverType
}

export interface MessageBoardMessageSelectAndLockNextSquaddie {
    type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE
    gameEngineState: GameEngineState
}

export interface MessageBoardMessageMoveSquaddieToLocation {
    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION
    battleSquaddieId: string
    targetLocation: HexCoordinate
    gameEngineState: GameEngineState
}

export interface MessageBoardMessagePlayerCancelsSquaddieSelection {
    type: MessageBoardMessageType.PLAYER_CANCELS_SQUADDIE_SELECTION
    gameEngineState: GameEngineState
}

export interface MessageBoardMessagePlayerSelectsEmptyTile {
    type: MessageBoardMessageType.PLAYER_SELECTS_EMPTY_TILE
    gameEngineState: GameEngineState
    location: HexCoordinate
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
