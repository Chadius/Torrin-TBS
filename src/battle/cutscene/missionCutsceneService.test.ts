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
import {
    CutsceneTrigger,
    MissionDefeatCutsceneTrigger,
    SquaddieIsDefeatedTrigger,
    SquaddieIsInjuredTrigger,
    TriggeringEvent,
} from "../../cutscene/cutsceneTrigger"
import { BattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"
import { MissionVictoryCutsceneTrigger } from "./missionVictoryCutsceneTrigger"
import {
    CutsceneMessageListener,
    MissionCutsceneService,
} from "./missionCutsceneService"
import { MissionStartOfPhaseCutsceneTrigger } from "./missionStartOfPhaseCutsceneTrigger"
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

describe("Mission Cutscene Service", () => {
    let mockCutscene: Cutscene

    beforeEach(() => {
        mockCutscene = CutsceneService.new({})
    })

    describe("CutsceneTriggers based on Victory and Defeat", () => {
        let victoryState: GameEngineState
        let defeatState: GameEngineState
        let victoryCutsceneTrigger: MissionVictoryCutsceneTrigger
        let defeatCutsceneTrigger: MissionDefeatCutsceneTrigger
        let cutsceneCollection: MissionCutsceneCollection

        beforeEach(() => {
            cutsceneCollection = MissionCutsceneCollectionHelper.new({
                cutsceneById: {
                    [DEFAULT_VICTORY_CUTSCENE_ID]: mockCutscene,
                    [DEFAULT_DEFEAT_CUTSCENE_ID]: mockCutscene,
                },
            })

            victoryCutsceneTrigger = {
                cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID,
                triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                systemReactedToTrigger: false,
            }
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
                        cutsceneTriggers: [victoryCutsceneTrigger],
                    }),
                }),
            })
            victoryState.battleOrchestratorState.battleState.battleCompletionStatus =
                BattleCompletionStatus.IN_PROGRESS

            defeatCutsceneTrigger = {
                cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID,
                triggeringEvent: TriggeringEvent.MISSION_DEFEAT,
                systemReactedToTrigger: false,
            }
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
                        cutsceneTriggers: [defeatCutsceneTrigger],
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
                        MissionCutsceneService.findCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
                            victoryState,
                            mode
                        )

                    expect(missionObjectiveCompleteCheck).toBeCalled()

                    expect(info).toStrictEqual([victoryCutsceneTrigger])
                }
            )
        })

        it("will not check for victory cutscenes if the mode is not related to ending squaddie actions", () => {
            expect(
                victoryState.battleOrchestratorState.battleState
                    .battleCompletionStatus
            ).toBe(BattleCompletionStatus.IN_PROGRESS)
            const info =
                MissionCutsceneService.findCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
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
            victoryCutsceneTrigger.systemReactedToTrigger = true
            const info =
                MissionCutsceneService.findCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
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
                MissionCutsceneService.findCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
                    defeatState,
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
                )

            expect(missionObjectiveCompleteCheck).toBeCalled()

            expect(info).toStrictEqual([defeatCutsceneTrigger])
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
                        cutsceneTriggers: [
                            victoryCutsceneTrigger,
                            defeatCutsceneTrigger,
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
                MissionCutsceneService.findCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
                    defeatState,
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
                )

            expect(missionObjectiveCompleteCheck).toBeCalled()

            expect(info).toStrictEqual([defeatCutsceneTrigger])
        })
    })

    describe("CutsceneTriggers based on Phase", () => {
        let turn0State: GameEngineState
        let turn0StateCutsceneId = "introductory cutscene"
        let turn0CutsceneTrigger: MissionStartOfPhaseCutsceneTrigger
        let cutsceneCollection: MissionCutsceneCollection

        beforeEach(() => {
            cutsceneCollection = MissionCutsceneCollectionHelper.new({
                cutsceneById: {
                    [turn0StateCutsceneId]: mockCutscene,
                },
            })

            turn0CutsceneTrigger = {
                cutsceneId: "introductory cutscene",
                triggeringEvent: TriggeringEvent.START_OF_TURN,
                systemReactedToTrigger: false,
                turn: 0,
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
                        cutsceneTriggers: [turn0CutsceneTrigger],
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
                MissionCutsceneService.findCutsceneTriggersToActivateOnStartOfPhase(
                    {
                        gameEngineState: turn0State,
                        battleOrchestratorModeThatJustCompleted:
                            BattleOrchestratorMode.INITIALIZED,
                    }
                )
            expect(info).toStrictEqual([turn0CutsceneTrigger])

            let info2 =
                MissionCutsceneService.findCutsceneTriggersToActivateOnStartOfPhase(
                    {
                        gameEngineState: turn0State,
                        battleOrchestratorModeThatJustCompleted:
                            BattleOrchestratorMode.PHASE_CONTROLLER,
                    }
                )
            expect(info2).toStrictEqual([turn0CutsceneTrigger])
        })

        it("will remove phase 0 cutscene triggers", () => {
            let info =
                MissionCutsceneService.findCutsceneTriggersToActivateOnStartOfPhase(
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
                MissionCutsceneService.findCutsceneTriggersToActivateOnStartOfPhase(
                    {
                        gameEngineState: turn0State,
                        battleOrchestratorModeThatJustCompleted:
                            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP,
                    }
                )

            expect(info).toHaveLength(0)
        })
    })

    describe("CutsceneTriggers based on SquaddieSquaddieResult", () => {
        let listener: CutsceneMessageListener
        let cutsceneCollection: MissionCutsceneCollection

        beforeEach(() => {
            listener = new CutsceneMessageListener("cutsceneMessageListener")
        })

        describe("Squaddie Is Injured Cutscene Trigger (via BattleAction)", () => {
            let targetWasInjuredContext: BattleActionActorContext
            let gameEngineStateWithInjuryCutscene: GameEngineState
            let injuredCutsceneTrigger: SquaddieIsInjuredTrigger
            const injuredCutsceneId = "injured"
            const injuredBattleSquaddieId = "injured_battle_squaddie"
            const injuredSquaddieTemplateId = "injuredSquaddieTemplate"

            const differentBattleSquaddieId = "different_battle_squaddie"
            const differentSquaddieTemplateId = "differentSquaddieTemplate"

            const attackingBattleSquaddieId = "attacker"
            const attackerSquaddieTemplateId = "attackerSquaddieTemplate"

            const differentSquaddieBattleId = "differentSquaddieBattleId"

            beforeEach(() => {
                mockCutscene = CutsceneService.new({})
                cutsceneCollection = MissionCutsceneCollectionHelper.new({
                    cutsceneById: {
                        [injuredCutsceneId]: mockCutscene,
                    },
                })

                injuredCutsceneTrigger = {
                    triggeringEvent: TriggeringEvent.SQUADDIE_IS_INJURED,
                    cutsceneId: injuredCutsceneId,
                    systemReactedToTrigger: false,
                    battleSquaddieIds: [injuredBattleSquaddieId],
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
                                cutsceneTriggers: [],
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
                    "findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction"
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
                gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                    injuredCutsceneTrigger
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
                    MissionCutsceneService.findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithInjuryCutscene,
                            squaddieChanges: [battleActionSquaddieChange],
                            objectRepository:
                                gameEngineStateWithInjuryCutscene.repository,
                        }
                    )
                ).toEqual([injuredCutsceneTrigger])
            })

            it("will not fire the cutscene if the squaddie is not injured", () => {
                gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                    injuredCutsceneTrigger
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
                    MissionCutsceneService.findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
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
                gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                    injuredCutsceneTrigger
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
                    targetBattleSquaddieId: differentSquaddieBattleId,
                    netDamage: 0,
                })

                expect(
                    MissionCutsceneService.findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
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
                        name: "will fire if no turns are specified",
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
                            cutsceneTriggerWithTurns: injuredCutsceneTrigger,
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
                            ? [injuredCutsceneTrigger]
                            : []

                        expect(
                            MissionCutsceneService.findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
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
            let deadBattleSquaddieCutsceneTrigger: SquaddieIsDefeatedTrigger
            const deadBattleSquaddieCutsceneId =
                "squaddie dead by battle squaddie"
            let deadSquaddieTemplateCutsceneTrigger: SquaddieIsDefeatedTrigger
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

                deadBattleSquaddieCutsceneTrigger = {
                    triggeringEvent: TriggeringEvent.SQUADDIE_IS_DEFEATED,
                    cutsceneId: deadBattleSquaddieCutsceneId,
                    systemReactedToTrigger: false,
                    battleSquaddieIds: [deadBattleSquaddieId],
                    squaddieTemplateIds: [],
                }

                deadSquaddieTemplateCutsceneTrigger = {
                    triggeringEvent: TriggeringEvent.SQUADDIE_IS_DEFEATED,
                    cutsceneId: deadSquaddieTemplateCutsceneId,
                    systemReactedToTrigger: false,
                    battleSquaddieIds: [],
                    squaddieTemplateIds: [deadSquaddieTemplateId],
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
                                cutsceneTriggers: [],
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
                    "findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction"
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
                gameEngineStateWithDefeatCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                    deadBattleSquaddieCutsceneTrigger
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
                    MissionCutsceneService.findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithDefeatCutscene,
                            squaddieChanges: [battleActionSquaddieChange],
                            objectRepository:
                                gameEngineStateWithDefeatCutscene.repository,
                        }
                    )
                ).toEqual([deadBattleSquaddieCutsceneTrigger])
            })

            it("will not fire the cutscene if the squaddie does not die", () => {
                gameEngineStateWithDefeatCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                    deadBattleSquaddieCutsceneTrigger
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
                    MissionCutsceneService.findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
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
                gameEngineStateWithDefeatCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                    deadSquaddieTemplateCutsceneTrigger
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
                    MissionCutsceneService.findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithDefeatCutscene,
                            squaddieChanges: [battleActionSquaddieChange],
                            objectRepository:
                                gameEngineStateWithDefeatCutscene.repository,
                        }
                    )
                ).toEqual([deadSquaddieTemplateCutsceneTrigger])
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
                        name: "will fire if no turns are specified",
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
                            cutsceneTriggerWithTurns:
                                deadBattleSquaddieCutsceneTrigger,
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
                            ? [deadBattleSquaddieCutsceneTrigger]
                            : []

                        expect(
                            MissionCutsceneService.findCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
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
    cutsceneTriggerWithTurns,
}: {
    minimumTurns: number
    maximumTurns: number
    turnCount: number
    gameEngineState: GameEngineState
    cutsceneTriggerWithTurns: CutsceneTrigger & {
        minimumTurns?: number
        maximumTurns?: number
    }
}) => {
    cutsceneTriggerWithTurns.minimumTurns = minimumTurns
    cutsceneTriggerWithTurns.maximumTurns = maximumTurns
    gameEngineState.battleOrchestratorState.battleState.battlePhaseState = {
        turnCount,
        currentAffiliation: BattlePhase.PLAYER,
    }

    gameEngineState.battleOrchestratorState.battleState.cutsceneTriggers.push(
        cutsceneTriggerWithTurns
    )
}
