import { MessageBoardListener } from "../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import {
    CutsceneIdQueue,
    CutsceneQueueService,
} from "../cutscene/cutsceneIdQueue"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../history/battleAction/battleActionRecorder"
import { BattleEventEffectType } from "./battleEventEffect"
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
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import { CutsceneEffect } from "../../cutscene/cutsceneEffect"
import { ChallengeModifierEffect } from "./eventEffect/challengeModifierEffect/challengeModifierEffect"
import { BattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"

export class BattleEventMessageListener implements MessageBoardListener {
    messageBoardListenerId: string
    private cutsceneIdQueue: CutsceneIdQueue
    private challengeModifierSetting: ChallengeModifierSetting

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        let battleEvents: BattleEvent[] = []

        switch (message.type) {
            case MessageBoardMessageType.SQUADDIE_IS_INJURED:
            case MessageBoardMessageType.SQUADDIE_IS_DEFEATED:
            case MessageBoardMessageType.SQUADDIE_PHASE_STARTS:
                battleEvents =
                    message.gameEngineState.battleOrchestratorState.battleState
                        .battleEvents
                break
            default:
                return
        }

        battleEvents = this.filterQualifyingBattleEvents({
            allBattleEvents: battleEvents,
            objectRepository: message.gameEngineState.repository,
            battleActionRecorder:
                message.gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
            turn: {
                turnCount:
                    message.gameEngineState.battleOrchestratorState.battleState
                        ?.battlePhaseState?.turnCount,
            },
            battleCompletionStatus:
                message.gameEngineState.battleOrchestratorState.battleState
                    .battleCompletionStatus,
        })

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
        objectRepository: ObjectRepository
        battleActionRecorder: BattleActionRecorder
        turn?: {
            turnCount?: number
            ignoreTurn0?: boolean
        }
        battleCompletionStatus?: BattleCompletionStatus
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
        if (this.cutsceneIdQueue)
            CutsceneQueueService.processBattleEvents(
                this.cutsceneIdQueue,
                filterBattleEventsByBattleEventEffectType(
                    battleEvents,
                    BattleEventEffectType.CUTSCENE
                ) as (BattleEvent & { effect: CutsceneEffect })[]
            )

        if (this.challengeModifierSetting)
            ChallengeModifierSettingService.processBattleEvents(
                this.challengeModifierSetting,
                filterBattleEventsByBattleEventEffectType(
                    battleEvents,
                    BattleEventEffectType.CHALLENGE_MODIFIER
                ) as (BattleEvent & { effect: ChallengeModifierEffect })[]
            )
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
    battleEventEffectType: BattleEventEffectType
): BattleEvent[] =>
    battleEvents.filter((event) => event.effect.type === battleEventEffectType)

const filterBattleEventsThatDidNotApplyEffect = (
    battleEvents: BattleEvent[]
): BattleEvent[] =>
    battleEvents.filter((event) => event.effect.alreadyAppliedEffect === false)

const generateTriggerSatisfiedSquaddieContext = (
    battleActionRecorder: BattleActionRecorder,
    objectRepository: ObjectRepository
): BattleEventTriggerSquaddiesContext => {
    let squaddieChanges =
        BattleActionRecorderService.peekAtAnimationQueue(battleActionRecorder)
            ?.effect.squaddie

    if (!squaddieChanges || squaddieChanges.length === 0) return {}

    return squaddieChanges.reduce(
        (squaddiesContext, squaddieChange) => {
            const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    squaddieChange.battleSquaddieId
                )
            )

            if (squaddieChange.damage.net <= 0) return squaddiesContext

            if (
                SquaddieService.isSquaddieAlive({
                    squaddieTemplate,
                    battleSquaddie,
                })
            ) {
                squaddiesContext.injured.battleSquaddieIds.push(
                    battleSquaddie.battleSquaddieId
                )
                squaddiesContext.injured.squaddieTemplateIds.push(
                    squaddieTemplate.squaddieId.templateId
                )
            } else {
                squaddiesContext.defeated.battleSquaddieIds.push(
                    battleSquaddie.battleSquaddieId
                )
                squaddiesContext.defeated.squaddieTemplateIds.push(
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
