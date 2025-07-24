import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import {
    CutsceneTrigger,
    SquaddieIsDefeatedTrigger,
    SquaddieIsInjuredTrigger,
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
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import { TriggeringEventType } from "../eventTrigger/triggeringEventType"

import { EventTriggerTurnRangeService } from "../eventTrigger/eventTriggerTurnRange"
import {
    EventTriggerSquaddie,
    EventTriggerSquaddieService,
} from "../eventTrigger/eventTriggerSquaddie"

export const MissionCutsceneService = {
    findCutsceneTriggersToActivateBasedOnVictoryAndDefeat: (
        gameEngineState: GameEngineState,
        battleOrchestratorModeThatJustCompleted: BattleOrchestratorMode
    ): CutsceneTrigger[] => {
        return findCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
            gameEngineState,
            battleOrchestratorModeThatJustCompleted
        )
    },
    findCutsceneTriggersToActivateOnStartOfPhase: ({
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
    findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction: ({
        gameEngineState,
        squaddieChanges,
        objectRepository,
    }: {
        gameEngineState: GameEngineState
        squaddieChanges: BattleActionSquaddieChange[]
        objectRepository: ObjectRepository
    }): CutsceneTrigger[] => {
        return [
            ...getCutscenesTriggeredByInjury({
                gameEngineState: gameEngineState,
                squaddieChanges: squaddieChanges,
                objectRepository,
            }),
            ...getCutscenesTriggeredByDefeat({
                gameEngineState,
                allCutsceneTriggers:
                    gameEngineState.battleOrchestratorState.battleState
                        .cutsceneTriggers,
                squaddieChanges,
                objectRepository,
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
                    trigger.triggeringEventType ===
                    TriggeringEventType.MISSION_DEFEAT
            )
        cutsceneId = getCutsceneIdIfTriggerIsValid(cutsceneTrigger)
    } else if (victoryObjective) {
        cutsceneTrigger =
            battleOrchestratorState.battleState.cutsceneTriggers.find(
                (trigger) =>
                    trigger.triggeringEventType ===
                    TriggeringEventType.MISSION_VICTORY
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
        if (trigger.triggeringEventType !== TriggeringEventType.START_OF_TURN) {
            return false
        }
        if (
            !EventTriggerTurnRangeService.isOnExactTurn({
                trigger,
                turnCount: state.battleState.battlePhaseState.turnCount,
            })
        ) {
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
                    trigger.triggeringEventType ===
                    TriggeringEventType.START_OF_TURN
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
                cutsceneTrigger.triggeringEventType !==
                    TriggeringEventType.START_OF_TURN ||
                cutsceneTrigger.exactTurn !== 0
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

        const cutsceneTriggers =
            MissionCutsceneService.findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
                {
                    gameEngineState: message.gameEngineState,
                    squaddieChanges,
                    objectRepository: message.objectRepository,
                }
            )

        CutsceneQueueService.addList(
            message.gameEngineState.battleOrchestratorState.cutsceneQueue,
            [...cutsceneTriggers.map((trigger) => trigger.cutsceneId)]
        )
    }
}

const getCutscenesTriggeredByInjury = ({
    gameEngineState,
    squaddieChanges,
    objectRepository,
}: {
    gameEngineState: GameEngineState
    squaddieChanges: BattleActionSquaddieChange[]
    objectRepository: ObjectRepository
}) => {
    const triggerIsInjury = (trigger: SquaddieIsInjuredTrigger): boolean =>
        trigger.triggeringEventType === TriggeringEventType.SQUADDIE_IS_INJURED

    const injuryTriggers =
        gameEngineState.battleOrchestratorState.battleState.cutsceneTriggers
            .filter(triggerIsInjury)
            .map((trigger) => trigger as SquaddieIsInjuredTrigger)

    const injuredBattleSquaddieIds = squaddieChanges
        .filter((change) => change.damage.net > 0)
        .map((change) => change.battleSquaddieId)

    const injuredSquaddieTemplateIds =
        maybeGetSquaddieTemplateIdsFromEventTriggerSquaddie({
            eventTriggers: injuryTriggers,
            objectRepository,
            battleSquaddieIds: injuredBattleSquaddieIds,
            queryType: "targetingSquaddie",
        })

    return injuryTriggers
        .filter(
            (trigger) =>
                EventTriggerSquaddieService.targetingHasAtLeastOneBattleSquaddieId(
                    {
                        eventTrigger: trigger,
                        battleSquaddieIds: injuredBattleSquaddieIds,
                    }
                ) ||
                EventTriggerSquaddieService.targetingHasAtLeastOneSquaddieTemplateId(
                    {
                        eventTrigger: trigger,
                        squaddieTemplateIds: injuredSquaddieTemplateIds,
                    }
                )
        )
        .filter((trigger) =>
            EventTriggerTurnRangeService.isBeforeMaximumTurnsPassed({
                trigger,
                turnCount:
                    gameEngineState.battleOrchestratorState.battleState
                        .battlePhaseState?.turnCount,
            })
        )
        .filter((trigger) =>
            EventTriggerTurnRangeService.isAfterMinimumTurnsPassed({
                trigger,
                turnCount:
                    gameEngineState.battleOrchestratorState.battleState
                        .battlePhaseState?.turnCount,
            })
        )
}

const getCutscenesTriggeredByDefeat = ({
    gameEngineState,
    allCutsceneTriggers,
    squaddieChanges,
    objectRepository,
}: {
    gameEngineState: GameEngineState
    allCutsceneTriggers: CutsceneTrigger[]
    squaddieChanges: BattleActionSquaddieChange[]
    objectRepository: ObjectRepository
}) => {
    const defeatTriggers = allCutsceneTriggers
        .filter(
            (trigger) =>
                trigger.triggeringEventType ===
                TriggeringEventType.SQUADDIE_IS_DEFEATED
        )
        .map((trigger) => trigger as SquaddieIsDefeatedTrigger)

    const defeatedBattleSquaddieIds = squaddieChanges
        .filter((change) => change.damage.net > 0)
        .filter((change) => {
            const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    change.battleSquaddieId
                )
            )

            return !SquaddieService.isSquaddieAlive({
                squaddieTemplate,
                battleSquaddie,
            })
        })
        .map((change) => change.battleSquaddieId)

    const defeatedSquaddieTemplateIds =
        maybeGetSquaddieTemplateIdsFromEventTriggerSquaddie({
            eventTriggers: defeatTriggers,
            objectRepository,
            battleSquaddieIds: defeatedBattleSquaddieIds,
            queryType: "targetingSquaddie",
        })

    return defeatTriggers
        .filter(
            (trigger) =>
                EventTriggerSquaddieService.targetingHasAtLeastOneBattleSquaddieId(
                    {
                        eventTrigger: trigger,
                        battleSquaddieIds: defeatedBattleSquaddieIds,
                    }
                ) ||
                EventTriggerSquaddieService.targetingHasAtLeastOneSquaddieTemplateId(
                    {
                        eventTrigger: trigger,
                        squaddieTemplateIds: defeatedSquaddieTemplateIds,
                    }
                )
        )
        .filter((trigger) =>
            EventTriggerTurnRangeService.isBeforeMaximumTurnsPassed({
                trigger,
                turnCount:
                    gameEngineState.battleOrchestratorState.battleState
                        .battlePhaseState?.turnCount,
            })
        )
        .filter((trigger) =>
            EventTriggerTurnRangeService.isAfterMinimumTurnsPassed({
                trigger,
                turnCount:
                    gameEngineState.battleOrchestratorState.battleState
                        .battlePhaseState?.turnCount,
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
