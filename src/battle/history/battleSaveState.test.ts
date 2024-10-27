import {
    BattleSaveState,
    BattleSaveStateService,
    DefaultBattleSaveState,
    InBattleAttributesAndTurn,
} from "./battleSaveState"
import { BattleCamera } from "../battleCamera"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../orchestrator/battleOrchestratorState"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { MissionMap } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { NullMissionMap } from "../../utils/test/battleOrchestratorState"
import {
    MissionStatistics,
    MissionStatisticsService,
} from "../missionStatistics/missionStatistics"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { SquaddieTurnService } from "../../squaddie/turn"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { DefaultArmyAttributes } from "../../squaddie/armyAttributes"
import { DamageType } from "../../squaddie/squaddieService"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { TeamStrategy, TeamStrategyType } from "../teamStrategy/teamStrategy"
import { MissionCompletionStatus } from "../missionResult/missionCompletionStatus"
import {
    CutsceneTrigger,
    TriggeringEvent,
} from "../../cutscene/cutsceneTrigger"
import { BattleStateService } from "../orchestrator/battleState"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "./battleAction/battleActionSquaddieChange"
import { BattleAction, BattleActionService } from "./battleAction/battleAction"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { BattleActionsDuringTurnService } from "./battleAction/battleActionsDuringTurn"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "./battleAction/battleActionRecorder"
import { BattleActionActionContextService } from "./battleAction/battleActionActionContext"

