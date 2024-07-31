import { GameEngineState } from "../gameEngine/gameEngine"
import { BattleAction } from "../battle/history/battleAction"
import { SquaddieSummaryPopoverPosition } from "../battle/hud/playerActionPanel/squaddieSummaryPopover"
import { ActionTemplate } from "../action/template/actionTemplate"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"

export type MessageBoardMessage =
    | MessageBoardMessageBase
    | MessageBoardMessageStartedPlayerPhase
    | MessageBoardMessagePlayerCanControlDifferentSquaddie
    | MessageBoardMessagePlayerSelectsDifferentSquaddieMidTurn
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

export enum MessageBoardMessageType {
    BASE = "BASE",
    STARTED_PLAYER_PHASE = "STARTED_PLAYER_PHASE",
    PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE = "PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE",
    SQUADDIE_IS_INJURED = "SQUADDIE_IS_INJURED",
    PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN = "PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN",
    PLAYER_SELECTION_IS_INVALID = "PLAYER_SELECTION_IS_INVALID",
    PLAYER_CANCELS_TARGET_SELECTION = "PLAYER_CANCELS_TARGET_SELECTION",
    PLAYER_CANCELS_TARGET_CONFIRMATION = "PLAYER_CANCELS_TARGET_CONFIRMATION",
    PLAYER_ENDS_TURN = "PLAYER_ENDS_TURN",
    PLAYER_SELECTS_AND_LOCKS_SQUADDIE = "PLAYER_SELECTS_AND_LOCKS_SQUADDIE",
    PLAYER_PEEKS_AT_SQUADDIE = "PLAYER_PEEKS_AT_SQUADDIE",
    BATTLE_ACTION_FINISHES_ANIMATION = "BATTLE_ACTION_FINISHES_ANIMATION",
    PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET = "PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET",
    PLAYER_SELECTS_TARGET_LOCATION = "PLAYER_SELECTS_TARGET_LOCATION",
    PLAYER_CONFIRMS_ACTION = "PLAYER_CONFIRMS_ACTION",
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

export interface MessageBoardMessagePlayerSelectsDifferentSquaddieMidTurn {
    type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN
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
        mouse: {
            x: number
            y: number
        }
    }
}

export interface MessageBoardMessagePlayerPeeksAtSquaddie {
    type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE
    gameEngineState: GameEngineState
    battleSquaddieSelectedId: string
    selectionMethod: {
        mouse: {
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
    actionTemplate: ActionTemplate
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
