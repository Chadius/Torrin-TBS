import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battleState/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import {
    MessageBoardMessage,
    MessageBoardMessageType,
    TMessageBoardMessageType,
} from "../../message/messageBoardMessage"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../history/battleAction/battleActionSquaddieChange"
import { BattleActionService } from "../history/battleAction/battleAction"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ObjectRepositoryService } from "../objectRepository"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleEventMessageListener } from "./battleEventMessageListener"
import { EventTriggerSquaddieService } from "./eventTrigger/eventTriggerSquaddie"
import { EventTriggerBaseService } from "./eventTrigger/eventTriggerBase"
import { TriggeringEvent } from "./eventTrigger/triggeringEvent"
import { EventTriggerSquaddieQueryService } from "./eventTrigger/eventTriggerSquaddieQuery"
import {
    CutsceneEffect,
    CutsceneEffectService,
} from "../../cutscene/cutsceneEffect"
import { CutsceneQueueService } from "../cutscene/cutsceneIdQueue"
import { getResultOrThrowError } from "../../utils/resultOrError"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { Damage } from "../../squaddie/squaddieService"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { BattlePhaseStateService } from "../orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { EventTriggerTurnRangeService } from "./eventTrigger/eventTriggerTurnRange"
import {
    BattleEvent,
    BattleEventEffect,
    BattleEventService,
} from "./battleEvent"
import { MapSearchTestUtils } from "../../hexMap/pathfinder/pathGeneration/mapSearchTests/mapSearchTestUtils"
import { BattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"
import { EventTriggerBattleCompletionStatusService } from "./eventTrigger/eventTriggerBattleCompletionStatus"
import {
    ChallengeModifierEnum,
    ChallengeModifierSettingService,
} from "../challengeModifier/challengeModifierSetting"
import { ChallengeModifierEffectService } from "./eventEffect/challengeModifierEffect/challengeModifierEffect"

describe("Event Message Listener", () => {
    let gameEngineState: GameEngineState
    let listener: BattleEventMessageListener

    beforeEach(() => {
        gameEngineState = GameEngineStateService.new({
            repository: ObjectRepositoryService.new(),
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap:
                        MapSearchTestUtils.create1row5columnsAllFlatTerrain(),
                    battleEvents: [],
                    battlePhaseState: BattlePhaseStateService.new({
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 1,
                    }),
                }),
            }),
        })
        listener = new BattleEventMessageListener("eventMessageListener")
    })

    describe("reacts to messages", () => {
        let filterSpy: MockInstance
        let applySpy: MockInstance

        beforeEach(() => {
            filterSpy = vi.spyOn(listener, "filterQualifyingBattleEvents")
            applySpy = vi.spyOn(listener, "applyBattleEventEffects")
        })

        afterEach(() => {
            filterSpy.mockRestore()
            applySpy.mockRestore()
        })

        const addMessageTypesToMessageListener = (
            gameEngineState: GameEngineState,
            messageTypes: TMessageBoardMessageType[]
        ) => {
            messageTypes.forEach((messageBoardMessageType) => {
                gameEngineState.messageBoard.addListener(
                    listener,
                    messageBoardMessageType
                )
            })
        }

        const reactTests: {
            name: string
            messageToSend: () => MessageBoardMessage
        }[] = [
            {
                name: "reacts to injury messages",
                messageToSend: () => ({
                    type: MessageBoardMessageType.SQUADDIE_IS_INJURED,
                    gameEngineState,
                    battleSquaddieIds: [],
                    objectRepository: gameEngineState.repository,
                }),
            },
            {
                name: "reacts to defeat messages",
                messageToSend: () => ({
                    type: MessageBoardMessageType.SQUADDIE_IS_DEFEATED,
                    gameEngineState,
                    battleSquaddieIds: [],
                    objectRepository: gameEngineState.repository,
                }),
            },
        ]

        it.each(reactTests)(`$name`, ({ messageToSend }) => {
            addMessageTypesToMessageListener(gameEngineState, [
                messageToSend().type,
            ])

            gameEngineState.messageBoard.sendMessage(messageToSend())

            expect(filterSpy).toBeCalled()
            expect(applySpy).toBeCalled()
        })
    })
    describe("Filter the correct Battle Events", () => {
        let cutsceneProcessSpy: MockInstance

        beforeEach(() => {
            listener.setCutsceneQueue(
                gameEngineState.battleOrchestratorState.cutsceneQueue
            )

            cutsceneProcessSpy = vi.spyOn(
                CutsceneQueueService,
                "processBattleEvents"
            )
        })

        afterEach(() => {
            cutsceneProcessSpy.mockRestore()
        })

        it("Skips already applied effects", () => {
            const turnBattleEvent: BattleEvent = {
                triggers: [
                    {
                        ...EventTriggerBaseService.new(
                            TriggeringEvent.START_OF_TURN
                        ),
                        ...EventTriggerTurnRangeService.new({
                            exactTurn: 1,
                        }),
                    },
                ],
                effect: CutsceneEffectService.new("CutsceneEffectService"),
            }
            turnBattleEvent.effect.alreadyAppliedEffect = true

            expect(
                listener.filterQualifyingBattleEvents({
                    allBattleEvents: [turnBattleEvent],
                    turn: {
                        turnCount: 1,
                    },
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    objectRepository: gameEngineState.repository,
                })
            ).toEqual([])
        })

        describe("check for squaddie injury and defeat", () => {
            const targetBattleSquaddieId = "injured_battle_squaddie"
            const injuredSquaddieTemplateId = "injuredSquaddieTemplate"

            const attackingBattleSquaddieId = "attacker"
            const attackerSquaddieTemplateId = "attackerSquaddieTemplate"

            let injuryBattleEvent: BattleEvent & {
                effect: CutsceneEffect
            }
            let defeatBattleEvent: BattleEvent & {
                effect: CutsceneEffect
            }

            beforeEach(() => {
                addSquaddiesToRepository()

                injuryBattleEvent = {
                    triggers: [
                        {
                            ...EventTriggerBaseService.new(
                                TriggeringEvent.SQUADDIE_IS_INJURED
                            ),
                            ...EventTriggerSquaddieService.new({
                                targetingSquaddie:
                                    EventTriggerSquaddieQueryService.new({
                                        battleSquaddieIds: [
                                            targetBattleSquaddieId,
                                        ],
                                    }),
                            }),
                        },
                    ],
                    effect: CutsceneEffectService.new("CutsceneEffectService"),
                }
                defeatBattleEvent = {
                    triggers: [
                        {
                            ...EventTriggerBaseService.new(
                                TriggeringEvent.SQUADDIE_IS_DEFEATED
                            ),
                            ...EventTriggerSquaddieService.new({
                                targetingSquaddie:
                                    EventTriggerSquaddieQueryService.new({
                                        battleSquaddieIds: [
                                            targetBattleSquaddieId,
                                        ],
                                    }),
                            }),
                        },
                    ],
                    effect: CutsceneEffectService.new("CutsceneEffectService"),
                }
            })

            it("checks for squaddie injuries", () => {
                dealDamageToTargetSquaddie(1)
                animateDealingDamageToSquaddie(1)

                expect(
                    listener.filterQualifyingBattleEvents({
                        allBattleEvents: [injuryBattleEvent, defeatBattleEvent],
                        battleActionRecorder:
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionRecorder,
                        objectRepository: gameEngineState.repository,
                    })
                ).toEqual([injuryBattleEvent])
            })

            it("checks for squaddie defeat", () => {
                dealDamageToTargetSquaddie(9001)
                animateDealingDamageToSquaddie(9001)

                expect(
                    listener.filterQualifyingBattleEvents({
                        allBattleEvents: [injuryBattleEvent, defeatBattleEvent],
                        battleActionRecorder:
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionRecorder,
                        objectRepository: gameEngineState.repository,
                    })
                ).toEqual([defeatBattleEvent])
            })

            const addSquaddiesToRepository = () => {
                ;[
                    {
                        name: "attacker",
                        battleId: attackingBattleSquaddieId,
                        templateId: attackerSquaddieTemplateId,
                        affiliation: SquaddieAffiliation.PLAYER,
                    },
                    {
                        name: "target",
                        battleId: targetBattleSquaddieId,
                        templateId: injuredSquaddieTemplateId,
                        affiliation: SquaddieAffiliation.ENEMY,
                    },
                ].forEach(({ name, battleId, templateId, affiliation }) => {
                    SquaddieRepositoryService.createNewSquaddieAndAddToRepository(
                        {
                            name,
                            battleId,
                            templateId,
                            affiliation,
                            actionTemplateIds: [],
                            objectRepository: gameEngineState.repository,
                        }
                    )
                })
            }

            const dealDamageToTargetSquaddie = (damageTaken: number) => {
                const { battleSquaddie: targetBattleSquaddie } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            gameEngineState.repository,
                            targetBattleSquaddieId
                        )
                    )
                InBattleAttributesService.takeDamage({
                    inBattleAttributes: targetBattleSquaddie.inBattleAttributes,
                    damageToTake: damageTaken,
                    damageType: Damage.UNKNOWN,
                })
            }

            const animateDealingDamageToSquaddie = (damageTaken: number) => {
                const battleActionSquaddieChange =
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: targetBattleSquaddieId,
                        damageExplanation: DamageExplanationService.new({
                            net: damageTaken,
                        }),
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    })
                BattleActionRecorderService.addReadyToAnimateBattleAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                    BattleActionService.new({
                        actor: {
                            actorBattleSquaddieId: attackingBattleSquaddieId,
                        },
                        action: { actionTemplateId: "attack" },
                        effect: {
                            squaddie: [battleActionSquaddieChange],
                        },
                    })
                )
            }
        })

        it("Check for Turn triggers", () => {
            const turnBattleEvent: BattleEvent = {
                triggers: [
                    {
                        ...EventTriggerBaseService.new(
                            TriggeringEvent.START_OF_TURN
                        ),
                        ...EventTriggerTurnRangeService.new({
                            exactTurn: 1,
                        }),
                    },
                ],
                effect: CutsceneEffectService.new("CutsceneEffectService"),
            }

            expect(
                listener.filterQualifyingBattleEvents({
                    allBattleEvents: [turnBattleEvent],
                    turn: {
                        turnCount: 1,
                    },
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    objectRepository: gameEngineState.repository,
                })
            ).toEqual([turnBattleEvent])
        })

        describe("Check for Mission Completion Objectives", () => {
            let victoryBattleEvent: BattleEvent
            let defeatBattleEvent: BattleEvent

            beforeEach(() => {
                victoryBattleEvent = {
                    triggers: [
                        {
                            ...EventTriggerBaseService.new(
                                TriggeringEvent.MISSION_VICTORY
                            ),
                            ...EventTriggerBattleCompletionStatusService.new({
                                battleCompletionStatus:
                                    BattleCompletionStatus.VICTORY,
                            }),
                        },
                    ],
                    effect: CutsceneEffectService.new("CutsceneEffectService"),
                }

                defeatBattleEvent = {
                    triggers: [
                        {
                            ...EventTriggerBaseService.new(
                                TriggeringEvent.MISSION_DEFEAT
                            ),
                            ...EventTriggerBattleCompletionStatusService.new({
                                battleCompletionStatus:
                                    BattleCompletionStatus.DEFEAT,
                            }),
                        },
                    ],
                    effect: CutsceneEffectService.new("CutsceneEffectService"),
                }
            })

            it("Check for Victory", () => {
                const battleEvents = listener.filterQualifyingBattleEvents({
                    allBattleEvents: [victoryBattleEvent, defeatBattleEvent],
                    objectRepository: gameEngineState.repository,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    turn: {
                        turnCount:
                            gameEngineState.battleOrchestratorState.battleState
                                ?.battlePhaseState?.turnCount,
                    },
                    battleCompletionStatus: BattleCompletionStatus.VICTORY,
                })

                expect(battleEvents).toEqual([victoryBattleEvent])
            })
            it("Check for Defeat", () => {
                const battleEvents = listener.filterQualifyingBattleEvents({
                    allBattleEvents: [victoryBattleEvent, defeatBattleEvent],
                    objectRepository: gameEngineState.repository,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    turn: {
                        turnCount:
                            gameEngineState.battleOrchestratorState.battleState
                                ?.battlePhaseState?.turnCount,
                    },
                    battleCompletionStatus: BattleCompletionStatus.DEFEAT,
                })

                expect(battleEvents).toEqual([defeatBattleEvent])
            })
        })
    })
    describe("Apply battle events to the correct handler", () => {
        const generateBattleEvents = (effects: BattleEventEffect[]) => {
            return effects.map((effect) => {
                return BattleEventService.new({
                    triggers: [
                        {
                            ...EventTriggerBaseService.new(
                                TriggeringEvent.START_OF_TURN
                            ),
                            ...EventTriggerTurnRangeService.new({
                                exactTurn: 1,
                            }),
                        },
                    ],
                    effect,
                })
            })
        }

        it("call cutscene effect handler", () => {
            let cutsceneProcessSpy: MockInstance = vi.spyOn(
                CutsceneQueueService,
                "processBattleEvents"
            )
            listener.setCutsceneQueue(
                gameEngineState.battleOrchestratorState.cutsceneQueue
            )

            const turnBattleEvents = generateBattleEvents([
                CutsceneEffectService.new("Cutscene0"),
                CutsceneEffectService.new("Cutscene1"),
            ])

            listener.applyBattleEventEffects(turnBattleEvents)

            expect(cutsceneProcessSpy).toHaveBeenCalledWith(
                gameEngineState.battleOrchestratorState.cutsceneQueue,
                turnBattleEvents
            )
            cutsceneProcessSpy.mockRestore()
        })
        it("call challenge modifier effect handler", () => {
            let challengeModifierProcessSpy: MockInstance = vi.spyOn(
                ChallengeModifierSettingService,
                "processBattleEvents"
            )
            listener.setChallengeModifierSetting(
                gameEngineState.battleOrchestratorState.battleState
                    .challengeModifierSetting
            )

            const turnBattleEvents = generateBattleEvents([
                ChallengeModifierEffectService.new(
                    ChallengeModifierEnum.TRAINING_WHEELS,
                    false
                ),
                ChallengeModifierEffectService.new(
                    ChallengeModifierEnum.TRAINING_WHEELS,
                    true
                ),
            ])

            listener.applyBattleEventEffects(turnBattleEvents)

            expect(challengeModifierProcessSpy).toHaveBeenCalledWith(
                gameEngineState.battleOrchestratorState.battleState
                    .challengeModifierSetting,
                turnBattleEvents
            )
            challengeModifierProcessSpy.mockRestore()
        })
    })
})
