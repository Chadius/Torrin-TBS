import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import {
    CutsceneTrigger,
    SquaddieIsInjuredTrigger,
    TriggeringEvent,
} from "../../cutscene/cutsceneTrigger"
import {
    MissionObjective,
    MissionObjectiveHelper,
} from "../missionResult/missionObjective"
import { MissionRewardType } from "../missionResult/missionReward"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { SquaddieSquaddieResults } from "../history/squaddieSquaddieResults"
import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ProcessedActionEffect } from "../../action/processed/processedActionEffect"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"

function getMissionObjectivesByRewardType(
    completedObjectives: MissionObjective[],
    rewardType: MissionRewardType
) {
    return completedObjectives.find(
        (objective: MissionObjective) =>
            objective.reward.rewardType === rewardType
    )
}

function findMissionObjectiveCutscenes(
    defeatObjective: MissionObjective,
    state: BattleOrchestratorState,
    victoryObjective: MissionObjective
) {
    let cutsceneId: string = ""
    let cutsceneTrigger: CutsceneTrigger = undefined
    if (defeatObjective) {
        cutsceneTrigger = state.battleState.cutsceneTriggers.find(
            (trigger) =>
                trigger.triggeringEvent === TriggeringEvent.MISSION_DEFEAT
        )
        cutsceneId = getCutsceneIdIfTriggerIsValid(cutsceneTrigger)
    } else if (victoryObjective) {
        cutsceneTrigger = state.battleState.cutsceneTriggers.find(
            (trigger) =>
                trigger.triggeringEvent === TriggeringEvent.MISSION_VICTORY
        )
        cutsceneId = getCutsceneIdIfTriggerIsValid(cutsceneTrigger)
    }
    return { cutsceneId, cutsceneTrigger }
}

function addStartOfTurnTriggers(
    turnObjectives: CutsceneTrigger[],
    state: BattleOrchestratorState,
    cutsceneTriggersToReactTo: CutsceneTrigger[]
) {
    const turnTriggersToReactTo = turnObjectives.filter((trigger) => {
        if (trigger.triggeringEvent !== TriggeringEvent.START_OF_TURN) {
            return false
        }
        if (state.battleState.battlePhaseState.turnCount !== trigger.turn) {
            return false
        }
        return isTriggerReadyToReact(trigger)
    })
    cutsceneTriggersToReactTo.push(...turnTriggersToReactTo)
}

export const FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat = (
    state: GameEngineState,
    battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
): CutsceneTrigger[] => {
    const squaddieActionCompleteModes = [
        BattleOrchestratorMode.SQUADDIE_MOVER,
        BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
        BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
    ]

    const startOfPhaseModes = [
        BattleOrchestratorMode.INITIALIZED,
        BattleOrchestratorMode.PHASE_CONTROLLER,
    ]

    const cutsceneTriggersToReactTo: CutsceneTrigger[] = []

    let cutsceneId: string = ""
    let cutsceneTrigger: CutsceneTrigger = undefined

    if (
        squaddieActionCompleteModes.includes(
            battleOrchestratorModeThatJustCompleted
        )
    ) {
        const completedObjectives =
            state.battleOrchestratorState.battleState.objectives.filter(
                (objective: MissionObjective) =>
                    MissionObjectiveHelper.shouldBeComplete(objective, state) &&
                    !objective.hasGivenReward
            )

        const victoryObjective = getMissionObjectivesByRewardType(
            completedObjectives,
            MissionRewardType.VICTORY
        )
        const defeatObjective = getMissionObjectivesByRewardType(
            completedObjectives,
            MissionRewardType.DEFEAT
        )

        ;({ cutsceneId, cutsceneTrigger } = findMissionObjectiveCutscenes(
            defeatObjective,
            state.battleOrchestratorState,
            victoryObjective
        ))
    }

    if (cutsceneId !== "" && cutsceneTrigger) {
        cutsceneTriggersToReactTo.push(cutsceneTrigger)
        return cutsceneTriggersToReactTo
    }

    if (startOfPhaseModes.includes(battleOrchestratorModeThatJustCompleted)) {
        const turnObjectives =
            state.battleOrchestratorState.battleState.cutsceneTriggers.filter(
                (trigger) =>
                    trigger.triggeringEvent === TriggeringEvent.START_OF_TURN
            )
        addStartOfTurnTriggers(
            turnObjectives,
            state.battleOrchestratorState,
            cutsceneTriggersToReactTo
        )
    }

    return cutsceneTriggersToReactTo
}

