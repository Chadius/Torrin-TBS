import {GameEngineState} from "../gameEngine/gameEngine";

export type MessageBoardMessage =
    MessageBoardMessageBase
    | MessageBoardMessageStartedPlayerPhase

export enum MessageBoardMessageType {
    BASE = "BASE",
    STARTED_PLAYER_PHASE = "STARTED_PLAYER_PHASE",
}

export interface MessageBoardMessageBase {
    type: MessageBoardMessageType.BASE;
    message: string;
}

export interface MessageBoardMessageStartedPlayerPhase {
    type: MessageBoardMessageType.STARTED_PLAYER_PHASE;
    gameEngineState: GameEngineState;
}
