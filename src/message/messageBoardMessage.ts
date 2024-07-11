import { GameEngineState } from "../gameEngine/gameEngine"

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
    | MessageBoardMessagePlayerSelectsSquaddie

export enum MessageBoardMessageType {
    BASE = "BASE",
    STARTED_PLAYER_PHASE = "STARTED_PLAYER_PHASE",
    PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE = "PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE",
    PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN = "PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN",
    SQUADDIE_IS_INJURED = "SQUADDIE_IS_INJURED",
    PLAYER_SELECTION_IS_INVALID = "PLAYER_SELECTION_IS_INVALID",
    PLAYER_CANCELS_TARGET_SELECTION = "PLAYER_CANCELS_TARGET_SELECTION",
    PLAYER_CANCELS_TARGET_CONFIRMATION = "PLAYER_CANCELS_TARGET_CONFIRMATION",
    PLAYER_ENDS_TURN = "PLAYER_ENDS_TURN",
    PLAYER_SELECTS_SQUADDIE = "PLAYER_SELECTS_SQUADDIE",
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
}

export interface MessageBoardMessagePlayerSelectsSquaddie {
    type: MessageBoardMessageType.PLAYER_SELECTS_SQUADDIE
    gameEngineState: GameEngineState
    battleSquaddieSelectedId: string
    selectionMethod: {
        mouse: {
            x: number
            y: number
        }
    }
}
