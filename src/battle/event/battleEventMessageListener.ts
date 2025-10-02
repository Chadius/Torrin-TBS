import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageSquaddieIsInjured,
    MessageBoardMessageType,
    TMessageBoardMessageType,
} from "../../message/messageBoardMessage"
import {
    CutsceneIdQueue,
    CutsceneQueueService,
} from "../cutscene/cutsceneIdQueue"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../history/battleAction/battleActionRecorder"
import { BattleEventEffect, TBattleEventEffect } from "./battleEventEffect"
import {
    ChallengeModifierSetting,
    ChallengeModifierSettingService,
} from "../challengeModifier/challengeModifierSetting"
import {
    BattleEvent,
    BattleEventService,
    BattleEventTriggerSquaddiesContext,
} from "./battleEvent"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieService } from "../../squaddie/squaddieService"
import { CutsceneEffect } from "../../cutscene/cutsceneEffect"
import { ChallengeModifierEffect } from "./eventEffect/challengeModifierEffect/challengeModifierEffect"
import { TBattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"

export class BattleEventMessageListener implements MessageBoardListener {
    messageBoardListenerId: string
    private cutsceneIdQueue: CutsceneIdQueue | undefined
    private challengeModifierSetting: ChallengeModifierSetting | undefined

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        if (
            !new Set<TMessageBoardMessageType>([
                MessageBoardMessageType.SQUADDIE_IS_INJURED,
                MessageBoardMessageType.SQUADDIE_IS_DEFEATED,
                MessageBoardMessageType.SQUADDIE_PHASE_STARTS,
            ]).has(message.type)
        )
            return

        let battleEvents = (message as MessageBoardMessageSquaddieIsInjured)
            .gameEngineState.battleOrchestratorState.battleState.battleEvents
        let objectRepository = (message as MessageBoardMessageSquaddieIsInjured)
            .gameEngineState.repository
        if (objectRepository) {
            battleEvents = this.filterQualifyingBattleEvents({
                allBattleEvents: battleEvents,
                objectRepository,
                battleActionRecorder: (
                    message as MessageBoardMessageSquaddieIsInjured
                ).gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
                turn: {
                    turnCount: (message as MessageBoardMessageSquaddieIsInjured)
                        .gameEngineState.battleOrchestratorState.battleState
                        ?.battlePhaseState?.turnCount,
                },
                battleCompletionStatus: (
                    message as MessageBoardMessageSquaddieIsInjured
                ).gameEngineState.battleOrchestratorState.battleState
                    .battleCompletionStatus,
            })
        }

        this.applyBattleEventEffects(battleEvents)
    }

    filterQualifyingBattleEvents({
        allBattleEvents,
        objectRepository,
        battleActionRecorder,
        turn,
        battleCompletionStatus,
    }: {
        allBattleEvents: BattleEvent[]
        objectRepository: ObjectRepository | undefined
        battleActionRecorder: BattleActionRecorder
        turn?: {
            turnCount?: number
            ignoreTurn0?: boolean
        }
        battleCompletionStatus?: TBattleCompletionStatus
    }): BattleEvent[] {
        let battleEvents =
            filterBattleEventsThatDidNotApplyEffect(allBattleEvents)

        const battleEventTriggerSquaddiesContext: BattleEventTriggerSquaddiesContext =
            generateTriggerSatisfiedSquaddieContext(
                battleActionRecorder,
                objectRepository
            )

        battleEvents = battleEvents.filter((battleEvent) =>
            BattleEventService.areTriggersSatisfied({
                battleEvent: battleEvent,
                context: {
                    turn,
                    squaddies: battleEventTriggerSquaddiesContext,
                    battleCompletionStatus,
                },
            })
        )

        return battleEvents
    }

    applyBattleEventEffects(battleEvents: BattleEvent[]) {
        if (this.cutsceneIdQueue) {
            const cutsceneEffects = filterBattleEventsByBattleEventEffectType(
                battleEvents,
                BattleEventEffect.CUTSCENE
            ) as (BattleEvent & { effect: CutsceneEffect })[]
            CutsceneQueueService.processBattleEvents(
                this.cutsceneIdQueue,
                cutsceneEffects
            )
            cutsceneEffects.forEach((battleEvent) => {
                battleEvent.effect.alreadyAppliedEffect = true
            })
        }

        if (this.challengeModifierSetting) {
            const challengeModifierEvents =
                filterBattleEventsByBattleEventEffectType(
                    battleEvents,
                    BattleEventEffect.CHALLENGE_MODIFIER
                ) as (BattleEvent & { effect: ChallengeModifierEffect })[]
            ChallengeModifierSettingService.processBattleEvents(
                this.challengeModifierSetting,
                challengeModifierEvents
            )
            challengeModifierEvents.forEach((battleEvent) => {
                battleEvent.effect.alreadyAppliedEffect = true
            })
        }
    }

    setCutsceneQueue(cutsceneIdQueue: CutsceneIdQueue) {
        this.cutsceneIdQueue = cutsceneIdQueue
    }

    setChallengeModifierSetting(
        challengeModifierSetting: ChallengeModifierSetting
    ) {
        this.challengeModifierSetting = challengeModifierSetting
    }
}

const filterBattleEventsByBattleEventEffectType = (
    battleEvents: BattleEvent[],
    battleEventEffectType: TBattleEventEffect
): BattleEvent[] =>
    battleEvents.filter((event) => event.effect.type === battleEventEffectType)

const filterBattleEventsThatDidNotApplyEffect = (
    battleEvents: BattleEvent[]
): BattleEvent[] =>
    battleEvents.filter((event) => !event.effect.alreadyAppliedEffect)

const generateTriggerSatisfiedSquaddieContext = (
    battleActionRecorder: BattleActionRecorder,
    objectRepository: ObjectRepository | undefined
): BattleEventTriggerSquaddiesContext => {
    let squaddieChanges =
        BattleActionRecorderService.peekAtAnimationQueue(battleActionRecorder)
            ?.effect.squaddie

    if (!squaddieChanges || squaddieChanges.length === 0) return {}

    return squaddieChanges.reduce(
        (
            squaddiesContext: BattleEventTriggerSquaddiesContext,
            squaddieChange
        ) => {
            if (objectRepository == undefined) return squaddiesContext
            const { squaddieTemplate, battleSquaddie } =
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    squaddieChange.battleSquaddieId
                )

            if (squaddieChange.damage.net <= 0) return squaddiesContext

            if (
                SquaddieService.isSquaddieAlive({
                    squaddieTemplate,
                    battleSquaddie,
                })
            ) {
                squaddiesContext.injured?.battleSquaddieIds.push(
                    battleSquaddie.battleSquaddieId
                )
                squaddiesContext.injured?.squaddieTemplateIds.push(
                    squaddieTemplate.squaddieId.templateId
                )
            } else {
                squaddiesContext.defeated?.battleSquaddieIds.push(
                    battleSquaddie.battleSquaddieId
                )
                squaddiesContext.defeated?.squaddieTemplateIds.push(
                    squaddieTemplate.squaddieId.templateId
                )
            }

            return squaddiesContext
        },
        {
            injured: {
                battleSquaddieIds: [],
                squaddieTemplateIds: [],
            },
            defeated: {
                battleSquaddieIds: [],
                squaddieTemplateIds: [],
            },
        }
    )
}
