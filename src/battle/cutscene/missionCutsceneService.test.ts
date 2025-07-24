import { Cutscene, CutsceneService } from "../../cutscene/cutscene"
import {
    DEFAULT_DEFEAT_CUTSCENE_ID,
    DEFAULT_VICTORY_CUTSCENE_ID,
    MissionCutsceneCollection,
    MissionCutsceneCollectionHelper,
} from "../orchestrator/missionCutsceneCollection"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { MissionObjectiveHelper } from "../missionResult/missionObjective"
import { MissionRewardType } from "../missionResult/missionReward"
import { BattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"
import {
    CutsceneMessageListener,
    MissionCutsceneService,
} from "./missionCutsceneService"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { MissionConditionType } from "../missionResult/missionCondition"
import { MissionMapService } from "../../missionMap/missionMap"
import { BattleStateService } from "../battleState/battleState"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../history/battleAction/battleActionSquaddieChange"

import {
    BattleActionActorContext,
    BattleActionActorContextService,
} from "../history/battleAction/battleActionActorContext"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../history/battleAction/battleActionRecorder"
import { BattleActionService } from "../history/battleAction/battleAction"
import { beforeEach, describe, expect, it, MockInstance, vi } from "vitest"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { DamageType } from "../../squaddie/squaddieService"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { TriggeringEventType } from "../eventTrigger/triggeringEventType"
import { BattleEvent, BattleEventService } from "../event/battleEvent"
import { EventTriggerBaseService } from "../eventTrigger/eventTriggerBase"
import { EventBattleProgressService } from "../eventTrigger/eventBattleProgress"
import { CutsceneEffectService } from "../../cutscene/cutsceneEffect"
import { EventTriggerTurnRangeService } from "../eventTrigger/eventTriggerTurnRange"
import { EventTriggerSquaddieService } from "../eventTrigger/eventTriggerSquaddie"
import { EventTriggerSquaddieQueryService } from "../eventTrigger/eventTriggerSquaddieQuery"

describe("Mission Cutscene Service", () => {
    let mockCutscene: Cutscene

    beforeEach(() => {
        mockCutscene = CutsceneService.new({})
    })

    describe("BattleEvent with Cutscenes based on Victory and Defeat", () => {
        let victoryState: GameEngineState
        let defeatState: GameEngineState
        let victoryCutsceneEvent: BattleEvent
        let defeatCutsceneEvent: BattleEvent
        let cutsceneCollection: MissionCutsceneCollection

        beforeEach(() => {
            cutsceneCollection = MissionCutsceneCollectionHelper.new({
                cutsceneById: {
                    [DEFAULT_VICTORY_CUTSCENE_ID]: mockCutscene,
                    [DEFAULT_DEFEAT_CUTSCENE_ID]: mockCutscene,
                },
            })

            victoryCutsceneEvent = BattleEventService.new({
                triggers: [
                    {
                        ...EventTriggerBaseService.new(
                            TriggeringEventType.MISSION_VICTORY
                        ),
                        ...EventBattleProgressService.new({
                            battleCompletionStatus:
                                BattleCompletionStatus.VICTORY,
                        }),
                    },
                ],
                effect: CutsceneEffectService.new(DEFAULT_VICTORY_CUTSCENE_ID),
            })
            victoryState = GameEngineStateService.new({
                repository: undefined,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap: MissionMapService.new({
                            terrainTileMap: TerrainTileMapService.new({
                                movementCost: ["1 1 "],
                            }),
                        }),
                        objectives: [
                            MissionObjectiveHelper.validateMissionObjective({
                                id: "test",
                                reward: {
                                    rewardType: MissionRewardType.VICTORY,
                                },
                                numberOfRequiredConditionsToComplete: 1,
                                hasGivenReward: false,
                                conditions: [
                                    {
                                        id: "test",
                                        type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                                    },
                                ],
                            }),
                        ],
                        cutsceneCollection,
                        battleEvents: [victoryCutsceneEvent],
                    }),
                }),
            })
            victoryState.battleOrchestratorState.battleState.battleCompletionStatus =
                BattleCompletionStatus.IN_PROGRESS

            defeatCutsceneEvent = BattleEventService.new({
                triggers: [
                    {
                        ...EventTriggerBaseService.new(
                            TriggeringEventType.MISSION_DEFEAT
                        ),
                        ...EventBattleProgressService.new({
                            battleCompletionStatus:
                                BattleCompletionStatus.DEFEAT,
                        }),
                    },
                ],
                effect: CutsceneEffectService.new(DEFAULT_DEFEAT_CUTSCENE_ID),
            })

            defeatState = GameEngineStateService.new({
                repository: undefined,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap: MissionMapService.new({
                            terrainTileMap: TerrainTileMapService.new({
                                movementCost: ["1 1 "],
                            }),
                        }),
                        objectives: [
                            MissionObjectiveHelper.validateMissionObjective({
                                id: "test",
                                reward: {
                                    rewardType: MissionRewardType.DEFEAT,
                                },
                                numberOfRequiredConditionsToComplete: 1,
                                hasGivenReward: false,
                                conditions: [
                                    {
                                        id: "test",
                                        type: MissionConditionType.DEFEAT_ALL_PLAYERS,
                                    },
                                ],
                            }),
                        ],
                        cutsceneCollection,
                        battleEvents: [defeatCutsceneEvent],
                    }),
                }),
            })
            defeatState.battleOrchestratorState.battleState.battleCompletionStatus =
                BattleCompletionStatus.IN_PROGRESS
        })

        describe("will check for victory conditions once the squaddie finishes action", () => {
            const modes = [
                {
                    mode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
                },
                { mode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP },
                { mode: BattleOrchestratorMode.SQUADDIE_MOVER },
            ]

            it.each(modes)(
                `mode $mode will look for victory conditions`,
                ({ mode }) => {
                    const missionObjectiveCompleteCheck = vi
                        .spyOn(MissionObjectiveHelper, "shouldBeComplete")
                        .mockReturnValue(true)
                    expect(
                        victoryState.battleOrchestratorState.battleState
                            .battleCompletionStatus
                    ).toBe(BattleCompletionStatus.IN_PROGRESS)

                    const info =
                        MissionCutsceneService.findBattleEventsToActivateBasedOnVictoryAndDefeat(
                            victoryState,
                            mode
                        )

                    expect(missionObjectiveCompleteCheck).toBeCalled()

                    expect(info).toStrictEqual([victoryCutsceneEvent])
                }
            )
        })

        it("will not check for victory cutscenes if the mode is not related to ending squaddie actions", () => {
            expect(
                victoryState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.IN_PROGRESS)
            const info =
                MissionCutsceneService.findBattleEventsToActivateBasedOnVictoryAndDefeat(
                    victoryState,
                    BattleOrchestratorMode.CUTSCENE_PLAYER
                )

            expect(info).toHaveLength(0)
        })

        it("will not recommend already triggered cutscenes", () => {
            expect(
                victoryState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.IN_PROGRESS)
            victoryState.battleOrchestratorState.battleState.battleEvents[0].effect.alreadyAppliedEffect =
                true
            const info =
                MissionCutsceneService.findBattleEventsToActivateBasedOnVictoryAndDefeat(
                    victoryState,
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
                )

            expect(info).toHaveLength(0)
        })

        it("will check for defeat conditions once the squaddie finishes moving", () => {
            const missionObjectiveCompleteCheck = vi
                .spyOn(MissionObjectiveHelper, "shouldBeComplete")
                .mockReturnValue(true)
            expect(
                defeatState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.IN_PROGRESS)

            const info =
                MissionCutsceneService.findBattleEventsToActivateBasedOnVictoryAndDefeat(
                    defeatState,
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
                )

            expect(missionObjectiveCompleteCheck).toBeCalled()

            expect(info).toStrictEqual([defeatCutsceneEvent])
        })

        it("if you trigger victory and defeat, defeat takes precedence", () => {
            const victoryAndDefeatState = GameEngineStateService.new({
                repository: undefined,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap: MissionMapService.new({
                            terrainTileMap: TerrainTileMapService.new({
                                movementCost: ["1 1 "],
                            }),
                        }),
                        objectives: [
                            MissionObjectiveHelper.validateMissionObjective({
                                id: "test",
                                reward: {
                                    rewardType: MissionRewardType.VICTORY,
                                },
                                numberOfRequiredConditionsToComplete: 1,
                                hasGivenReward: false,
                                conditions: [
                                    {
                                        id: "test",
                                        type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                                    },
                                ],
                            }),
                            MissionObjectiveHelper.validateMissionObjective({
                                id: "test1",
                                reward: {
                                    rewardType: MissionRewardType.DEFEAT,
                                },
                                numberOfRequiredConditionsToComplete: 1,
                                hasGivenReward: false,
                                conditions: [
                                    {
                                        id: "test",
                                        type: MissionConditionType.DEFEAT_ALL_PLAYERS,
                                    },
                                ],
                            }),
                        ],
                        cutsceneCollection,
                        battleEvents: [
                            victoryCutsceneEvent,
                            defeatCutsceneEvent,
                        ],
                    }),
                }),
            })
            victoryAndDefeatState.battleOrchestratorState.battleState.battleCompletionStatus =
                BattleCompletionStatus.IN_PROGRESS

            const missionObjectiveCompleteCheck = vi
                .spyOn(MissionObjectiveHelper, "shouldBeComplete")
                .mockReturnValue(true)
            expect(
                victoryAndDefeatState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.IN_PROGRESS)

            const info =
                MissionCutsceneService.findBattleEventsToActivateBasedOnVictoryAndDefeat(
                    defeatState,
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
                )

            expect(missionObjectiveCompleteCheck).toBeCalled()

            expect(info).toStrictEqual([defeatCutsceneEvent])
        })
    })

    describe("Can trigger based on Phase and Turn Count", () => {
        let turn0State: GameEngineState
        let turn0StateCutsceneId = "introductory cutscene"
        let turn0BattleEvent: BattleEvent
        let cutsceneCollection: MissionCutsceneCollection

        beforeEach(() => {
            cutsceneCollection = MissionCutsceneCollectionHelper.new({
                cutsceneById: {
                    [turn0StateCutsceneId]: mockCutscene,
                },
            })

            turn0BattleEvent = {
                triggers: [
                    {
                        ...EventTriggerBaseService.new(
                            TriggeringEventType.START_OF_TURN
                        ),
                        ...EventTriggerTurnRangeService.new({
                            exactTurn: 0,
                        }),
                    },
                ],
                effect: CutsceneEffectService.new("introductory cutscene"),
            }
            turn0State = GameEngineStateService.new({
                repository: undefined,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap: MissionMapService.new({
                            terrainTileMap: TerrainTileMapService.new({
                                movementCost: ["1 1 "],
                            }),
                        }),
                        cutsceneCollection,
                        objectives: [],
                        battleEvents: [turn0BattleEvent],
                        battlePhaseState: {
                            turnCount: 0,
                            currentAffiliation: BattlePhase.UNKNOWN,
                        },
                    }),
                }),
            })
            turn0State.battleOrchestratorState.battleState.battlePhaseState.turnCount = 0
        })

        it("will check for any introductory cutscenes during phase 0", () => {
            let info =
                MissionCutsceneService.findBattleEventsToActivateOnStartOfPhase(
                    {
                        gameEngineState: turn0State,
                        battleOrchestratorModeThatJustCompleted:
                            BattleOrchestratorMode.INITIALIZED,
                    }
                )
            expect(info).toStrictEqual([turn0BattleEvent])

            let info2 =
                MissionCutsceneService.findBattleEventsToActivateOnStartOfPhase(
                    {
                        gameEngineState: turn0State,
                        battleOrchestratorModeThatJustCompleted:
                            BattleOrchestratorMode.PHASE_CONTROLLER,
                    }
                )
            expect(info2).toStrictEqual([turn0BattleEvent])
        })

        it("will remove phase 0 cutscene triggers", () => {
            let info =
                MissionCutsceneService.findBattleEventsToActivateOnStartOfPhase(
                    {
                        gameEngineState: turn0State,
                        battleOrchestratorModeThatJustCompleted:
                            BattleOrchestratorMode.INITIALIZED,
                        ignoreTurn0Triggers: true,
                    }
                )
            expect(info).toHaveLength(0)
        })

        it("will not check for any turn starting cutscenes mid turn", () => {
            const info =
                MissionCutsceneService.findBattleEventsToActivateOnStartOfPhase(
                    {
                        gameEngineState: turn0State,
                        battleOrchestratorModeThatJustCompleted:
                            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
                    }
                )

            expect(info).toHaveLength(0)
        })
    })

    describe("BattleEvents based on SquaddieSquaddieResult", () => {
        let listener: CutsceneMessageListener
        let cutsceneCollection: MissionCutsceneCollection

        beforeEach(() => {
            listener = new CutsceneMessageListener("cutsceneMessageListener")
        })

        describe("Squaddie Is Injured Cutscene Trigger (via BattleAction)", () => {
            let targetWasInjuredContext: BattleActionActorContext
            let gameEngineStateWithInjuryCutscene: GameEngineState
            let injuredBattleEvent: BattleEvent
            const injuredCutsceneId = "injured"
            const injuredBattleSquaddieId = "injured_battle_squaddie"
            const injuredSquaddieTemplateId = "injuredSquaddieTemplate"

            const differentBattleSquaddieId = "different_battle_squaddie"
            const differentSquaddieTemplateId = "differentSquaddieTemplate"

            const attackingBattleSquaddieId = "attacker"
            const attackerSquaddieTemplateId = "attackerSquaddieTemplate"

            beforeEach(() => {
                mockCutscene = CutsceneService.new({})
                cutsceneCollection = MissionCutsceneCollectionHelper.new({
                    cutsceneById: {
                        [injuredCutsceneId]: mockCutscene,
                    },
                })

                injuredBattleEvent = {
                    triggers: [
                        {
                            ...EventTriggerBaseService.new(
                                TriggeringEventType.SQUADDIE_IS_INJURED
                            ),
                            ...EventTriggerSquaddieService.new({
                                targetingSquaddie:
                                    EventTriggerSquaddieQueryService.new({
                                        battleSquaddieIds: [
                                            injuredBattleSquaddieId,
                                        ],
                                    }),
                            }),
                        },
                    ],
                    effect: CutsceneEffectService.new("introductory cutscene"),
                }

                targetWasInjuredContext = BattleActionActorContextService.new({
                    actingSquaddieModifiers: undefined,
                    actingSquaddieRoll: undefined,
                })

                gameEngineStateWithInjuryCutscene = GameEngineStateService.new({
                    repository: ObjectRepositoryService.new(),
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                missionMap: MissionMapService.new({
                                    terrainTileMap: TerrainTileMapService.new({
                                        movementCost: ["1 1 "],
                                    }),
                                }),
                                cutsceneCollection,
                                battleEvents: [],
                            }),
                        }
                    ),
                })
                ;[
                    {
                        name: "attacker",
                        battleId: attackingBattleSquaddieId,
                        templateId: attackerSquaddieTemplateId,
                        affiliation: SquaddieAffiliation.PLAYER,
                    },
                    {
                        name: "target",
                        battleId: injuredBattleSquaddieId,
                        templateId: injuredSquaddieTemplateId,
                        affiliation: SquaddieAffiliation.ENEMY,
                    },
                    {
                        name: "different",
                        battleId: differentBattleSquaddieId,
                        templateId: differentSquaddieTemplateId,
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
                            objectRepository:
                                gameEngineStateWithInjuryCutscene.repository,
                        }
                    )
                })
            })

            it("Responds to SQUADDIE_IS_INJURED messages by searching for a cutscene", () => {
                let finderSpy: MockInstance
                gameEngineStateWithInjuryCutscene.messageBoard.addListener(
                    listener,
                    MessageBoardMessageType.SQUADDIE_IS_INJURED
                )

                finderSpy = vi.spyOn(
                    MissionCutsceneService,
                    "findBattleEventsToActivateBasedOnSquaddieSquaddieAction"
                )

                addDamagingEffect({
                    battleActionRecorder:
                        gameEngineStateWithInjuryCutscene
                            .battleOrchestratorState.battleState
                            .battleActionRecorder,
                    actor: {
                        actorBattleSquaddieId: attackingBattleSquaddieId,
                        actorContext: targetWasInjuredContext,
                    },
                    targetBattleSquaddieId: injuredBattleSquaddieId,
                    netDamage: 1,
                })

                gameEngineStateWithInjuryCutscene.messageBoard.sendMessage({
                    type: MessageBoardMessageType.SQUADDIE_IS_INJURED,
                    gameEngineState: gameEngineStateWithInjuryCutscene,
                    battleSquaddieIds: [],
                    objectRepository:
                        gameEngineStateWithInjuryCutscene.repository,
                })
                expect(finderSpy).toBeCalled()
                finderSpy.mockRestore()
            })

            it("will fire the cutscene if it gets a squaddie is injured", () => {
                gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.battleEvents.push(
                    injuredBattleEvent
                )

                const battleActionSquaddieChange = addDamagingEffect({
                    battleActionRecorder:
                        gameEngineStateWithInjuryCutscene
                            .battleOrchestratorState.battleState
                            .battleActionRecorder,
                    actor: {
                        actorBattleSquaddieId: attackingBattleSquaddieId,
                        actorContext: targetWasInjuredContext,
                    },
                    targetBattleSquaddieId: injuredBattleSquaddieId,
                    netDamage: 2,
                })

                expect(
                    MissionCutsceneService.findBattleEventsToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithInjuryCutscene,
                            squaddieChanges: [battleActionSquaddieChange],
                            objectRepository:
                                gameEngineStateWithInjuryCutscene.repository,
                        }
                    )
                ).toEqual([injuredBattleEvent])
            })

            it("will not fire the cutscene if the squaddie is not injured", () => {
                gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.battleEvents.push(
                    injuredBattleEvent
                )

                const battleActionSquaddieChange = addDamagingEffect({
                    battleActionRecorder:
                        gameEngineStateWithInjuryCutscene
                            .battleOrchestratorState.battleState
                            .battleActionRecorder,
                    actor: {
                        actorBattleSquaddieId: attackingBattleSquaddieId,
                        actorContext: targetWasInjuredContext,
                    },
                    targetBattleSquaddieId: injuredBattleSquaddieId,
                    netDamage: 0,
                })

                expect(
                    MissionCutsceneService.findBattleEventsToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithInjuryCutscene,
                            squaddieChanges: [battleActionSquaddieChange],
                            objectRepository:
                                gameEngineStateWithInjuryCutscene.repository,
                        }
                    )
                ).toHaveLength(0)
            })

            it("will not fire the cutscene if a different squaddie is injured", () => {
                gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.battleEvents.push(
                    injuredBattleEvent
                )

                const battleActionSquaddieChange = addDamagingEffect({
                    battleActionRecorder:
                        gameEngineStateWithInjuryCutscene
                            .battleOrchestratorState.battleState
                            .battleActionRecorder,
                    actor: {
                        actorBattleSquaddieId: attackingBattleSquaddieId,
                        actorContext: targetWasInjuredContext,
                    },
                    targetBattleSquaddieId: differentBattleSquaddieId,
                    netDamage: 0,
                })

                expect(
                    MissionCutsceneService.findBattleEventsToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithInjuryCutscene,
                            squaddieChanges: [battleActionSquaddieChange],
                            objectRepository:
                                gameEngineStateWithInjuryCutscene.repository,
                        }
                    )
                ).toHaveLength(0)
            })

            describe("cutscene triggers in between minimum and maximum turns if provided", () => {
                const tests = [
                    {
                        name: "will fire between turn boundary",
                        minimumTurns: 2,
                        maximumTurns: 5,
                        turnCount: 4,
                        expectsTriggers: true,
                    },
                    {
                        name: "will fire after minimumTurns",
                        minimumTurns: 2,
                        turnCount: 4,
                        expectsTriggers: true,
                    },
                    {
                        name: "will fire before maximumTurns",
                        maximumTurns: 5,
                        turnCount: 4,
                        expectsTriggers: true,
                    },
                    {
                        name: "not fire before minimumTurns",
                        minimumTurns: 2,
                        turnCount: 1,
                        expectsTriggers: false,
                    },
                    {
                        name: "not fire after maximumTurns",
                        maximumTurns: 5,
                        turnCount: 8,
                        expectsTriggers: false,
                    },
                ]

                it.each(tests)(
                    `$name`,
                    ({
                        minimumTurns,
                        maximumTurns,
                        turnCount,
                        expectsTriggers,
                    }) => {
                        setTurnsForTriggerAndGame({
                            minimumTurns,
                            maximumTurns,
                            turnCount,
                            gameEngineState: gameEngineStateWithInjuryCutscene,
                            battleEventWithTurns: injuredBattleEvent,
                        })

                        BattleActionRecorderService.addReadyToAnimateBattleAction(
                            gameEngineStateWithInjuryCutscene
                                .battleOrchestratorState.battleState
                                .battleActionRecorder,
                            BattleActionService.new({
                                actor: {
                                    actorBattleSquaddieId: "attacker",
                                    actorContext: targetWasInjuredContext,
                                },
                                action: { actionTemplateId: "attack" },
                                effect: {
                                    squaddie: [
                                        BattleActionSquaddieChangeService.new({
                                            battleSquaddieId:
                                                injuredBattleSquaddieId,
                                            damageExplanation:
                                                DamageExplanationService.new({
                                                    net: 2,
                                                }),
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.SUCCESS,
                                        }),
                                    ],
                                },
                            })
                        )

                        const battleActionSquaddieChange =
                            BattleActionSquaddieChangeService.new({
                                battleSquaddieId: injuredBattleSquaddieId,
                                damageExplanation: DamageExplanationService.new(
                                    {
                                        net: 2,
                                    }
                                ),
                                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                            })

                        const expectedTriggers = expectsTriggers
                            ? [injuredBattleEvent]
                            : []

                        expect(
                            MissionCutsceneService.findBattleEventsToActivateBasedOnSquaddieSquaddieAction(
                                {
                                    gameEngineState:
                                        gameEngineStateWithInjuryCutscene,
                                    squaddieChanges: [
                                        battleActionSquaddieChange,
                                    ],
                                    objectRepository:
                                        gameEngineStateWithInjuryCutscene.repository,
                                }
                            )
                        ).toEqual(expectedTriggers)
                    }
                )
            })
        })

        describe("Squaddie Is Dead Cutscene Trigger (via BattleAction)", () => {
            let targetWasDefeatedContext: BattleActionActorContext
            let gameEngineStateWithDefeatCutscene: GameEngineState
            let deadBattleSquaddieBattleEvent: BattleEvent
            const deadBattleSquaddieCutsceneId =
                "squaddie dead by battle squaddie"
            let deadSquaddieTemplateBattleEvent: BattleEvent
            const deadSquaddieTemplateCutsceneId =
                "squaddie dead by squaddie template"

            const deadBattleSquaddieId = "dead_battle_squaddie"
            const deadSquaddieTemplateId = "dead_squaddie_template"

            const attackingBattleSquaddieId = "attacking_battle_squaddie"
            const attackingSquaddieTemplateId = "attacking_squaddie_template"

            beforeEach(() => {
                mockCutscene = CutsceneService.new({})
                cutsceneCollection = MissionCutsceneCollectionHelper.new({
                    cutsceneById: {
                        [deadBattleSquaddieCutsceneId]: mockCutscene,
                    },
                })

                deadBattleSquaddieBattleEvent = {
                    triggers: [
                        {
                            ...EventTriggerBaseService.new(
                                TriggeringEventType.SQUADDIE_IS_DEFEATED
                            ),
                            ...EventTriggerSquaddieService.new({
                                targetingSquaddie:
                                    EventTriggerSquaddieQueryService.new({
                                        battleSquaddieIds: [
                                            deadBattleSquaddieId,
                                        ],
                                    }),
                            }),
                        },
                    ],
                    effect: CutsceneEffectService.new(
                        deadBattleSquaddieCutsceneId
                    ),
                }

                deadSquaddieTemplateBattleEvent = {
                    triggers: [
                        {
                            ...EventTriggerBaseService.new(
                                TriggeringEventType.SQUADDIE_IS_DEFEATED
                            ),
                            ...EventTriggerSquaddieService.new({
                                targetingSquaddie:
                                    EventTriggerSquaddieQueryService.new({
                                        squaddieTemplateIds: [
                                            deadSquaddieTemplateId,
                                        ],
                                    }),
                            }),
                        },
                    ],
                    effect: CutsceneEffectService.new(
                        deadSquaddieTemplateCutsceneId
                    ),
                }
                targetWasDefeatedContext = BattleActionActorContextService.new({
                    actingSquaddieModifiers: undefined,
                    actingSquaddieRoll: undefined,
                })

                gameEngineStateWithDefeatCutscene = GameEngineStateService.new({
                    repository: ObjectRepositoryService.new(),
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                missionMap: MissionMapService.new({
                                    terrainTileMap: TerrainTileMapService.new({
                                        movementCost: ["1 1 "],
                                    }),
                                }),
                                cutsceneCollection,
                                battleEvents: [],
                            }),
                        }
                    ),
                })
                ;[
                    {
                        name: "attacker",
                        battleId: attackingBattleSquaddieId,
                        templateId: attackingSquaddieTemplateId,
                        affiliation: SquaddieAffiliation.PLAYER,
                    },
                    {
                        name: "is dead",
                        battleId: deadBattleSquaddieId,
                        templateId: deadSquaddieTemplateId,
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
                            objectRepository:
                                gameEngineStateWithDefeatCutscene.repository,
                        }
                    )
                })
            })

            it("Responds to SQUADDIE_IS_DEAD messages by searching for a cutscene", () => {
                let finderSpy: MockInstance
                gameEngineStateWithDefeatCutscene.messageBoard.addListener(
                    listener,
                    MessageBoardMessageType.SQUADDIE_IS_DEFEATED
                )

                finderSpy = vi.spyOn(
                    MissionCutsceneService,
                    "findBattleEventsToActivateBasedOnSquaddieSquaddieAction"
                )

                addDamagingEffect({
                    battleActionRecorder:
                        gameEngineStateWithDefeatCutscene
                            .battleOrchestratorState.battleState
                            .battleActionRecorder,
                    actor: {
                        actorBattleSquaddieId: attackingBattleSquaddieId,
                        actorContext: targetWasDefeatedContext,
                    },
                    targetBattleSquaddieId: deadBattleSquaddieId,
                    netDamage: 9001,
                })

                gameEngineStateWithDefeatCutscene.messageBoard.sendMessage({
                    type: MessageBoardMessageType.SQUADDIE_IS_DEFEATED,
                    gameEngineState: gameEngineStateWithDefeatCutscene,
                    battleSquaddieIds: [],
                    objectRepository:
                        gameEngineStateWithDefeatCutscene.repository,
                })
                expect(finderSpy).toBeCalled()
                finderSpy.mockRestore()
            })

            it("will fire the cutscene if a squaddie with a matching battle squaddie id is dead", () => {
                gameEngineStateWithDefeatCutscene.battleOrchestratorState.battleState.battleEvents.push(
                    deadBattleSquaddieBattleEvent
                )
                instantKillSquaddie({
                    battleSquaddieId: deadBattleSquaddieId,
                    objectRepository:
                        gameEngineStateWithDefeatCutscene.repository,
                })

                const battleActionSquaddieChange = addDamagingEffect({
                    battleActionRecorder:
                        gameEngineStateWithDefeatCutscene
                            .battleOrchestratorState.battleState
                            .battleActionRecorder,
                    actor: {
                        actorBattleSquaddieId: attackingBattleSquaddieId,
                        actorContext: targetWasDefeatedContext,
                    },
                    targetBattleSquaddieId: deadBattleSquaddieId,
                    netDamage: 9001,
                })

                expect(
                    MissionCutsceneService.findBattleEventsToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithDefeatCutscene,
                            squaddieChanges: [battleActionSquaddieChange],
                            objectRepository:
                                gameEngineStateWithDefeatCutscene.repository,
                        }
                    )
                ).toEqual([deadBattleSquaddieBattleEvent])
            })

            it("will not fire the cutscene if the squaddie does not die", () => {
                gameEngineStateWithDefeatCutscene.battleOrchestratorState.battleState.battleEvents.push(
                    deadBattleSquaddieBattleEvent
                )

                const battleActionSquaddieChange = addDamagingEffect({
                    battleActionRecorder:
                        gameEngineStateWithDefeatCutscene
                            .battleOrchestratorState.battleState
                            .battleActionRecorder,
                    actor: {
                        actorBattleSquaddieId: attackingBattleSquaddieId,
                        actorContext: targetWasDefeatedContext,
                    },
                    targetBattleSquaddieId: deadBattleSquaddieId,
                    netDamage: 1,
                })

                expect(
                    MissionCutsceneService.findBattleEventsToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithDefeatCutscene,
                            squaddieChanges: [battleActionSquaddieChange],
                            objectRepository:
                                gameEngineStateWithDefeatCutscene.repository,
                        }
                    )
                ).toHaveLength(0)
            })

            it("will fire the cutscene if a squaddie with a matching squaddie template id is dead", () => {
                gameEngineStateWithDefeatCutscene.battleOrchestratorState.battleState.battleEvents.push(
                    deadSquaddieTemplateBattleEvent
                )
                instantKillSquaddie({
                    battleSquaddieId: deadBattleSquaddieId,
                    objectRepository:
                        gameEngineStateWithDefeatCutscene.repository,
                })

                const battleActionSquaddieChange = addDamagingEffect({
                    battleActionRecorder:
                        gameEngineStateWithDefeatCutscene
                            .battleOrchestratorState.battleState
                            .battleActionRecorder,
                    actor: {
                        actorBattleSquaddieId: attackingBattleSquaddieId,
                        actorContext: targetWasDefeatedContext,
                    },
                    targetBattleSquaddieId: deadBattleSquaddieId,
                    netDamage: 9001,
                })

                expect(
                    MissionCutsceneService.findBattleEventsToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithDefeatCutscene,
                            squaddieChanges: [battleActionSquaddieChange],
                            objectRepository:
                                gameEngineStateWithDefeatCutscene.repository,
                        }
                    )
                ).toEqual([deadSquaddieTemplateBattleEvent])
            })

            describe("cutscene triggers in between minimum and maximum turns if provided", () => {
                const tests = [
                    {
                        name: "will fire between turn boundary",
                        minimumTurns: 2,
                        maximumTurns: 5,
                        turnCount: 4,
                        expectsTriggers: true,
                    },
                    {
                        name: "will fire after minimumTurns",
                        minimumTurns: 2,
                        turnCount: 4,
                        expectsTriggers: true,
                    },
                    {
                        name: "will fire before maximumTurns",
                        maximumTurns: 5,
                        turnCount: 4,
                        expectsTriggers: true,
                    },
                    {
                        name: "not fire before minimumTurns",
                        minimumTurns: 2,
                        turnCount: 1,
                        expectsTriggers: false,
                    },
                    {
                        name: "not fire after maximumTurns",
                        maximumTurns: 5,
                        turnCount: 8,
                        expectsTriggers: false,
                    },
                ]

                it.each(tests)(
                    `$name`,
                    ({
                        minimumTurns,
                        maximumTurns,
                        turnCount,
                        expectsTriggers,
                    }) => {
                        setTurnsForTriggerAndGame({
                            minimumTurns,
                            maximumTurns,
                            turnCount,
                            gameEngineState: gameEngineStateWithDefeatCutscene,
                            battleEventWithTurns: deadBattleSquaddieBattleEvent,
                        })

                        instantKillSquaddie({
                            battleSquaddieId: deadBattleSquaddieId,
                            objectRepository:
                                gameEngineStateWithDefeatCutscene.repository,
                        })

                        const battleActionSquaddieChange = addDamagingEffect({
                            battleActionRecorder:
                                gameEngineStateWithDefeatCutscene
                                    .battleOrchestratorState.battleState
                                    .battleActionRecorder,
                            actor: {
                                actorBattleSquaddieId:
                                    attackingBattleSquaddieId,
                                actorContext: targetWasDefeatedContext,
                            },
                            targetBattleSquaddieId: deadBattleSquaddieId,
                            netDamage: 9001,
                        })

                        const expectedTriggers = expectsTriggers
                            ? [deadBattleSquaddieBattleEvent]
                            : []

                        expect(
                            MissionCutsceneService.findBattleEventsToActivateBasedOnSquaddieSquaddieAction(
                                {
                                    gameEngineState:
                                        gameEngineStateWithDefeatCutscene,
                                    squaddieChanges: [
                                        battleActionSquaddieChange,
                                    ],
                                    objectRepository:
                                        gameEngineStateWithDefeatCutscene.repository,
                                }
                            )
                        ).toEqual(expectedTriggers)
                    }
                )
            })
        })
    })
})

