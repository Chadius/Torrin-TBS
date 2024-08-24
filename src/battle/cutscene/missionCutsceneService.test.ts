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
    MissionDefeatCutsceneTrigger,
    SquaddieIsInjuredTrigger,
    TriggeringEvent,
} from "../../cutscene/cutsceneTrigger"
import { BattleCompletionStatus } from "../orchestrator/missionObjectivesAndCutscenes"
import { MissionVictoryCutsceneTrigger } from "./missionVictoryCutsceneTrigger"
import {
    CutsceneMessageListener,
    FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat,
    MissionCutsceneService,
} from "./missionCutsceneService"
import { MissionStartOfPhaseCutsceneTrigger } from "./missionStartOfPhaseCutsceneTrigger"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { MissionConditionType } from "../missionResult/missionCondition"
import { MissionMap } from "../../missionMap/missionMap"
import { BattleStateService } from "../orchestrator/battleState"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    SquaddieSquaddieResults,
    SquaddieSquaddieResultsService,
} from "../history/squaddieSquaddieResults"
import { DegreeOfSuccess } from "../actionCalculator/degreeOfSuccess"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import { DecidedActionSquaddieEffectService } from "../../action/decided/decidedActionSquaddieEffect"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { BattleActionSquaddieChangeService } from "../history/battleActionSquaddieChange"
import { BattleActionActionContextService } from "../history/battleAction"

