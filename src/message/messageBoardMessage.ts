import { GameEngineState } from "../gameEngine/gameEngine"
import { BattleAction } from "../battle/history/battleAction/battleAction"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import { TBattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { MousePress, ScreenLocation } from "../utils/mouseConfig"
import { TBattleOrchestratorMode } from "../battle/orchestrator/battleOrchestrator"
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
import { ChallengeModifierSetting } from "../battle/challengeModifier/challengeModifierSetting"
import { EnumLike } from "../utils/enum"

export type MessageBoardMessage =
    | MessageBoardMessageBase
    | MessageBoardMessageStartedPlayerPhase
    | MessageBoardMessagePlayerCanControlDifferentSquaddie
    | MessageBoardMessageSquaddieIsInjured
    | MessageBoardMessageSquaddieIsDefeated
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

export const MessageBoardMessageType = {
    BASE: Symbol.for("MessageBoardMessageType.BASE"),
    STARTED_PLAYER_PHASE: Symbol.for(
        "MessageBoardMessageType.STARTED_PLAYER_PHASE"
    ),
    PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE: Symbol.for(
        "MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE"
    ),
    SQUADDIE_IS_INJURED: Symbol.for(
        "MessageBoardMessageType.SQUADDIE_IS_INJURED"
    ),
    SQUADDIE_IS_DEFEATED: Symbol.for(
        "MessageBoardMessageType.SQUADDIE_IS_DEFEATED"
    ),
    PLAYER_SELECTION_IS_INVALID: Symbol.for(
        "MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID"
    ),
    PLAYER_CANCELS_TARGET_SELECTION: Symbol.for(
        "MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION"
    ),
    PLAYER_CANCELS_TARGET_CONFIRMATION: Symbol.for(
        "MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION"
    ),
    PLAYER_ENDS_TURN: Symbol.for("MessageBoardMessageType.PLAYER_ENDS_TURN"),
    PLAYER_SELECTS_AND_LOCKS_SQUADDIE: Symbol.for(
        "MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE"
    ),
    PLAYER_PEEKS_AT_SQUADDIE: Symbol.for(
        "MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE"
    ),
    BATTLE_ACTION_FINISHES_ANIMATION: Symbol.for(
        "MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION"
    ),
    PLAYER_CONSIDERS_ACTION: Symbol.for(
        "MessageBoardMessageType.PLAYER_CONSIDERS_ACTION"
    ),
    PLAYER_CONSIDERS_MOVEMENT: Symbol.for(
        "MessageBoardMessageType.PLAYER_CONSIDERS_MOVEMENT"
    ),
    PLAYER_SELECTS_ACTION_TEMPLATE: Symbol.for(
        "MessageBoardMessageType.PLAYER_SELECTS_ACTION_TEMPLATE"
    ),
    PLAYER_SELECTS_TARGET_COORDINATE: Symbol.for(
        "MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE"
    ),
    PLAYER_CONFIRMS_ACTION: Symbol.for(
        "MessageBoardMessageType.PLAYER_CONFIRMS_ACTION"
    ),
    SQUADDIE_PHASE_STARTS: Symbol.for(
        "MessageBoardMessageType.SQUADDIE_PHASE_STARTS"
    ),
    SQUADDIE_PHASE_ENDS: Symbol.for(
        "MessageBoardMessageType.SQUADDIE_PHASE_ENDS"
    ),
    SELECT_AND_LOCK_NEXT_SQUADDIE: Symbol.for(
        "MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE"
    ),
    MOVE_SQUADDIE_TO_COORDINATE: Symbol.for(
        "MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE"
    ),
    PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS: Symbol.for(
        "MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS"
    ),
    PLAYER_CONFIRMS_DECISION_STEP_ACTOR: Symbol.for(
        "MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR"
    ),
    PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION: Symbol.for(
        "MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION"
    ),
    SQUADDIE_TURN_ENDS: Symbol.for(
        "MessageBoardMessageType.SQUADDIE_TURN_ENDS"
    ),
    PLAYER_DATA_LOAD_USER_REQUEST: Symbol.for(
        "MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST"
    ),
    PLAYER_DATA_LOAD_COMPLETE: Symbol.for(
        "MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE"
    ),
    PLAYER_DATA_LOAD_BEGIN: Symbol.for(
        "MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN"
    ),
    PLAYER_DATA_LOAD_ERROR_DURING: Symbol.for(
        "MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING"
    ),
    PLAYER_DATA_LOAD_USER_CANCEL: Symbol.for(
        "MessageBoardMessageType.PLAYER_DATA_LOAD_USER_CANCEL"
    ),
    PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD: Symbol.for(
        "MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD"
    ),
    LOAD_BLOCKER_BEGINS_LOADING_RESOURCES: Symbol.for(
        "MessageBoardMessageType.LOAD_BLOCKER_BEGINS_LOADING_RESOURCES"
    ),
    LOAD_BLOCKER_FINISHES_LOADING_RESOURCES: Symbol.for(
        "MessageBoardMessageType.LOAD_BLOCKER_FINISHES_LOADING_RESOURCES"
    ),
} as const
export type TMessageBoardMessageType = EnumLike<typeof MessageBoardMessageType>

export interface MessageBoardMessageBase {
    type: typeof MessageBoardMessageType.BASE
    message: string
}

export interface MessageBoardMessageStartedPlayerPhase {
    type: typeof MessageBoardMessageType.STARTED_PLAYER_PHASE
    gameEngineState: GameEngineState
}
const isMessageBoardMessageStartedPlayerPhase = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessageStartedPlayerPhase => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.STARTED_PLAYER_PHASE
    )
}