describe("BattleSaveState", () => {
    let battleActionRecorder: BattleActionRecorder
    let firstBattleAction: BattleAction
    let missionStatistics: MissionStatistics
    let originalSquaddieRepository: ObjectRepository
    let newSquaddieRepository: ObjectRepository
    let player0BattleSquaddie: BattleSquaddie
    let enemy0BattleSquaddieWithWoundsAndTurnEnded: BattleSquaddie
    let playerTeam: BattleSquaddieTeam
    let enemyTeam: BattleSquaddieTeam

    beforeEach(() => {
        battleActionRecorder = BattleActionRecorderService.new()

        const actionTemplate: ActionTemplate = ActionTemplateService.new({
            actionPoints: 1,
            name: "attack",
            id: "attackId",
        })

        firstBattleAction = BattleActionService.new({
            actor: {
                actorBattleSquaddieId: "actor 1",
                actorContext: BattleActionActionContextService.new({
                    actingSquaddieRoll: {
                        occurred: true,
                        rolls: [3, 5],
                    },
                    actingSquaddieModifiers: [],
                }),
            },
            action: { actionTemplateId: actionTemplate.id },
            effect: {
                squaddie: [
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "target 0",
                        damageExplanation: DamageExplanationService.new({
                            net: 2,
                        }),
                        healingReceived: 0,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    }),
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "target 0",
                        damageExplanation: DamageExplanationService.new({
                            net: 1,
                        }),
                        healingReceived: 3,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    }),
                ],
            },
        })
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleActionRecorder,
            firstBattleAction
        )
        BattleActionRecorderService.battleActionFinishedAnimating(
            battleActionRecorder
        )

        missionStatistics = MissionStatisticsService.new({
            timeElapsedInMilliseconds: 9001,
            damageDealtByPlayerTeam: 42,
            damageTakenByPlayerTeam: 101,
            healingReceivedByPlayerTeam: 314,
        })

        const player0SquaddieTemplate: SquaddieTemplate =
            SquaddieTemplateService.new({
                squaddieId: {
                    affiliation: SquaddieAffiliation.PLAYER,
                    name: "player 0",
                    templateId: "player template 0",
                    traits: { booleanTraits: {} },
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                },
                attributes: DefaultArmyAttributes(),
            })

        player0BattleSquaddie = BattleSquaddieService.newBattleSquaddie({
            battleSquaddieId: "player battle 0",
            squaddieTemplateId: "player template 0",
            squaddieTurn: SquaddieTurnService.new(),
        })

        playerTeam = BattleSquaddieTeamService.new({
            id: "playerTeamId",
            affiliation: SquaddieAffiliation.PLAYER,
            name: "Player Team",
            battleSquaddieIds: ["player battle 0"],
            iconResourceKey: "icon_player_team",
        })

        const enemy0SquaddieTemplate: SquaddieTemplate =
            SquaddieTemplateService.new({
                squaddieId: {
                    affiliation: SquaddieAffiliation.ENEMY,
                    name: "enemy 0",
                    templateId: "enemy template 0",
                    traits: { booleanTraits: {} },
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                },
                attributes: {
                    ...DefaultArmyAttributes(),
                    maxHitPoints: 5,
                },
            })

        const finishedTurn = SquaddieTurnService.new()
        SquaddieTurnService.endTurn(finishedTurn)
        enemy0BattleSquaddieWithWoundsAndTurnEnded =
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "enemy battle 0",
                squaddieTemplateId: "enemy template 0",
                squaddieTurn: finishedTurn,
            })

        enemyTeam = {
            id: "enemyTeamId",
            affiliation: SquaddieAffiliation.ENEMY,
            name: "Enemy Team",
            battleSquaddieIds: ["enemy battle 0"],
            iconResourceKey: "icon_enemy_team",
        }

        originalSquaddieRepository = ObjectRepositoryService.new()
        ObjectRepositoryService.addSquaddieTemplate(
            originalSquaddieRepository,
            player0SquaddieTemplate
        )
        ObjectRepositoryService.addBattleSquaddie(
            originalSquaddieRepository,
            player0BattleSquaddie
        )
        ObjectRepositoryService.addSquaddieTemplate(
            originalSquaddieRepository,
            enemy0SquaddieTemplate
        )
        ObjectRepositoryService.addBattleSquaddie(
            originalSquaddieRepository,
            enemy0BattleSquaddieWithWoundsAndTurnEnded
        )
        InBattleAttributesService.takeDamage({
            inBattleAttributes:
                enemy0BattleSquaddieWithWoundsAndTurnEnded.inBattleAttributes,
            damageToTake: 1,
            damageType: DamageType.UNKNOWN,
        })

        newSquaddieRepository = ObjectRepositoryService.new()
        ObjectRepositoryService.addSquaddieTemplate(
            newSquaddieRepository,
            player0SquaddieTemplate
        )
        ObjectRepositoryService.addBattleSquaddie(
            newSquaddieRepository,
            player0BattleSquaddie
        )
        ObjectRepositoryService.addSquaddieTemplate(
            newSquaddieRepository,
            enemy0SquaddieTemplate
        )

        const enemy0BattleSquaddieWithNewTurn =
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "enemy battle 0",
                squaddieTemplateId: "enemy template 0",
                squaddieTurn: SquaddieTurnService.new(),
                inBattleAttributes: InBattleAttributesService.new({
                    armyAttributes: {
                        ...DefaultArmyAttributes(),
                        maxHitPoints: 5,
                    },
                }),
            })
        ObjectRepositoryService.addBattleSquaddie(
            newSquaddieRepository,
            enemy0BattleSquaddieWithNewTurn
        )
    })

    it("Records the mission Id", () => {
        const saveState: BattleSaveState = {
            ...DefaultBattleSaveState(),
            missionId: "123-a",
        }
        expect(saveState.missionId).toBe("123-a")
    })

    it("Records the campaign Id", () => {
        const saveState: BattleSaveState = {
            ...DefaultBattleSaveState(),
            campaignId: "the campaign id",
        }
        expect(saveState.campaignId).toBe("the campaign id")
    })

    it("Can read the camera and create a similar one", () => {
        const battleState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                camera: new BattleCamera(100, 200),
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        })

        const saveState: BattleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                campaignId: "test campaign",
                missionId: "test",
                saveVersion: "SAVE_VERSION",
                battleOrchestratorState: battleState,
                repository: ObjectRepositoryService.new(),
            })

        expect(saveState.camera.xCoordinate).toBe(100)
        expect(saveState.camera.yCoordinate).toBe(200)

        const newBattleState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: NullMissionMap(),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            })
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository,
        })
        const newCameraCoordinates =
            newBattleState.battleState.camera.getCoordinates()
        expect(newCameraCoordinates).toEqual({ cameraX: 100, cameraY: 200 })
        expect(
            newBattleState.battleState.camera.mapDimensionBoundaries
        ).toEqual(
            TerrainTileMapService.getDimensions(NullMissionMap().terrainTileMap)
        )
    })

    it("Can read the battle phase and create a similar one", () => {
        const battleState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 3,
                },
            }),
        })

        const saveState: BattleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                campaignId: "test campaign",
                missionId: "test",
                saveVersion: "SAVE_VERSION",
                battleOrchestratorState: battleState,
                repository: ObjectRepositoryService.new(),
            })
        expect(saveState.battlePhaseState.turnCount).toBe(3)

        const newBattleState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: NullMissionMap(),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.PLAYER,
                    },
                }),
            })
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository,
        })
        expect(
            newBattleState.battleState.battlePhaseState.currentAffiliation
        ).toBe(BattlePhase.PLAYER)
        expect(newBattleState.battleState.battlePhaseState.turnCount).toBe(3)
    })

    it("Can read the event recording and create a similar one", () => {
        const secondBattleAction = BattleActionService.new({
            actor: { actorBattleSquaddieId: "actor 2" },
            action: { isEndTurn: true },
            effect: { endTurn: true },
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleActionRecorder,
            secondBattleAction
        )
        BattleActionRecorderService.battleActionFinishedAnimating(
            battleActionRecorder
        )

        const battleState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap: NullMissionMap(),
                battleActionRecorder: battleActionRecorder,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        })

        const saveState: BattleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                campaignId: "test campaign",
                missionId: "test",
                saveVersion: "SAVE_VERSION",
                battleOrchestratorState: battleState,
                repository: ObjectRepositoryService.new(),
            })
        expect(
            saveState.battleActionRecorder.actionsAlreadyAnimatedThisTurn
                .battleActions
        ).toHaveLength(2)

        const newBattleState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: NullMissionMap(),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            })
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository,
        })
        expect(
            newBattleState.battleState.battleActionRecorder
                .actionsAlreadyAnimatedThisTurn.battleActions
        ).toHaveLength(2)
        const allActions = BattleActionsDuringTurnService.getAll(
            newBattleState.battleState.battleActionRecorder
                .actionsAlreadyAnimatedThisTurn
        )
        expect(allActions[0]).toStrictEqual(firstBattleAction)
        expect(allActions[1]).toStrictEqual(secondBattleAction)

        expect(
            BattleActionRecorderService.mostRecentAnimatedActionThisTurn(
                newBattleState.battleState.battleActionRecorder
            )
        ).toStrictEqual(secondBattleAction)
    })

    it("Can read the squaddie placement on a mission map and create a similar one", () => {
        const missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 2 - x "],
            }),
        })

        missionMap.addSquaddie("template 0", "battle 0", { q: 0, r: 0 })
        missionMap.addSquaddie("template 1", "battle 1", { q: 0, r: 1 })

        const battleState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap: missionMap,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        })

        const saveState: BattleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                campaignId: "test campaign",
                missionId: "test",
                saveVersion: "SAVE_VERSION",
                battleOrchestratorState: battleState,
                repository: ObjectRepositoryService.new(),
            })
        expect(saveState.squaddieMapPlacements).toHaveLength(2)

        const newBattleState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: new MissionMap({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 2 - x "],
                        }),
                    }),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            })
        newBattleState.battleState.missionMap.addSquaddie(
            "template 0",
            "battle 0",
            { q: 0, r: 2 }
        )
        newBattleState.battleState.missionMap.addSquaddie(
            "template 1",
            "battle 1",
            { q: 0, r: 3 }
        )

        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository,
        })

        expect(
            TerrainTileMapService.getDimensions(
                newBattleState.battleState.missionMap.terrainTileMap
            )
        ).toStrictEqual({
            widthOfWidestRow: 4,
            numberOfRows: 1,
        })
        expect(
            newBattleState.battleState.missionMap.getSquaddieByBattleId(
                "battle 0"
            )
        ).toStrictEqual({
            battleSquaddieId: "battle 0",
            squaddieTemplateId: "template 0",
            mapLocation: { q: 0, r: 0 },
        })
        expect(
            newBattleState.battleState.missionMap.getSquaddieByBattleId(
                "battle 1"
            )
        ).toStrictEqual({
            battleSquaddieId: "battle 1",
            squaddieTemplateId: "template 1",
            mapLocation: { q: 0, r: 1 },
        })
    })

    it("can record mission statistics and create a similar one", () => {
        const battleState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionStatistics,
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        })

        const saveState: BattleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                campaignId: "test campaign",
                missionId: "test",
                saveVersion: "SAVE_VERSION",
                battleOrchestratorState: battleState,
                repository: ObjectRepositoryService.new(),
            })

        expect(saveState.missionStatistics.timeElapsedInMilliseconds).toBe(9001)
        expect(saveState.missionStatistics).toStrictEqual(missionStatistics)

        const newBattleState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: NullMissionMap(),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            })
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository,
        })
        expect(newBattleState.battleState.missionStatistics).toStrictEqual(
            missionStatistics
        )
    })

    it("can record squaddies in battle attributes create a similar ones in a repository", () => {
        const battleState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        })

        const saveState: BattleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                campaignId: "test campaign",
                missionId: "test",
                saveVersion: "SAVE_VERSION",
                battleOrchestratorState: battleState,
                repository: originalSquaddieRepository,
            })
        expect(
            Object.keys(saveState.inBattleAttributesBySquaddieBattleId)
        ).toHaveLength(2)

        const newBattleState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: NullMissionMap(),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            })
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository,
        })
        expect(
            ObjectRepositoryService.getBattleSquaddieIterator(
                newSquaddieRepository
            )
        ).toHaveLength(2)
        const { squaddieTemplate: enemyTemplate, battleSquaddie: enemyBattle } =
            getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    newSquaddieRepository,
                    "enemy battle 0"
                )
            )
        expect(enemyTemplate.squaddieId.templateId).toBe("enemy template 0")
        expect(
            SquaddieTurnService.hasActionPointsRemaining(
                enemyBattle.squaddieTurn
            )
        ).toBeFalsy()
        expect(enemyBattle.inBattleAttributes.currentHitPoints).toBe(4)
    })

    it("can record the squaddie teams from the Battle Orchestrator State and recreate them", () => {
        const teams: BattleSquaddieTeam[] = [playerTeam, enemyTeam]
        const battleState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap: NullMissionMap(),
                teams,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        })

        const saveState: BattleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                campaignId: "test campaign",
                missionId: "test",
                saveVersion: "SAVE_VERSION",
                battleOrchestratorState: battleState,
                repository: ObjectRepositoryService.new(),
            })
        expect(saveState.teams).toEqual(teams)

        const newBattleState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: NullMissionMap(),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            })
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository,
        })

        expect(newBattleState.battleState.teams).toEqual(
            expect.arrayContaining(teams)
        )
    })

    it("can record the TeamStrategy data used from the Battle Orchestrator and recreate them", () => {
        const teamStrategiesById: { [teamId: string]: TeamStrategy[] } = {
            "badguys chase and attack player": [
                {
                    type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                    options: {
                        desiredAffiliation: SquaddieAffiliation.PLAYER,
                    },
                },
                {
                    type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                    options: {
                        desiredAffiliation: SquaddieAffiliation.PLAYER,
                    },
                },
            ],
            "allies follow player leader": [
                {
                    type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                    options: {
                        desiredBattleSquaddieId: "player leader",
                    },
                },
            ],
            "Unaffiliated do nothing": [],
        }
        const battleState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap: NullMissionMap(),
                teamStrategiesById,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        })

        const saveState: BattleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                campaignId: "test campaign",
                missionId: "test",
                saveVersion: "SAVE_VERSION",
                battleOrchestratorState: battleState,
                repository: ObjectRepositoryService.new(),
            })
        expect(saveState.teamStrategiesById).toEqual(teamStrategiesById)

        const newBattleState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: NullMissionMap(),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            })
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository,
        })
        expect(
            newBattleState.battleState.teamStrategiesById[
                "badguys chase and attack player"
            ]
        ).toEqual(teamStrategiesById["badguys chase and attack player"])
        expect(
            newBattleState.battleState.teamStrategiesById[
                "allies follow player leader"
            ]
        ).toEqual(teamStrategiesById["allies follow player leader"])
        expect(
            newBattleState.battleState.teamStrategiesById[
                "Unaffiliated do nothing"
            ]
        ).toEqual(teamStrategiesById["Unaffiliated do nothing"])
    })

    it("can record the mission completion status", () => {
        const missionCompletionStatus: MissionCompletionStatus = {
            victory: {
                isComplete: undefined,
                conditions: {
                    "defeat all enemies": undefined,
                },
            },
            defeat: {
                isComplete: undefined,
                conditions: {
                    "defeat all players": undefined,
                },
            },
        }

        const originalOrchestratorState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.defaultBattleState({
                campaignId: "test campaign",
                missionId: "test",
                missionCompletionStatus,
            }),
        })

        const battleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                battleOrchestratorState: originalOrchestratorState,
                repository: originalSquaddieRepository,
                missionId: "test mission",
                campaignId: "test campaign",
                saveVersion: "9001",
            })

        expect(battleSaveState.missionCompletionStatus).toEqual(
            missionCompletionStatus
        )

        const newOrchestratorState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap: NullMissionMap(),
            }),
        })
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleOrchestratorState: newOrchestratorState,
            squaddieRepository: originalSquaddieRepository,
            battleSaveState,
        })

        expect(
            newOrchestratorState.battleState.missionCompletionStatus
        ).toEqual(originalOrchestratorState.battleState.missionCompletionStatus)
    })

    it("updates the completion status on the cutscene triggers", () => {
        const triggers: CutsceneTrigger[] = [
            {
                cutsceneId: "victory",
                triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                systemReactedToTrigger: false,
            },
            {
                cutsceneId: "introduction",
                triggeringEvent: TriggeringEvent.START_OF_TURN,
                systemReactedToTrigger: true,
            },
        ]

        const battleState = BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap: NullMissionMap(),
                cutsceneTriggers: triggers,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        })

        const saveState: BattleSaveState =
            BattleSaveStateService.newUsingBattleOrchestratorState({
                campaignId: "test campaign",
                missionId: "test",
                saveVersion: "SAVE_VERSION",
                battleOrchestratorState: battleState,
                repository: ObjectRepositoryService.new(),
            })
        expect(saveState.cutsceneTriggerCompletion).toEqual(triggers)

        const newBattleState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: NullMissionMap(),
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            })
        BattleSaveStateService.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository,
        })
        expect(
            newBattleState.battleState.cutsceneTriggers.find(
                (c) => c.cutsceneId === "victory"
            ).systemReactedToTrigger
        ).toBeFalsy()
        expect(
            newBattleState.battleState.cutsceneTriggers.find(
                (c) => c.cutsceneId === "introduction"
            ).systemReactedToTrigger
        ).toBeTruthy()
    })

    describe("can serialize", () => {
        let saveData: BattleSaveState
        let newBattleState: BattleOrchestratorState

        beforeEach(() => {
            const inBattleAttributesBySquaddieBattleId: {
                [squaddieBattleId: string]: InBattleAttributesAndTurn
            } = {
                [player0BattleSquaddie.battleSquaddieId]: {
                    inBattleAttributes:
                        player0BattleSquaddie.inBattleAttributes,
                    turn: player0BattleSquaddie.squaddieTurn,
                },
                [enemy0BattleSquaddieWithWoundsAndTurnEnded.battleSquaddieId]: {
                    inBattleAttributes:
                        enemy0BattleSquaddieWithWoundsAndTurnEnded.inBattleAttributes,
                    turn: enemy0BattleSquaddieWithWoundsAndTurnEnded.squaddieTurn,
                },
            }

            saveData = {
                campaignId: "test campaign",
                saveVersion: "90210",
                missionId: "the mission",
                battlePhaseState: {
                    currentPhase: BattlePhase.ALLY,
                    turnCount: 7,
                },
                camera: {
                    xCoordinate: 100,
                    yCoordinate: 200,
                },
                battleActionRecorder: battleActionRecorder,
                inBattleAttributesBySquaddieBattleId:
                    inBattleAttributesBySquaddieBattleId,
                missionStatistics: missionStatistics,
                squaddieMapPlacements: [
                    {
                        battleSquaddieId:
                            player0BattleSquaddie.battleSquaddieId,
                        squaddieTemplateId:
                            player0BattleSquaddie.squaddieTemplateId,
                        mapLocation: { q: 0, r: 0 },
                    },
                    {
                        battleSquaddieId:
                            enemy0BattleSquaddieWithWoundsAndTurnEnded.battleSquaddieId,
                        squaddieTemplateId:
                            enemy0BattleSquaddieWithWoundsAndTurnEnded.squaddieTemplateId,
                        mapLocation: { q: 0, r: 1 },
                    },
                ],
                teams: [playerTeam, enemyTeam],
                teamStrategiesById: {
                    [enemyTeam.id]: [
                        {
                            type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                            options: {
                                desiredAffiliation: SquaddieAffiliation.PLAYER,
                            },
                        },
                        {
                            type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                            options: {
                                desiredAffiliation: SquaddieAffiliation.PLAYER,
                            },
                        },
                    ],
                    "ally team id": [
                        {
                            type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                            options: {
                                desiredBattleSquaddieId: "player leader",
                            },
                        },
                    ],
                },
                missionCompletionStatus: {
                    victory: {
                        isComplete: undefined,
                        conditions: {
                            "defeat all enemies": undefined,
                        },
                    },
                    defeat: {
                        isComplete: undefined,
                        conditions: {
                            "defeat all players": undefined,
                        },
                    },
                },
                cutsceneTriggerCompletion: [
                    {
                        triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                        cutsceneId: "default_victory",
                        systemReactedToTrigger: false,
                    },
                    {
                        triggeringEvent: TriggeringEvent.START_OF_TURN,
                        cutsceneId: "introduction",
                        systemReactedToTrigger: false,
                        turn: 0,
                    },
                ],
            }

            newBattleState = BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: new MissionMap({
                        terrainTileMap: TerrainTileMapService.new({
                            movementCost: ["1 2 - x "],
                        }),
                    }),
                    cutsceneTriggers: [
                        {
                            triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                            cutsceneId: "default_victory",
                            systemReactedToTrigger: false,
                        },
                        {
                            triggeringEvent: TriggeringEvent.START_OF_TURN,
                            cutsceneId: "introduction",
                            systemReactedToTrigger: false,
                            turn: 0,
                        },
                    ],
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            })
            BattleSaveStateService.applySaveStateToOrchestratorState({
                battleSaveState: saveData,
                battleOrchestratorState: newBattleState,
                squaddieRepository: newSquaddieRepository,
            })
        })

        it("can export data to and from JSON", () => {
            const dataString =
                BattleSaveStateService.stringifyBattleSaveStateData(saveData)
            const newSaveData: BattleSaveState =
                BattleSaveStateService.parseJsonIntoBattleSaveStateData(
                    dataString
                )
            expect(newSaveData).toEqual(saveData)
        })

        it("can export save data objects", () => {
            const missionMap = new MissionMap({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 2 - x "],
                }),
            })
            missionMap.addSquaddie("template 0", "battle 0", { q: 0, r: 0 })
            missionMap.addSquaddie("template 1", "battle 1", { q: 0, r: 1 })

            const teamStrategiesById: { [key: string]: TeamStrategy[] } = {
                [enemyTeam.id]: [
                    {
                        type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                        options: {
                            desiredAffiliation: SquaddieAffiliation.PLAYER,
                        },
                    },
                    {
                        type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                        options: {
                            desiredAffiliation: SquaddieAffiliation.PLAYER,
                        },
                    },
                ],
                "ally team": [
                    {
                        type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                        options: {
                            desiredBattleSquaddieId: "player leader",
                        },
                    },
                ],
                "unaffiliated do nothing": [],
            }
            const missionCompletionStatus: MissionCompletionStatus = {
                victory: {
                    isComplete: undefined,
                    conditions: {
                        "defeat all enemies": undefined,
                    },
                },
                defeat: {
                    isComplete: undefined,
                    conditions: {
                        "defeat all players": undefined,
                    },
                },
            }
            const triggers: CutsceneTrigger[] = [
                {
                    cutsceneId: "victory",
                    triggeringEvent: TriggeringEvent.MISSION_VICTORY,
                    systemReactedToTrigger: false,
                },
                {
                    cutsceneId: "introduction",
                    triggeringEvent: TriggeringEvent.START_OF_TURN,
                    systemReactedToTrigger: true,
                },
            ]
            const battleOrchestratorState = BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    camera: new BattleCamera(100, 200),
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 3,
                    },
                    battleActionRecorder,
                    missionMap,
                    missionStatistics,
                    teams: [playerTeam, enemyTeam],
                    teamStrategiesById,
                    missionCompletionStatus,
                    cutsceneTriggers: triggers,
                }),
            })

            const newSaveData: BattleSaveState =
                BattleSaveStateService.newUsingBattleOrchestratorState({
                    campaignId: "This campaign",
                    saveVersion: "9001",
                    missionId: "This mission",
                    battleOrchestratorState,
                    repository: originalSquaddieRepository,
                })

            expect(newSaveData.campaignId).toBe("This campaign")
            expect(newSaveData.missionId).toBe("This mission")
            expect(newSaveData.camera.xCoordinate).toBe(100)
            expect(newSaveData.camera.yCoordinate).toBe(200)
            expect(newSaveData.battlePhaseState.turnCount).toBe(3)
            expect(newSaveData.battlePhaseState.currentPhase).toBe(
                BattlePhase.PLAYER
            )

            expect(newSaveData.squaddieMapPlacements).toHaveLength(2)
            expect(newSaveData.squaddieMapPlacements[0]).toStrictEqual({
                squaddieTemplateId: "template 0",
                battleSquaddieId: "battle 0",
                mapLocation: { q: 0, r: 0 },
            })
            expect(newSaveData.squaddieMapPlacements[1]).toStrictEqual({
                squaddieTemplateId: "template 1",
                battleSquaddieId: "battle 1",
                mapLocation: { q: 0, r: 1 },
            })

            expect(newSaveData.missionStatistics).toStrictEqual(
                missionStatistics
            )
            expect(
                Object.keys(newSaveData.inBattleAttributesBySquaddieBattleId)
            ).toEqual(["player battle 0", "enemy battle 0"])

            expect(newSaveData.teams).toEqual(
                expect.arrayContaining([playerTeam, enemyTeam])
            )

            expect(newSaveData.teams).toEqual(
                expect.arrayContaining([playerTeam, enemyTeam])
            )
            expect(newSaveData.teamStrategiesById).toEqual(teamStrategiesById)

            expect(newSaveData.missionCompletionStatus).toEqual(
                missionCompletionStatus
            )

            expect(newSaveData.cutsceneTriggerCompletion).toEqual(triggers)

            expect(newSaveData.battlePhaseState.turnCount).toBe(
                battleOrchestratorState.battleState.battlePhaseState.turnCount
            )
            expect(newSaveData.battlePhaseState.currentPhase).toBe(
                battleOrchestratorState.battleState.battlePhaseState
                    .currentAffiliation
            )
        })
    })

    it("throws an error if you try to apply an invalid save state", () => {
        const shouldThrowErrorNoSaveStateFound = () => {
            BattleSaveStateService.applySaveStateToOrchestratorState({
                battleOrchestratorState: undefined,
                squaddieRepository: ObjectRepositoryService.new(),
                battleSaveState: undefined,
            })
        }

        expect(() => {
            shouldThrowErrorNoSaveStateFound()
        }).toThrow("no save state found")
    })

    it("throws an error if you try to apply an invalid orchestrator state", () => {
        const shouldThrowErrorNoOrchestratorStateFound = () => {
            BattleSaveStateService.applySaveStateToOrchestratorState({
                battleOrchestratorState: undefined,
                squaddieRepository: ObjectRepositoryService.new(),
                battleSaveState:
                    BattleSaveStateService.newUsingBattleOrchestratorState({
                        campaignId: "test campaign",
                        missionId: "missionId",
                        saveVersion: "0",
                        repository: ObjectRepositoryService.new(),
                        battleOrchestratorState:
                            BattleOrchestratorStateService.new({
                                battleState: BattleStateService.newBattleState({
                                    missionId: "test mission",
                                    campaignId: "test campaign",
                                    camera: new BattleCamera(100, 200),
                                    missionMap: NullMissionMap(),
                                    battlePhaseState: {
                                        turnCount: 0,
                                        currentAffiliation: BattlePhase.UNKNOWN,
                                    },
                                }),
                            }),
                    }),
            })
        }

        expect(() => {
            shouldThrowErrorNoOrchestratorStateFound()
        }).toThrow("no battle orchestrator state found")
    })
})