describe("Mission Cutscene Service", () => {
    let mockCutscene: Cutscene
    let cutsceneCollection: MissionCutsceneCollection

    let victoryState: GameEngineState
    let defeatState: GameEngineState
    let victoryAndDefeatState: GameEngineState
    let victoryCutsceneTrigger: MissionVictoryCutsceneTrigger
    let defeatCutsceneTrigger: MissionDefeatCutsceneTrigger

    let turn0State: GameEngineState
    let turn0StateCutsceneId = "starting"
    let turn0CutsceneTrigger: MissionStartOfPhaseCutsceneTrigger

    beforeEach(() => {
        mockCutscene = CutsceneService.new({})
        cutsceneCollection = MissionCutsceneCollectionHelper.new({
            cutsceneById: {
                [DEFAULT_VICTORY_CUTSCENE_ID]: mockCutscene,
                [DEFAULT_DEFEAT_CUTSCENE_ID]: mockCutscene,
                [turn0StateCutsceneId]: mockCutscene,
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
                    missionMap: new MissionMap({
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
                    missionMap: new MissionMap({
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

        victoryAndDefeatState = GameEngineStateService.new({
            repository: undefined,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: new MissionMap({
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

        turn0CutsceneTrigger = {
            cutsceneId: "starting",
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
                    missionMap: new MissionMap({
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

    describe("will check for victory conditions once the squaddie finishes action", () => {
        const modes = [
            { mode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE },
            { mode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP },
            { mode: BattleOrchestratorMode.SQUADDIE_MOVER },
        ]

        it.each(modes)(
            `mode $mode will look for victory conditions`,
            ({ mode }) => {
                const missionObjectiveCompleteCheck = jest
                    .spyOn(MissionObjectiveHelper, "shouldBeComplete")
                    .mockReturnValue(true)
                expect(
                    victoryState.battleOrchestratorState.battleState
                        .battleCompletionStatus
                ).toBe(BattleCompletionStatus.IN_PROGRESS)

                const info =
                    FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
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
        const info = FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
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
        const info = FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
            victoryState,
            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
        )

        expect(info).toHaveLength(0)
    })

    it("will check for defeat conditions once the squaddie finishes moving", () => {
        const missionObjectiveCompleteCheck = jest
            .spyOn(MissionObjectiveHelper, "shouldBeComplete")
            .mockReturnValue(true)
        expect(
            defeatState.battleOrchestratorState.battleState
                .battleCompletionStatus
        ).toBe(BattleCompletionStatus.IN_PROGRESS)

        const info = FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
            defeatState,
            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
        )

        expect(missionObjectiveCompleteCheck).toBeCalled()

        expect(info).toStrictEqual([defeatCutsceneTrigger])
    })

    it("if you trigger victory and defeat, defeat takes precedence", () => {
        const missionObjectiveCompleteCheck = jest
            .spyOn(MissionObjectiveHelper, "shouldBeComplete")
            .mockReturnValue(true)
        expect(
            victoryAndDefeatState.battleOrchestratorState.battleState
                .battleCompletionStatus
        ).toBe(BattleCompletionStatus.IN_PROGRESS)

        const info = FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
            defeatState,
            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
        )

        expect(missionObjectiveCompleteCheck).toBeCalled()

        expect(info).toStrictEqual([defeatCutsceneTrigger])
    })

    it("will check for any introductory cutscenes during turn 0", () => {
        let info = FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
            turn0State,
            BattleOrchestratorMode.INITIALIZED
        )
        expect(info).toStrictEqual([turn0CutsceneTrigger])

        let info2 = FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
            turn0State,
            BattleOrchestratorMode.PHASE_CONTROLLER
        )
        expect(info2).toStrictEqual([turn0CutsceneTrigger])
    })

    it("will not check for any turn starting cutscenes mid turn", () => {
        const info = FindCutsceneTriggersToActivateBasedOnVictoryAndDefeat(
            turn0State,
            BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
        )

        expect(info).toHaveLength(0)
    })

    describe("CutsceneTriggers based on SquaddieSquaddieResults", () => {
        let listener: CutsceneMessageListener
        beforeEach(() => {
            listener = new CutsceneMessageListener("cutsceneMessageListener")
        })

        describe("Squaddie Is Injured Cutscene Trigger", () => {
            let targetWasInjuredResult: SquaddieSquaddieResults
            let gameEngineStateWithInjuryCutscene: GameEngineState
            let injuredCutsceneTrigger: SquaddieIsInjuredTrigger
            const injuredCutsceneId = "injured"
            const injuredBattleSquaddieId = "injured_battle_squaddie"

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
                    battleSquaddieIdsToCheckForInjury: [
                        injuredBattleSquaddieId,
                    ],
                }

                targetWasInjuredResult = SquaddieSquaddieResultsService.new({
                    actingBattleSquaddieId: "attacker",
                    actionContext: BattleActionActionContextService.new({
                        actingSquaddieModifiers: undefined,
                        actingSquaddieRoll: undefined,
                    }),
                    squaddieChanges: [],
                    targetedBattleSquaddieIds: [injuredBattleSquaddieId],
                })

                const actionsThisRound: ActionsThisRound =
                    ActionsThisRoundService.new({
                        battleSquaddieId:
                            targetWasInjuredResult.actingBattleSquaddieId,
                        startingLocation: { q: 0, r: 0 },
                        processedActions: [
                            ProcessedActionService.new({
                                decidedAction: undefined,
                                processedActionEffects: [
                                    ProcessedActionSquaddieEffectService.new({
                                        results: targetWasInjuredResult,
                                        decidedActionEffect:
                                            DecidedActionSquaddieEffectService.new(
                                                {
                                                    template: undefined,
                                                    target: undefined,
                                                }
                                            ),
                                    }),
                                ],
                            }),
                        ],
                    })

                gameEngineStateWithInjuryCutscene = GameEngineStateService.new({
                    repository: undefined,
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                missionMap: new MissionMap({
                                    terrainTileMap: TerrainTileMapService.new({
                                        movementCost: ["1 1 "],
                                    }),
                                }),
                                cutsceneCollection,
                                cutsceneTriggers: [],
                                actionsThisRound,
                            }),
                        }
                    ),
                })
            })

            it("will listen to a squaddie injured message", () => {
                gameEngineStateWithInjuryCutscene.messageBoard.addListener(
                    listener,
                    MessageBoardMessageType.SQUADDIE_IS_INJURED
                )

                const finderSpy = jest.spyOn(
                    MissionCutsceneService,
                    "FindCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction"
                )
                gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                    injuredCutsceneTrigger
                )
                targetWasInjuredResult.squaddieChanges.push(
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: injuredBattleSquaddieId,
                        damageTaken: 2,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    })
                )
                gameEngineStateWithInjuryCutscene.messageBoard.sendMessage({
                    type: MessageBoardMessageType.SQUADDIE_IS_INJURED,
                    gameEngineState: gameEngineStateWithInjuryCutscene,
                    battleSquaddieIdsThatWereInjured: [],
                })
                expect(finderSpy).toBeCalled()

                expect(
                    gameEngineStateWithInjuryCutscene.battleOrchestratorState
                        .cutsceneIdsToPlay
                ).toEqual([injuredCutsceneId])
                finderSpy.mockRestore()
            })

            it("will fire the cutscene if it gets a squaddie is injured without a turn limit", () => {
                gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                    injuredCutsceneTrigger
                )

                targetWasInjuredResult.squaddieChanges.push(
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: injuredBattleSquaddieId,
                        damageTaken: 2,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    })
                )
                expect(
                    MissionCutsceneService.FindCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithInjuryCutscene,
                            squaddieSquaddieResult: targetWasInjuredResult,
                        }
                    )
                ).toEqual([injuredCutsceneTrigger])
            })

            it("will not fire the cutscene if the squaddie is not injured", () => {
                gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                    injuredCutsceneTrigger
                )

                targetWasInjuredResult.squaddieChanges.push(
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: injuredBattleSquaddieId,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    })
                )
                expect(
                    MissionCutsceneService.FindCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithInjuryCutscene,
                            squaddieSquaddieResult: targetWasInjuredResult,
                        }
                    )
                ).toHaveLength(0)
            })

            it("will not fire the cutscene if it gets a squaddie is injured event on a different squaddie", () => {
                gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                    injuredCutsceneTrigger
                )

                targetWasInjuredResult.squaddieChanges.push(
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "different squaddie id",
                        damageTaken: 2,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    })
                )

                expect(
                    MissionCutsceneService.FindCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
                        {
                            gameEngineState: gameEngineStateWithInjuryCutscene,
                            squaddieSquaddieResult: targetWasInjuredResult,
                        }
                    )
                ).toHaveLength(0)
            })

            describe("turn boundary", () => {
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
                        name,
                        minimumTurns,
                        maximumTurns,
                        turnCount,
                        expectsTriggers,
                    }) => {
                        injuredCutsceneTrigger.minimumTurns = minimumTurns
                        injuredCutsceneTrigger.maximumTurns = maximumTurns
                        gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.battlePhaseState =
                            {
                                turnCount,
                                currentAffiliation: BattlePhase.PLAYER,
                            }

                        gameEngineStateWithInjuryCutscene.battleOrchestratorState.battleState.cutsceneTriggers.push(
                            injuredCutsceneTrigger
                        )

                        targetWasInjuredResult.squaddieChanges.push(
                            BattleActionSquaddieChangeService.new({
                                battleSquaddieId: injuredBattleSquaddieId,
                                damageTaken: 2,
                                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                            })
                        )

                        const expectedTriggers = expectsTriggers
                            ? [injuredCutsceneTrigger]
                            : []

                        expect(
                            MissionCutsceneService.FindCutsceneTriggersToActivateBasedOnSquaddieSquaddieAction(
                                {
                                    gameEngineState:
                                        gameEngineStateWithInjuryCutscene,
                                    squaddieSquaddieResult:
                                        targetWasInjuredResult,
                                }
                            )
                        ).toEqual(expectedTriggers)
                    }
                )
            })
        })
    })
})