export interface MessageBoardMessagePlayerCanControlDifferentSquaddie {
    type: typeof MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE
    gameEngineState: GameEngineState
}
const isMessageBoardMessagePlayerCanControlDifferentSquaddie = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerCanControlDifferentSquaddie => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_CAN_CONTROL_DIFFERENT_SQUADDIE
    )
}

export interface MessageBoardMessageSquaddieIsInjured {
    type: typeof MessageBoardMessageType.SQUADDIE_IS_INJURED
    gameEngineState: GameEngineState
    objectRepository: ObjectRepository
    battleSquaddieIds: string[]
}

export interface MessageBoardMessageSquaddieIsDefeated {
    type: typeof MessageBoardMessageType.SQUADDIE_IS_DEFEATED
    gameEngineState: GameEngineState
    objectRepository: ObjectRepository
    battleSquaddieIds: string[]
}

export interface MessageBoardMessagePlayerSelectionIsInvalid {
    type: typeof MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID
    gameEngineState: GameEngineState
    popupWindow: PopupWindow
}
const isMessageBoardMessagePlayerSelectionIsInvalid = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerSelectionIsInvalid => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID
    )
}

export interface MessageBoardMessagePlayerCancelsTargetSelection {
    type: typeof MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION
    summaryHUDState: SummaryHUDState
    battleActionDecisionStep: BattleActionDecisionStep
    missionMap: MissionMap
    objectRepository: ObjectRepository
    campaignResources: CampaignResources
    squaddieAllMovementCache: SearchResultsCache
}
const isMessageBoardMessagePlayerCancelsTargetSelection = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerCancelsTargetSelection => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION
    )
}

export interface MessageBoardMessagePlayerCancelsTargetConfirmation {
    type: typeof MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION
    missionMap: MissionMap
    objectRepository: ObjectRepository
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
}
const isMessageBoardMessagePlayerCancelsTargetConfirmation = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerCancelsTargetConfirmation => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION
    )
}

export interface MessageBoardMessagePlayerEndsTurn {
    type: typeof MessageBoardMessageType.PLAYER_ENDS_TURN
    gameEngineState: GameEngineState
    battleAction: BattleAction
}
const isMessageBoardMessagePlayerEndsTurn = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerEndsTurn => {
    return messageBoardMessage.type === MessageBoardMessageType.PLAYER_ENDS_TURN
}

export type SquaddieSelectionMethod = {
    mouse?: MousePress | ScreenLocation
    mapCoordinate?: HexCoordinate
}

export interface MessageBoardMessagePlayerSelectsAndLocksSquaddie {
    type: typeof MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
    gameEngineState: GameEngineState
    battleSquaddieSelectedId: string
}
const isMessageBoardMessagePlayerSelectsAndLocksSquaddie = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerSelectsAndLocksSquaddie => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
    )
}