const addDamagingEffect = ({
    battleActionRecorder,
    actor,
    targetBattleSquaddieId,
    netDamage,
}: {
    actor: {
        actorBattleSquaddieId: string
        actorContext: BattleActionActorContext
    }
    battleActionRecorder: BattleActionRecorder
    targetBattleSquaddieId: string
    netDamage: number
}) => {
    const battleActionSquaddieChange = BattleActionSquaddieChangeService.new({
        battleSquaddieId: targetBattleSquaddieId,
        damageExplanation: DamageExplanationService.new({
            net: netDamage,
        }),
        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
    })
    BattleActionRecorderService.addReadyToAnimateBattleAction(
        battleActionRecorder,
        BattleActionService.new({
            actor,
            action: { actionTemplateId: "attack" },
            effect: {
                squaddie: [battleActionSquaddieChange],
            },
        })
    )
    return battleActionSquaddieChange
}

const instantKillSquaddie = ({
    battleSquaddieId,
    objectRepository,
}: {
    battleSquaddieId: string
    objectRepository: ObjectRepository
}) => {
    const { battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieId
        )
    )

    InBattleAttributesService.takeDamage({
        inBattleAttributes: battleSquaddie.inBattleAttributes,
        damageType: DamageType.UNKNOWN,
        damageToTake: 9001,
    })
}

const setTurnsForTriggerAndGame = ({
    minimumTurns,
    maximumTurns,
    turnCount,
    gameEngineState,
    battleEventWithTurns,
}: {
    minimumTurns: number
    maximumTurns: number
    turnCount: number
    gameEngineState: GameEngineState
    battleEventWithTurns: BattleEvent
}) => {
    battleEventWithTurns.triggers.push({
        ...EventTriggerBaseService.new(TriggeringEventType.START_OF_TURN),
        ...EventTriggerTurnRangeService.new({
            minimumTurns,
            maximumTurns,
        }),
    })
    gameEngineState.battleOrchestratorState.battleState.battlePhaseState = {
        turnCount,
        currentAffiliation: BattlePhase.PLAYER,
    }

    gameEngineState.battleOrchestratorState.battleState.battleEvents.push(
        battleEventWithTurns
    )
}
