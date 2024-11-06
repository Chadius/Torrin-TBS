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
import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { CutsceneQueueService } from "./cutsceneIdQueue"
import { BattleActionSquaddieChange } from "../history/battleAction/battleActionSquaddieChange"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"

export const MissionCutsceneService = {
    FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat: (
        gameEngineState: GameEngineState,
        battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
    ): CutsceneTrigger[] => {
        return findCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
            gameEngineState,
            battleOrchestratorModeThatJustCompleted
        )
    },
    FindCutsceneTriggersToActivateOnStartOfPhase: ({
        gameEngineState,
        battleOrchestratorModeThatJustCompleted,
        ignoreTurn0Triggers,
    }: {
        gameEngineState: GameEngineState
        battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
        ignoreTurn0Triggers?: boolean
    }): CutsceneTrigger[] => {
        return findCutsceneTriggersToActivateOnStartOfPhase({
            gameEngineState,
            battleOrchestratorModeThatJustCompleted,
            ignoreTurn0Triggers,
        })
    },
    FindCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction: ({
        gameEngineState,
        squaddieChanges,
    }: {
        gameEngineState: GameEngineState
        squaddieChanges: BattleActionSquaddieChange[]
    }): CutsceneTrigger[] => {
        const triggerIsInjury = (trigger: SquaddieIsInjuredTrigger): boolean =>
            trigger.triggeringEvent === TriggeringEvent.SQUADDIE_IS_INJURED

        const injuryTriggers =
            gameEngineState.battleOrchestratorState.battleState.cutsceneTriggers
                .filter(triggerIsInjury)
                .map((trigger) => trigger as SquaddieIsInjuredTrigger)

        const injuredBattleSquaddieIds = squaddieChanges
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

const getMissionObjectivesByRewardType = (
    completedObjectives: MissionObjective[],
    rewardType: MissionRewardType
) =>
    completedObjectives.find(
        (objective: MissionObjective) =>
            objective.reward.rewardType === rewardType
    )

const findMissionObjectiveCutscenes = ({
    defeatObjective,
    battleOrchestratorState,
    victoryObjective,
}: {
    defeatObjective: MissionObjective
    battleOrchestratorState: BattleOrchestratorState
    victoryObjective: MissionObjective
}) => {
    let cutsceneId: string = ""
    let cutsceneTrigger: CutsceneTrigger = undefined
    if (defeatObjective) {
        cutsceneTrigger =
            battleOrchestratorState.battleState.cutsceneTriggers.find(
                (trigger) =>
                    trigger.triggeringEvent === TriggeringEvent.MISSION_DEFEAT
            )
        cutsceneId = getCutsceneIdIfTriggerIsValid(cutsceneTrigger)
    } else if (victoryObjective) {
        cutsceneTrigger =
            battleOrchestratorState.battleState.cutsceneTriggers.find(
                (trigger) =>
                    trigger.triggeringEvent === TriggeringEvent.MISSION_VICTORY
            )
        cutsceneId = getCutsceneIdIfTriggerIsValid(cutsceneTrigger)
    }
    return { cutsceneId, cutsceneTrigger }
}

const addStartOfTurnTriggers = (
    turnObjectives: CutsceneTrigger[],
    state: BattleOrchestratorState,
    cutsceneTriggersToReactTo: CutsceneTrigger[]
) => {
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

const findCutsceneTriggersToActivateBasedOnVictoryAndDefeat = (
    gameEngineState: GameEngineState,
    battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
): CutsceneTrigger[] => {
    const squaddieActionCompleteModes = [
        BattleOrchestratorMode.SQUADDIE_MOVER,
        BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
        BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
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
            gameEngineState.battleOrchestratorState.battleState.objectives.filter(
                (objective: MissionObjective) =>
                    MissionObjectiveHelper.shouldBeComplete(
                        objective,
                        gameEngineState
                    ) && !objective.hasGivenReward
            )

        const victoryObjective = getMissionObjectivesByRewardType(
            completedObjectives,
            MissionRewardType.VICTORY
        )
        const defeatObjective = getMissionObjectivesByRewardType(
            completedObjectives,
            MissionRewardType.DEFEAT
        )

        ;({ cutsceneId, cutsceneTrigger } = findMissionObjectiveCutscenes({
            defeatObjective,
            battleOrchestratorState: gameEngineState.battleOrchestratorState,
            victoryObjective,
        }))
    }

    if (cutsceneId !== "" && cutsceneTrigger) {
        cutsceneTriggersToReactTo.push(cutsceneTrigger)
    }

    return cutsceneTriggersToReactTo
}

const findCutsceneTriggersToActivateOnStartOfPhase = ({
    gameEngineState,
    battleOrchestratorModeThatJustCompleted,
    ignoreTurn0Triggers,
}: {
    gameEngineState: GameEngineState
    battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
    ignoreTurn0Triggers?: boolean
}): CutsceneTrigger[] => {
    const startOfPhaseModes = [
        BattleOrchestratorMode.INITIALIZED,
        BattleOrchestratorMode.PHASE_CONTROLLER,
    ]

    let cutsceneTriggersToReactTo: CutsceneTrigger[] = []

    if (startOfPhaseModes.includes(battleOrchestratorModeThatJustCompleted)) {
        const turnObjectives =
            gameEngineState.battleOrchestratorState.battleState.cutsceneTriggers.filter(
                (trigger) =>
                    trigger.triggeringEvent === TriggeringEvent.START_OF_TURN
            )
        addStartOfTurnTriggers(
            turnObjectives,
            gameEngineState.battleOrchestratorState,
            cutsceneTriggersToReactTo
        )
    }

    if (ignoreTurn0Triggers) {
        cutsceneTriggersToReactTo = cutsceneTriggersToReactTo.filter(
            (cutsceneTrigger) =>
                cutsceneTrigger.triggeringEvent !==
                    TriggeringEvent.START_OF_TURN || cutsceneTrigger.turn !== 0
        )
    }

    return cutsceneTriggersToReactTo
}

const isTriggerReadyToReact = (cutsceneTrigger: CutsceneTrigger) => {
    if (cutsceneTrigger === undefined) {
        return false
    }

    return cutsceneTrigger.systemReactedToTrigger === false
}

const getCutsceneIdIfTriggerIsValid = (cutsceneTrigger: CutsceneTrigger) => {
    if (!isTriggerReadyToReact(cutsceneTrigger)) {
        return ""
    }

    return cutsceneTrigger.cutsceneId
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

        let squaddieChanges = BattleActionRecorderService.peekAtAnimationQueue(
            message.gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        ).effect.squaddie

        if (!squaddieChanges || squaddieChanges.length === 0) return

        const cutsceneTriggers =
            MissionCutsceneService.FindCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
                {
                    gameEngineState: message.gameEngineState,
                    squaddieChanges,
                }
            )

        CutsceneQueueService.addList(
            message.gameEngineState.battleOrchestratorState.cutsceneQueue,
            [...cutsceneTriggers.map((trigger) => trigger.cutsceneId)]
        )
    }
}