export interface MessageBoardMessagePlayerPeeksAtSquaddie {
    type: typeof MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE
    battleSquaddieSelectedId: string
    selectionMethod: SquaddieSelectionMethod
    summaryHUDState: SummaryHUDState
    missionMap: MissionMap
    objectRepository: ObjectRepository
    campaignResources: CampaignResources
    squaddieAllMovementCache: SearchResultsCache
}
const isMessageBoardMessagePlayerPeeksAtSquaddie = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerPeeksAtSquaddie => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE
    )
}

export interface MessageBoardBattleActionFinishesAnimation {
    type: typeof MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION
    gameEngineState: GameEngineState
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}

export interface MessageBoardMessagePlayerSelectsActionTemplate {
    type: typeof MessageBoardMessageType.PLAYER_SELECTS_ACTION_TEMPLATE
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
const isMessageBoardMessagePlayerSelectsActionTemplate = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerSelectsActionTemplate => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_SELECTS_ACTION_TEMPLATE
    )
}

export interface MessageBoardMessagePlayerSelectsTargetCoordinate {
    type: typeof MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE
    numberGenerator: NumberGeneratorStrategy
    missionMap: MissionMap
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
    summaryHUDState: SummaryHUDState
    objectRepository: ObjectRepository
    targetCoordinate: HexCoordinate
}
const isMessageBoardMessagePlayerSelectsTargetCoordinate = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerSelectsTargetCoordinate => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE
    )
}

export interface MessageBoardMessagePlayerConfirmsAction {
    type: typeof MessageBoardMessageType.PLAYER_CONFIRMS_ACTION
    objectRepository: ObjectRepository
    missionMap: MissionMap
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
    numberGenerator: NumberGeneratorStrategy
    missionStatistics: MissionStatistics
    challengeModifierSetting: ChallengeModifierSetting
}
const isMessageBoardMessagePlayerConfirmsAction = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerConfirmsAction => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_CONFIRMS_ACTION
    )
}

export interface MessageBoardMessageSquaddiePhaseStarts {
    type: typeof MessageBoardMessageType.SQUADDIE_PHASE_STARTS
    phase: TBattlePhase
    gameEngineState: GameEngineState
}
const isMessageBoardMessageSquaddiePhaseStarts = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessageSquaddiePhaseStarts => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.SQUADDIE_PHASE_STARTS
    )
}

export interface MessageBoardMessageSquaddiePhaseEnds {
    type: typeof MessageBoardMessageType.SQUADDIE_PHASE_ENDS
    phase: TBattlePhase
    gameEngineState: GameEngineState
}
const isMessageBoardMessageSquaddiePhaseEnds = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessageSquaddiePhaseEnds => {
    return (
        messageBoardMessage.type === MessageBoardMessageType.SQUADDIE_PHASE_ENDS
    )
}

export interface MessageBoardMessageSelectAndLockNextSquaddie {
    type: typeof MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE
    gameEngineState: GameEngineState
}
const isMessageBoardMessageSelectAndLockNextSquaddie = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessageSelectAndLockNextSquaddie => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE
    )
}

export interface MessageBoardMessageMoveSquaddieToCoordinate {
    type: typeof MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE
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
const isMessageBoardMessageMoveSquaddieToCoordinate = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessageMoveSquaddieToCoordinate => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE
    )
}

export interface MessageBoardMessagePlayerCancelsPlayerActionConsiderations {
    type: typeof MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS
    missionMap: MissionMap
    summaryHUDState: SummaryHUDState
    playerCommandState: PlayerCommandState
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
    playerConsideredActions: PlayerConsideredActions
    playerDecisionHUD: PlayerDecisionHUD
    objectRepository: ObjectRepository
}
const isMessageBoardMessagePlayerCancelsPlayerActionConsiderations = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerCancelsPlayerActionConsiderations => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS
    )
}

export interface MessageBoardMessagePlayerConfirmsDecisionStepActor {
    type: typeof MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
    recommendedMode: TBattleOrchestratorMode
}

export interface MessageBoardMessagePlayerControlledSquaddieNeedsNextAction {
    type: typeof MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION
    objectRepository: ObjectRepository
    battleSquaddieId: string
    missionMap: MissionMap
    playerCommandState: PlayerCommandState
    campaignResources: CampaignResources
    squaddieAllMovementCache: SearchResultsCache
}
const isMessageBoardMessagePlayerControlledSquaddieNeedsNextAction = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerControlledSquaddieNeedsNextAction => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_CONTROLLED_SQUADDIE_NEEDS_NEXT_ACTION
    )
}

