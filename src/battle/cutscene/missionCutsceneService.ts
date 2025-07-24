import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { BattleEvent, BattleEventService } from "../event/battleEvent"
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
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import { TriggeringEventType } from "../eventTrigger/triggeringEventType"

import { EventTriggerTurnRange } from "../eventTrigger/eventTriggerTurnRange"
import { EventTriggerSquaddie } from "../eventTrigger/eventTriggerSquaddie"
import { BattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"
import { BattleEventEffectType } from "../event/battleEventEffect"
import { CutsceneEffect } from "../../cutscene/cutsceneEffect"

export const MissionCutsceneService = {
    findBattleEventsToActivateBasedOnVictoryAndDefeat: (
        gameEngineState: GameEngineState,
        battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
    ): BattleEvent[] => {
        return findBattleEventsToActivateBasedOnVictoryAndDefeat(
            gameEngineState,
            battleOrchestratorModeThatJustCompleted
        )
    },
    findBattleEventsToActivateOnStartOfPhase: ({
        gameEngineState,
        battleOrchestratorModeThatJustCompleted,
        ignoreTurn0Triggers,
    }: {
        gameEngineState: GameEngineState
        battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
        ignoreTurn0Triggers?: boolean
    }): BattleEvent[] => {
        return findBattleEventsToActivateOnStartOfPhase({
            gameEngineState,
            battleOrchestratorModeThatJustCompleted,
            ignoreTurn0Triggers,
        })
    },
    findBattleEventsToActivateBasedOnSquaddieSquaddieAction: ({
        gameEngineState,
        squaddieChanges,
        objectRepository,
    }: {
        gameEngineState: GameEngineState
        squaddieChanges: BattleActionSquaddieChange[]
        objectRepository: ObjectRepository
    }): (BattleEvent & { effect: CutsceneEffect })[] => {
        return [
            ...getBattleEventsTriggeredBySquaddieChanges({
                gameEngineState,
                squaddieChanges,
                objectRepository,
                triggeringEventType: TriggeringEventType.SQUADDIE_IS_INJURED,
            }),
            ...getBattleEventsTriggeredBySquaddieChanges({
                gameEngineState,
                squaddieChanges,
                objectRepository,
                triggeringEventType: TriggeringEventType.SQUADDIE_IS_DEFEATED,
            }),
        ]
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

const findMissionObjectiveCutscene = ({
    defeatObjective,
    battleOrchestratorState,
    victoryObjective,
}: {
    defeatObjective: MissionObjective
    battleOrchestratorState: BattleOrchestratorState
    victoryObjective: MissionObjective
}) => {
    let cutsceneBattleEffects =
        battleOrchestratorState.battleState.battleEvents.filter(
            (battleEffect) =>
                battleEffect.effect.type === BattleEventEffectType.CUTSCENE
        )

    let battleCompletionStatus: BattleCompletionStatus = undefined
    switch (true) {
        case !!defeatObjective:
            battleCompletionStatus = BattleCompletionStatus.DEFEAT
            break
        case !!victoryObjective:
            battleCompletionStatus = BattleCompletionStatus.VICTORY
            break
        default:
            return undefined
    }

    return cutsceneBattleEffects.find(
        (battleEvent) =>
            BattleEventService.areTriggersSatisfied({
                battleEvent,
                context: {
                    battleCompletionStatus,
                },
            }) && battleEvent.effect.alreadyAppliedEffect === false
    )
}

const findBattleEventsToActivateBasedOnVictoryAndDefeat = (
    gameEngineState: GameEngineState,
    battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
): BattleEvent[] => {
    if (
        ![
            BattleOrchestratorMode.SQUADDIE_MOVER,
            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
        ].includes(battleOrchestratorModeThatJustCompleted)
    )
        return []

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

    const cutsceneBattleEffect = findMissionObjectiveCutscene({
        defeatObjective,
        battleOrchestratorState: gameEngineState.battleOrchestratorState,
        victoryObjective,
    })

    if (cutsceneBattleEffect) {
        return [cutsceneBattleEffect]
    }

    return []
}

const findBattleEventsToActivateOnStartOfPhase = ({
    gameEngineState,
    battleOrchestratorModeThatJustCompleted,
    ignoreTurn0Triggers,
}: {
    gameEngineState: GameEngineState
    battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
    ignoreTurn0Triggers?: boolean
}): BattleEvent[] => {
    if (
        ![
            BattleOrchestratorMode.INITIALIZED,
            BattleOrchestratorMode.PHASE_CONTROLLER,
        ].includes(battleOrchestratorModeThatJustCompleted)
    ) {
        return []
    }

    return gameEngineState.battleOrchestratorState.battleState.battleEvents
        .filter((battleEvent) =>
            BattleEventService.areTriggersSatisfied({
                battleEvent,
                context: {
                    turnCount:
                        gameEngineState.battleOrchestratorState.battleState
                            .battlePhaseState.turnCount,
                },
            })
        )
        .filter(
            (battleEvent) => battleEvent.effect.alreadyAppliedEffect === false
        )
        .filter((battleEvent) => {
            if (!ignoreTurn0Triggers) return true
            return battleEvent.triggers.some(
                (trigger) =>
                    trigger.triggeringEventType !=
                        TriggeringEventType.START_OF_TURN ||
                    (trigger as EventTriggerTurnRange).exactTurn != 0
            )
        })
}

export class CutsceneMessageListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        switch (message.type) {
            case MessageBoardMessageType.SQUADDIE_IS_INJURED:
            case MessageBoardMessageType.SQUADDIE_IS_DEFEATED:
                break
            default:
                return
        }

        let squaddieChanges = BattleActionRecorderService.peekAtAnimationQueue(
            message.gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        ).effect.squaddie

        if (!squaddieChanges || squaddieChanges.length === 0) return

        const cutsceneBattleEvents =
            MissionCutsceneService.findBattleEventsToActivateBasedOnSquaddieSquaddieAction(
                {
                    gameEngineState: message.gameEngineState,
                    squaddieChanges,
                    objectRepository: message.objectRepository,
                }
            )

        CutsceneQueueService.addList(
            message.gameEngineState.battleOrchestratorState.cutsceneQueue,
            [
                ...cutsceneBattleEvents.map(
                    (trigger) => trigger.effect.cutsceneId
                ),
            ]
        )
    }
}

const getBattleEventsTriggeredBySquaddieChanges = ({
    gameEngineState,
    squaddieChanges,
    objectRepository,
    triggeringEventType,
}: {
    gameEngineState: GameEngineState
    squaddieChanges: BattleActionSquaddieChange[]
    objectRepository: ObjectRepository
    triggeringEventType:
        | TriggeringEventType.SQUADDIE_IS_INJURED
        | TriggeringEventType.SQUADDIE_IS_DEFEATED
}): (BattleEvent & { effect: CutsceneEffect })[] => {
    const battleEvents =
        gameEngineState.battleOrchestratorState.battleState.battleEvents
            .filter((battleEvent) =>
                battleEvent.triggers.some(
                    (trigger) =>
                        trigger.triggeringEventType === triggeringEventType
                )
            )
            .filter(
                (battleEvent) =>
                    battleEvent.effect.alreadyAppliedEffect === false
            )

    const changedBattleSquaddieIds = squaddieChanges
        .filter((change) => {
            switch (triggeringEventType) {
                case TriggeringEventType.SQUADDIE_IS_INJURED:
                    return change.damage.net > 0
                case TriggeringEventType.SQUADDIE_IS_DEFEATED:
                    const { squaddieTemplate, battleSquaddie } =
                        getResultOrThrowError(
                            ObjectRepositoryService.getSquaddieByBattleId(
                                objectRepository,
                                change.battleSquaddieId
                            )
                        )

                    return (
                        change.damage.net > 0 &&
                        !SquaddieService.isSquaddieAlive({
                            squaddieTemplate,
                            battleSquaddie,
                        })
                    )
                default:
                    return false
            }
        })
        .map((change) => change.battleSquaddieId)

    const changedSquaddieTemplateIds =
        maybeGetSquaddieTemplateIdsFromEventTriggerSquaddie({
            eventTriggers: battleEvents
                .map((battleEvent) =>
                    battleEvent.triggers
                        .filter(
                            (trigger) =>
                                trigger.triggeringEventType ===
                                triggeringEventType
                        )
                        .map((trigger) => trigger as EventTriggerSquaddie)
                )
                .flat(1),
            objectRepository,
            battleSquaddieIds: changedBattleSquaddieIds,
            queryType: "targetingSquaddie",
        })

    const squaddies =
        triggeringEventType === TriggeringEventType.SQUADDIE_IS_INJURED
            ? {
                  injured: {
                      battleSquaddieIds: changedBattleSquaddieIds,
                      squaddieTemplateIds: changedSquaddieTemplateIds,
                  },
              }
            : {
                  defeated: {
                      battleSquaddieIds: changedBattleSquaddieIds,
                      squaddieTemplateIds: changedSquaddieTemplateIds,
                  },
              }

    return battleEvents.filter((battleEvent) =>
        BattleEventService.areTriggersSatisfied({
            battleEvent: battleEvent,
            context: {
                turnCount:
                    gameEngineState.battleOrchestratorState.battleState
                        ?.battlePhaseState?.turnCount,
                squaddies,
            },
        })
    )
}

const maybeGetSquaddieTemplateIdsFromEventTriggerSquaddie = ({
    eventTriggers,
    objectRepository,
    battleSquaddieIds,
    queryType,
}: {
    eventTriggers: EventTriggerSquaddie[]
    objectRepository: ObjectRepository
    battleSquaddieIds: string[]
    queryType: "targetingSquaddie"
}) => {
    const doesExistTriggerBySquaddieTemplate = eventTriggers.some(
        (trigger) => trigger[queryType].squaddieTemplateIds?.length > 0
    )
    return doesExistTriggerBySquaddieTemplate
        ? battleSquaddieIds.map((battleSquaddieId) => {
              const { squaddieTemplate } = getResultOrThrowError(
                  ObjectRepositoryService.getSquaddieByBattleId(
                      objectRepository,
                      battleSquaddieId
                  )
              )
              return squaddieTemplate.squaddieId.templateId
          })
        : []
}