function isTriggerReadyToReact(cutsceneTrigger: CutsceneTrigger) {
    if (cutsceneTrigger === undefined) {
        return false
    }

    return cutsceneTrigger.systemReactedToTrigger === false
}

function getCutsceneIdIfTriggerIsValid(cutsceneTrigger: CutsceneTrigger) {
    if (!isTriggerReadyToReact(cutsceneTrigger)) {
        return ""
    }

    return cutsceneTrigger.cutsceneId
}

export const MissionCutsceneService = {
    FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat: (
        state: GameEngineState,
        battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
    ): CutsceneTrigger[] => {
        return FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
            state,
            battleOrchestratorModeThatJustCompleted
        )
    },
    FindCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction: ({
        gameEngineState,
        squaddieSquaddieResult,
    }: {
        gameEngineState: GameEngineState
        squaddieSquaddieResult: SquaddieSquaddieResults
    }): CutsceneTrigger[] => {
        const triggerIsInjury = (trigger: SquaddieIsInjuredTrigger): boolean =>
            trigger.triggeringEvent === TriggeringEvent.SQUADDIE_IS_INJURED

        const injuryTriggers =
            gameEngineState.battleOrchestratorState.battleState.cutsceneTriggers
                .filter(triggerIsInjury)
                .map((trigger) => trigger as SquaddieIsInjuredTrigger)

        const injuredBattleSquaddieIds = squaddieSquaddieResult.squaddieChanges
            .filter((change) => change.damage.net > 0)
            .map((change) => change.battleSquaddieId)

        const triggerHasBattleSquaddieId = (
            trigger: SquaddieIsInjuredTrigger
        ): boolean =>
            trigger.battleSquaddieIdsToCheckForInjury.some((id) =>
                injuredBattleSquaddieIds.includes(id)
            )

        const triggerIsAfterMinimumTurns = (
            trigger: SquaddieIsInjuredTrigger
        ): boolean =>
            trigger.minimumTurns === undefined ||
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .turnCount >= trigger.minimumTurns

        const triggerIsBeforeMaximumTurns = (
            trigger: SquaddieIsInjuredTrigger
        ): boolean =>
            trigger.maximumTurns === undefined ||
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .turnCount <= trigger.maximumTurns

        return injuryTriggers
            .filter(triggerIsBeforeMaximumTurns)
            .filter(triggerIsAfterMinimumTurns)
            .filter(triggerHasBattleSquaddieId)
    },
}

export class CutsceneMessageListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        if (message.type !== MessageBoardMessageType.SQUADDIE_IS_INJURED) {
            return
        }
        let result: SquaddieSquaddieResults
        const actionEffectToShow: ProcessedActionEffect =
            ActionsThisRoundService.getProcessedActionEffectToShow(
                message.gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            )
        if (actionEffectToShow.type === ActionEffectType.SQUADDIE) {
            result = actionEffectToShow.results
        }

        const cutsceneTriggers =
            MissionCutsceneService.FindCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
                {
                    gameEngineState: message.gameEngineState,
                    squaddieSquaddieResult: result,
                }
            )

        message.gameEngineState.battleOrchestratorState.cutsceneIdsToPlay =
            message.gameEngineState.battleOrchestratorState.cutsceneIdsToPlay.concat(
                ...cutsceneTriggers.map((trigger) => trigger.cutsceneId)
            )
    }
}