export interface MessageBoardMessageSquaddieTurnEnds {
    type: typeof MessageBoardMessageType.SQUADDIE_TURN_ENDS
    gameEngineState: GameEngineState
}

export interface MessageBoardMessagePlayerDataLoadUserRequest {
    type: typeof MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
    loadSaveState: LoadSaveState
}
const isMessageBoardMessagePlayerDataLoadUserRequest = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerDataLoadUserRequest => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST
    )
}

export interface MessageBoardMessagePlayerDataLoadBegin {
    type: typeof MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN
    loadSaveState: LoadSaveState
}
const isMessageBoardMessagePlayerDataLoadBegin = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerDataLoadBegin => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_DATA_LOAD_BEGIN
    )
}

export interface MessageBoardMessagePlayerDataLoadComplete {
    type: typeof MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE
    loadSaveState: LoadSaveState
    saveState: BattleSaveState
}
const isMessageBoardMessagePlayerDataLoadComplete = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerDataLoadComplete => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_DATA_LOAD_COMPLETE
    )
}

export interface MessageBoardMessagePlayerDataLoadErrorDuring {
    type: typeof MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING
    loadSaveState: LoadSaveState
}
const isMessageBoardMessagePlayerDataLoadErrorDuring = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerDataLoadErrorDuring => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_DATA_LOAD_ERROR_DURING
    )
}

export interface MessageBoardMessagePlayerDataLoadUserCancel {
    type: typeof MessageBoardMessageType.PLAYER_DATA_LOAD_USER_CANCEL
    loadSaveState: LoadSaveState
}
const isMessageBoardMessagePlayerDataLoadUserCancel = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerDataLoadUserCancel => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_DATA_LOAD_USER_CANCEL
    )
}

export interface MessageBoardMessagePlayerDataLoadFinishRequest {
    type: typeof MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD
    loadSaveState: LoadSaveState
}
const isMessageBoardMessagePlayerDataLoadFinishRequest = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerDataLoadFinishRequest => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD
    )
}

export interface MessageBoardMessagePlayerConsidersAction {
    type: typeof MessageBoardMessageType.PLAYER_CONSIDERS_ACTION
    playerConsideredActions: PlayerConsideredActions
    summaryHUDState: SummaryHUDState
    playerDecisionHUD: PlayerDecisionHUD
    missionMap: MissionMap
    battleActionDecisionStep: BattleActionDecisionStep
    objectRepository: ObjectRepository
    glossary: Glossary
    useAction: {
        actionTemplateId: string | undefined
        isEndTurn: boolean | undefined
    }
}
const isMessageBoardMessagePlayerConsidersAction = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerConsidersAction => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_CONSIDERS_ACTION
    )
}

export interface MessageBoardMessagePlayerConsidersMovement {
    type: typeof MessageBoardMessageType.PLAYER_CONSIDERS_MOVEMENT
    playerConsideredActions: PlayerConsideredActions
    summaryHUDState: SummaryHUDState
    playerDecisionHUD: PlayerDecisionHUD
    missionMap: MissionMap
    battleActionDecisionStep: BattleActionDecisionStep
    objectRepository: ObjectRepository
    movementDecision: MovementDecision
}
const isMessageBoardMessagePlayerConsidersMovement = (
    messageBoardMessage: MessageBoardMessage
): messageBoardMessage is MessageBoardMessagePlayerConsidersMovement => {
    return (
        messageBoardMessage.type ===
        MessageBoardMessageType.PLAYER_CONSIDERS_MOVEMENT
    )
}

export interface MessageBoardMessageTypeLoadBlockerBeginsLoadingResources {
    type: typeof MessageBoardMessageType.LOAD_BLOCKER_BEGINS_LOADING_RESOURCES
}

export interface MessageBoardMessageTypeLoadBlockerFinishesLoadingResources {
    type: typeof MessageBoardMessageType.LOAD_BLOCKER_FINISHES_LOADING_RESOURCES
}

export const MessageBoardMessageService = {
    isMessageBoardMessageStartedPlayerPhase: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessageStartedPlayerPhase => {
        return isMessageBoardMessageStartedPlayerPhase(messageBoardMessage)
    },
    isMessageBoardMessagePlayerCanControlDifferentSquaddie: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerCanControlDifferentSquaddie => {
        return isMessageBoardMessagePlayerCanControlDifferentSquaddie(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerSelectionIsInvalid: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerSelectionIsInvalid => {
        return isMessageBoardMessagePlayerSelectionIsInvalid(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerCancelsTargetSelection: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerCancelsTargetSelection => {
        return isMessageBoardMessagePlayerCancelsTargetSelection(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerCancelsTargetConfirmation: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerCancelsTargetConfirmation => {
        return isMessageBoardMessagePlayerCancelsTargetConfirmation(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerEndsTurn: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerEndsTurn => {
        return isMessageBoardMessagePlayerEndsTurn(messageBoardMessage)
    },
    isMessageBoardMessagePlayerSelectsAndLocksSquaddie: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerSelectsAndLocksSquaddie => {
        return isMessageBoardMessagePlayerSelectsAndLocksSquaddie(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerPeeksAtSquaddie: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerPeeksAtSquaddie => {
        return isMessageBoardMessagePlayerPeeksAtSquaddie(messageBoardMessage)
    },
    isMessageBoardMessagePlayerConsidersAction: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerConsidersAction => {
        return isMessageBoardMessagePlayerConsidersAction(messageBoardMessage)
    },
    isMessageBoardMessagePlayerConsidersMovement: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerConsidersMovement => {
        return isMessageBoardMessagePlayerConsidersMovement(messageBoardMessage)
    },
    isMessageBoardMessagePlayerSelectsActionTemplate: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerSelectsActionTemplate => {
        return isMessageBoardMessagePlayerSelectsActionTemplate(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerSelectsTargetCoordinate: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerSelectsTargetCoordinate => {
        return isMessageBoardMessagePlayerSelectsTargetCoordinate(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerConfirmsAction: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerConfirmsAction => {
        return isMessageBoardMessagePlayerConfirmsAction(messageBoardMessage)
    },
    isMessageBoardMessageSquaddiePhaseStarts: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessageSquaddiePhaseStarts => {
        return isMessageBoardMessageSquaddiePhaseStarts(messageBoardMessage)
    },
    isMessageBoardMessageSquaddiePhaseEnds: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessageSquaddiePhaseEnds => {
        return isMessageBoardMessageSquaddiePhaseEnds(messageBoardMessage)
    },
    isMessageBoardMessageSelectAndLockNextSquaddie: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessageSelectAndLockNextSquaddie => {
        return isMessageBoardMessageSelectAndLockNextSquaddie(
            messageBoardMessage
        )
    },
    isMessageBoardMessageMoveSquaddieToCoordinate: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessageMoveSquaddieToCoordinate => {
        return isMessageBoardMessageMoveSquaddieToCoordinate(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerCancelsPlayerActionConsiderations: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerCancelsPlayerActionConsiderations => {
        return isMessageBoardMessagePlayerCancelsPlayerActionConsiderations(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerControlledSquaddieNeedsNextAction: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerControlledSquaddieNeedsNextAction => {
        return isMessageBoardMessagePlayerControlledSquaddieNeedsNextAction(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerDataLoadUserRequest: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerDataLoadUserRequest => {
        return isMessageBoardMessagePlayerDataLoadUserRequest(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerDataLoadBegin: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerDataLoadBegin => {
        return isMessageBoardMessagePlayerDataLoadBegin(messageBoardMessage)
    },
    isMessageBoardMessagePlayerDataLoadComplete: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerDataLoadComplete => {
        return isMessageBoardMessagePlayerDataLoadComplete(messageBoardMessage)
    },
    isMessageBoardMessagePlayerDataLoadErrorDuring: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerDataLoadErrorDuring => {
        return isMessageBoardMessagePlayerDataLoadErrorDuring(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerDataLoadUserCancel: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerDataLoadUserCancel => {
        return isMessageBoardMessagePlayerDataLoadUserCancel(
            messageBoardMessage
        )
    },
    isMessageBoardMessagePlayerDataLoadFinishRequest: (
        messageBoardMessage: MessageBoardMessage
    ): messageBoardMessage is MessageBoardMessagePlayerDataLoadFinishRequest => {
        return isMessageBoardMessagePlayerDataLoadFinishRequest(
            messageBoardMessage
        )
    },
}
