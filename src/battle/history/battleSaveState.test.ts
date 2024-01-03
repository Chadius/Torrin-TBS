import {
    BattleSaveState,
    BattleSaveStateHandler,
    DefaultBattleSaveState,
    InBattleAttributesAndTurn
} from "./battleSaveState";
import {BattleCamera} from "../battleCamera";
import {Recording, RecordingHandler} from "./recording";
import {BattleOrchestratorState, BattleOrchestratorStateHelper} from "../orchestrator/battleOrchestratorState";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {BattleEvent} from "./battleEvent";
import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../squaddie/action";
import {Trait} from "../../trait/traitStatusStorage";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "./squaddieActionsForThisRound";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {NullMissionMap} from "../../utils/test/battleOrchestratorState";
import {MissionStatistics} from "../missionStatistics/missionStatistics";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddie, BattleSquaddieHelper} from "../battleSquaddie";
import {SquaddieTurnHandler} from "../../squaddie/turn";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {InBattleAttributesHandler} from "../stats/inBattleAttributes";
import {DefaultArmyAttributes} from "../../squaddie/armyAttributes";
import {DamageType} from "../../squaddie/squaddieService";
import {ActionEffectType} from "../../squaddie/actionEffect";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {TeamStrategy, TeamStrategyType} from "../teamStrategy/teamStrategy";
import {MissionCompletionStatus} from "../missionResult/missionCompletionStatus";
import {CutsceneTrigger, TriggeringEvent} from "../../cutscene/cutsceneTrigger";
import {SAVE_VERSION} from "../../utils/fileHandling/saveFile";
import {BattleStateHelper} from "../orchestrator/battleState";

import {DegreeOfSuccess} from "../actionCalculator/degreeOfSuccess";

describe("BattleSaveState", () => {
    let eventRecording0: Recording;
    let firstBattleEvent: BattleEvent;
    let missionStatistics: MissionStatistics;
    let originalSquaddieRepository: ObjectRepository;
    let newSquaddieRepository: ObjectRepository;
    let player0BattleSquaddie: BattleSquaddie;
    let enemy0BattleSquaddieWithWoundsAndTurnEnded: BattleSquaddie;
    let playerTeam: BattleSquaddieTeam;
    let enemyTeam: BattleSquaddieTeam;

    beforeEach(() => {
        const action: SquaddieSquaddieAction = SquaddieSquaddieActionService.new({
                id: "att",
                name: "attack",
                traits: {
                    booleanTraits: {
                        [Trait.ATTACK]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                    }
                },
                maximumRange: 1,
                minimumRange: 0,
            })
        ;

        const firstSquaddieActions: SquaddieActionsForThisRound = {
            squaddieTemplateId: "actor 1 template",
            battleSquaddieId: "actor 1",
            startingLocation: {q: 1, r: -2},
            actions: [],
        };

        SquaddieActionsForThisRoundHandler.addAction(firstSquaddieActions, {
            type: ActionEffectType.MOVEMENT,
            destination: {q: 2, r: -5},
            numberOfActionPointsSpent: 1,
        });

        SquaddieActionsForThisRoundHandler.addAction(firstSquaddieActions, {
            type: ActionEffectType.SQUADDIE,
            numberOfActionPointsSpent: 1,
            squaddieAction: action,
            targetLocation: {q: 3, r: 4},
        });

        eventRecording0 = {history: []};
        firstBattleEvent = {
            instruction: {
                squaddieActionsForThisRound: firstSquaddieActions,
                currentlySelectedAction: undefined,
                movingBattleSquaddieIds: [],
            },
            results: {
                actingBattleSquaddieId: "actor 1",
                targetedBattleSquaddieIds: ["target 0, target 1"],
                resultPerTarget: {
                    "target 0": {
                        damageTaken: 2,
                        healingReceived: 0,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS
                    },
                    "target 1": {
                        damageTaken: 1,
                        healingReceived: 3,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS
                    },
                },
                actingSquaddieRoll: {
                    occurred: true,
                    rolls: [3, 5],
                },
                actingSquaddieModifiers: {},
            }
        };
        eventRecording0.history.push(
            firstBattleEvent
        );

        missionStatistics = {
            timeElapsedInMilliseconds: 9001,
            damageDealtByPlayerTeam: 42,
            damageTakenByPlayerTeam: 101,
            healingReceivedByPlayerTeam: 314,
        };

        const player0SquaddieTemplate: SquaddieTemplate = {
            squaddieId: {
                affiliation: SquaddieAffiliation.PLAYER,
                name: "player 0",
                templateId: "player template 0",
                traits: {booleanTraits: {}},
                resources: {mapIconResourceKey: "", actionSpritesByEmotion: {}},
            },
            attributes: DefaultArmyAttributes(),
            actions: [],
        };

        player0BattleSquaddie = BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "player battle 0",
            squaddieTemplateId: "player template 0",
            squaddieTurn: SquaddieTurnHandler.new(),
        });

        playerTeam = {
            id: "playerTeamId",
            affiliation: SquaddieAffiliation.PLAYER,
            name: "Player Team",
            battleSquaddieIds: ["player battle 0"],
            iconResourceKey: "icon_player_team",
        }

        const enemy0SquaddieTemplate: SquaddieTemplate = {
            squaddieId: {
                affiliation: SquaddieAffiliation.ENEMY,
                name: "enemy 0",
                templateId: "enemy template 0",
                traits: {booleanTraits: {}},
                resources: {mapIconResourceKey: "", actionSpritesByEmotion: {}},
            },
            attributes: {
                ...DefaultArmyAttributes(),
                maxHitPoints: 5
            },
            actions: [],
        };

        const finishedTurn = SquaddieTurnHandler.new();
        SquaddieTurnHandler.endTurn(finishedTurn);
        enemy0BattleSquaddieWithWoundsAndTurnEnded = BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "enemy battle 0",
            squaddieTemplateId: "enemy template 0",
            squaddieTurn: finishedTurn,
        });

        enemyTeam = {
            id: "enemyTeamId",
            affiliation: SquaddieAffiliation.ENEMY,
            name: "Enemy Team",
            battleSquaddieIds: ["enemy battle 0"],
            iconResourceKey: "icon_enemy_team",
        }

        originalSquaddieRepository = ObjectRepositoryHelper.new();
        ObjectRepositoryHelper.addSquaddieTemplate(originalSquaddieRepository, player0SquaddieTemplate);
        ObjectRepositoryHelper.addBattleSquaddie(originalSquaddieRepository, player0BattleSquaddie);
        ObjectRepositoryHelper.addSquaddieTemplate(originalSquaddieRepository, enemy0SquaddieTemplate);
        ObjectRepositoryHelper.addBattleSquaddie(originalSquaddieRepository, enemy0BattleSquaddieWithWoundsAndTurnEnded);
        InBattleAttributesHandler.takeDamage(enemy0BattleSquaddieWithWoundsAndTurnEnded.inBattleAttributes, 1, DamageType.UNKNOWN);

        newSquaddieRepository = ObjectRepositoryHelper.new();
        ObjectRepositoryHelper.addSquaddieTemplate(newSquaddieRepository, player0SquaddieTemplate);
        ObjectRepositoryHelper.addBattleSquaddie(newSquaddieRepository, player0BattleSquaddie);
        ObjectRepositoryHelper.addSquaddieTemplate(newSquaddieRepository, enemy0SquaddieTemplate);

        const enemy0BattleSquaddieWithNewTurn = BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "enemy battle 0",
            squaddieTemplateId: "enemy template 0",
            squaddieTurn: SquaddieTurnHandler.new(),
            inBattleAttributes: InBattleAttributesHandler.new({
                ...DefaultArmyAttributes(),
                maxHitPoints: 5
            })
        });
        ObjectRepositoryHelper.addBattleSquaddie(newSquaddieRepository, enemy0BattleSquaddieWithNewTurn);
    })

    it('Records the mission Id', () => {
        const saveState: BattleSaveState = {
            ...DefaultBattleSaveState(),
            missionId: "123-a",
        };
        expect(saveState.missionId).toBe("123-a");
    });

    it("Can read the camera and create a similar one", () => {
        const battleState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: ObjectRepositoryHelper.new(),
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                camera: new BattleCamera(100, 200),
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });

        expect(saveState.camera.xCoordinate).toBe(100);
        expect(saveState.camera.yCoordinate).toBe(200);

        const newBattleState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: ObjectRepositoryHelper.new(),
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });
        const newCameraCoordinates = newBattleState.battleState.camera.getCoordinates();
        expect(newCameraCoordinates[0]).toBe(100);
        expect(newCameraCoordinates[1]).toBe(200);
        expect(newBattleState.battleState.camera.mapDimensionBoundaries).toEqual(NullMissionMap().terrainTileMap.getDimensions());
    });

    it("Can read the battle phase and create a similar one", () => {
        const battleState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 3,
                },
            }),
            squaddieRepository: ObjectRepositoryHelper.new(),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });
        expect(saveState.battlePhaseState.turnCount).toBe(3);

        const newBattleState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.PLAYER,
                },
            }),
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });
        expect(newBattleState.battleState.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(newBattleState.battleState.battlePhaseState.turnCount).toBe(3);
    });

    it("Can read the event recording and create a similar one", () => {
        const secondSquaddieActions: SquaddieActionsForThisRound = {
            squaddieTemplateId: "actor 2 template",
            battleSquaddieId: "actor 2",
            startingLocation: {q: 0, r: 4},
            actions: [],
        };

        SquaddieActionsForThisRoundHandler.addAction(secondSquaddieActions, {
            type: ActionEffectType.MOVEMENT,
            destination: {q: 1, r: 6},
            numberOfActionPointsSpent: 3,
        });

        const secondBattleEvent: BattleEvent = {
            instruction: {
                squaddieActionsForThisRound: secondSquaddieActions,
                currentlySelectedAction: undefined,
                movingBattleSquaddieIds: [],
            },
            results: {
                actingBattleSquaddieId: undefined,
                targetedBattleSquaddieIds: [],
                resultPerTarget: {},
                actingSquaddieRoll: {
                    occurred: false,
                    rolls: [],
                },
                actingSquaddieModifiers: {},
            }
        };
        eventRecording0.history.push(
            secondBattleEvent
        );

        const battleState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                recording: eventRecording0,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
            squaddieRepository: ObjectRepositoryHelper.new(),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });
        expect(saveState.battleEventRecording.history).toHaveLength(2);

        const newBattleState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });
        expect(newBattleState.battleState.recording.history).toHaveLength(2);
        expect(newBattleState.battleState.recording.history[0]).toStrictEqual(firstBattleEvent);
        expect(newBattleState.battleState.recording.history[1]).toStrictEqual(secondBattleEvent);
        expect(RecordingHandler.mostRecentEvent(newBattleState.battleState.recording)).toStrictEqual(secondBattleEvent);
    });

    it("Can read the squaddie placement on a mission map and create a similar one", () => {
        const missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 2 - x "]
            })
        });

        missionMap.addSquaddie("template 0", "battle 0", {q: 0, r: 0});
        missionMap.addSquaddie("template 1", "battle 1", {q: 0, r: 1});

        const battleState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: ObjectRepositoryHelper.new(),
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: missionMap,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });
        expect(saveState.squaddieMapPlacements).toHaveLength(2);

        const newBattleState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: new MissionMap({
                    terrainTileMap: new TerrainTileMap({
                        movementCost: ["1 2 - x "]
                    })
                }),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });
        newBattleState.battleState.missionMap.addSquaddie("template 0", "battle 0", {q: 0, r: 2});
        newBattleState.battleState.missionMap.addSquaddie("template 1", "battle 1", {q: 0, r: 3});

        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });

        expect(newBattleState.battleState.missionMap.terrainTileMap.getDimensions()).toStrictEqual({
            widthOfWidestRow: 4,
            numberOfRows: 1
        });
        expect(newBattleState.battleState.missionMap.getSquaddieByBattleId("battle 0")).toStrictEqual(
            {
                battleSquaddieId: "battle 0",
                squaddieTemplateId: "template 0",
                mapLocation: {q: 0, r: 0},
            }
        )
        expect(newBattleState.battleState.missionMap.getSquaddieByBattleId("battle 1")).toStrictEqual(
            {
                battleSquaddieId: "battle 1",
                squaddieTemplateId: "template 1",
                mapLocation: {q: 0, r: 1},
            }
        )
    });

    it("can record mission statistics and create a similar one", () => {
        const battleState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionStatistics,
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
            squaddieRepository: ObjectRepositoryHelper.new(),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });

        expect(saveState.missionStatistics.timeElapsedInMilliseconds).toBe(9001);
        expect(saveState.missionStatistics).toStrictEqual(missionStatistics);

        const newBattleState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });
        expect(newBattleState.battleState.missionStatistics).toStrictEqual(missionStatistics);
    });

    it("can record squaddies in battle attributes create a similar ones in a repository", () => {
        const battleState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
            squaddieRepository: originalSquaddieRepository,
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });
        expect(Object.keys(saveState.inBattleAttributesBySquaddieBattleId)).toHaveLength(2);

        const newBattleState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
            squaddieRepository: newSquaddieRepository,
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });
        expect(ObjectRepositoryHelper.getBattleSquaddieIterator(newBattleState.squaddieRepository)).toHaveLength(2);
        const {
            squaddieTemplate: enemyTemplate,
            battleSquaddie: enemyBattle
        } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(newBattleState.squaddieRepository, "enemy battle 0"));
        expect(enemyTemplate.squaddieId.templateId).toBe("enemy template 0");
        expect(SquaddieTurnHandler.hasActionPointsRemaining(enemyBattle.squaddieTurn)).toBeFalsy();
        expect(enemyBattle.inBattleAttributes.currentHitPoints).toBe(4);
    });

    it("can record the squaddie teams from the Battle Orchestrator State and recreate them", () => {
        const teams: BattleSquaddieTeam[] = [playerTeam, enemyTeam];
        const battleState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                teams,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
            squaddieRepository: ObjectRepositoryHelper.new(),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });
        expect(saveState.teams).toEqual(teams);

        const newBattleState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });

        expect(newBattleState.battleState.teams).toEqual(
            expect.arrayContaining(teams)
        );
    });

    it("can record the TeamStrategy data used from the Battle Orchestrator and recreate them", () => {
        const teamStrategiesById: { [teamId: string]: TeamStrategy[] } = {
            "badguys chase and attack player": [
                {
                    type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                    options: {
                        desiredAffiliation: SquaddieAffiliation.PLAYER,
                    }
                },
                {
                    type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                    options: {
                        desiredAffiliation: SquaddieAffiliation.PLAYER,
                    }
                }
            ],
            "allies follow player leader": [
                {
                    type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                    options: {
                        desiredBattleSquaddieId: "player leader",
                    }
                }
            ],
            "Unaffiliated do nothing": [],
        }
        const battleState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: ObjectRepositoryHelper.new(),
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                teamStrategiesById,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });
        expect(saveState.teamStrategiesById).toEqual(teamStrategiesById);

        const newBattleState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });
        expect(newBattleState.battleState.teamStrategiesById["badguys chase and attack player"]).toEqual(teamStrategiesById["badguys chase and attack player"]);
        expect(newBattleState.battleState.teamStrategiesById["allies follow player leader"]).toEqual(teamStrategiesById["allies follow player leader"]);
        expect(newBattleState.battleState.teamStrategiesById["Unaffiliated do nothing"]).toEqual(teamStrategiesById["Unaffiliated do nothing"]);
    });

    it("can record the mission completion status", () => {
        const missionCompletionStatus: MissionCompletionStatus = {
            "victory": {
                isComplete: undefined,
                conditions: {
                    "defeat all enemies": undefined
                }
            },
            "defeat": {
                isComplete: undefined,
                conditions: {
                    "defeat all players": undefined
                }
            }
        };

        const originalOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: originalSquaddieRepository,
            battleState: BattleStateHelper.defaultBattleState({
                missionId: "test",
                missionCompletionStatus,
            }),
        });

        const battleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            battleOrchestratorState: originalOrchestratorState,
            missionId: "test mission",
            saveVersion: 9001
        });

        expect(battleSaveState.missionCompletionStatus).toEqual(missionCompletionStatus);

        const newOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: originalSquaddieRepository,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
            }),
        })
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleOrchestratorState: newOrchestratorState,
            squaddieRepository: originalSquaddieRepository,
            battleSaveState,
        });

        expect(newOrchestratorState.battleState.missionCompletionStatus).toEqual(originalOrchestratorState.battleState.missionCompletionStatus);
    });

    it('updates the completion status on the cutscene triggers', () => {
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
            }
        ];

        const battleState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: ObjectRepositoryHelper.new(),
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                cutsceneTriggers: triggers,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });
        expect(saveState.cutsceneTriggerCompletion).toEqual(triggers);

        const newBattleState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });
        expect(newBattleState.battleState.cutsceneTriggers.find((c) => c.cutsceneId === "victory").systemReactedToTrigger).toBeFalsy();
        expect(newBattleState.battleState.cutsceneTriggers.find((c) => c.cutsceneId === "introduction").systemReactedToTrigger).toBeTruthy();
    });

    describe('can serialize', () => {
        let saveData: BattleSaveState;
        let newBattleState: BattleOrchestratorState;

        beforeEach(() => {
            const inBattleAttributesBySquaddieBattleId: {
                [squaddieBattleId: string]:
                    InBattleAttributesAndTurn
            } = {
                [player0BattleSquaddie.battleSquaddieId]: {
                    inBattleAttributes: player0BattleSquaddie.inBattleAttributes,
                    turn: player0BattleSquaddie.squaddieTurn,
                },
                [enemy0BattleSquaddieWithWoundsAndTurnEnded.battleSquaddieId]: {
                    inBattleAttributes: enemy0BattleSquaddieWithWoundsAndTurnEnded.inBattleAttributes,
                    turn: enemy0BattleSquaddieWithWoundsAndTurnEnded.squaddieTurn,
                },
            }

            saveData = {
                saveVersion: 90210,
                missionId: "the mission",
                battlePhaseState: {
                    currentPhase: BattlePhase.ALLY,
                    turnCount: 7,
                },
                camera: {
                    xCoordinate: 100,
                    yCoordinate: 200,
                },
                battleEventRecording: eventRecording0,
                inBattleAttributesBySquaddieBattleId: inBattleAttributesBySquaddieBattleId,
                missionStatistics: missionStatistics,
                squaddieMapPlacements: [
                    {
                        battleSquaddieId: player0BattleSquaddie.battleSquaddieId,
                        squaddieTemplateId: player0BattleSquaddie.squaddieTemplateId,
                        mapLocation: {q: 0, r: 0},
                    },
                    {
                        battleSquaddieId: enemy0BattleSquaddieWithWoundsAndTurnEnded.battleSquaddieId,
                        squaddieTemplateId: enemy0BattleSquaddieWithWoundsAndTurnEnded.squaddieTemplateId,
                        mapLocation: {q: 0, r: 1},
                    },
                ],
                teams: [
                    playerTeam,
                    enemyTeam,
                ],
                teamStrategiesById: {
                    [enemyTeam.id]: [
                        {
                            type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                            options: {
                                desiredAffiliation: SquaddieAffiliation.PLAYER,
                            }
                        },
                        {
                            type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                            options: {
                                desiredAffiliation: SquaddieAffiliation.PLAYER,
                            }
                        }
                    ],
                    "ally team id": [
                        {
                            type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                            options: {
                                desiredBattleSquaddieId: "player leader",
                            }
                        }
                    ],
                },
                missionCompletionStatus: {
                    "victory": {
                        isComplete: undefined,
                        conditions: {
                            "defeat all enemies": undefined
                        }
                    },
                    "defeat": {
                        isComplete: undefined,
                        conditions: {
                            "defeat all players": undefined
                        }
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
                    }
                ],
            };

            newBattleState = BattleOrchestratorStateHelper.newOrchestratorState({
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: undefined,
                squaddieRepository: undefined,
                battleState: BattleStateHelper.newBattleState({
                    missionId: "test mission",
                    missionMap: new MissionMap({
                        terrainTileMap: new TerrainTileMap({
                            movementCost: ["1 2 - x "]
                        })
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
                        }
                    ],
                    battlePhaseState: {
                        turnCount: 0,
                        currentAffiliation: BattlePhase.UNKNOWN,
                    },
                }),
            });
            BattleSaveStateHandler.applySaveStateToOrchestratorState({
                battleSaveState: saveData,
                battleOrchestratorState: newBattleState,
                squaddieRepository: newSquaddieRepository,
            });
        });

        it('can export data to and from JSON', () => {
            const dataString = BattleSaveStateHandler.stringifyBattleSaveStateData(saveData);
            const newSaveData: BattleSaveState = BattleSaveStateHandler.parseJsonIntoBattleSaveStateData(dataString);
            expect(newSaveData).toEqual(saveData);
        });

        it('can export save data objects', () => {
            const missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 2 - x "]
                })
            });
            missionMap.addSquaddie("template 0", "battle 0", {q: 0, r: 0});
            missionMap.addSquaddie("template 1", "battle 1", {q: 0, r: 1});

            const teamStrategiesById: { [key: string]: TeamStrategy[] } = {
                [enemyTeam.id]: [
                    {
                        type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                        options: {
                            desiredAffiliation: SquaddieAffiliation.PLAYER,
                        }
                    },
                    {
                        type: TeamStrategyType.TARGET_SQUADDIE_IN_RANGE,
                        options: {
                            desiredAffiliation: SquaddieAffiliation.PLAYER,
                        }
                    }
                ],
                "ally team": [
                    {
                        type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                        options: {
                            desiredBattleSquaddieId: "player leader",
                        }
                    }
                ],
                "unaffiliated do nothing": [],
            };
            const missionCompletionStatus: MissionCompletionStatus = {
                "victory": {
                    isComplete: undefined,
                    conditions: {
                        "defeat all enemies": undefined
                    }
                },
                "defeat": {
                    isComplete: undefined,
                    conditions: {
                        "defeat all players": undefined
                    }
                }
            };
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
                }
            ];
            const battleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: undefined,
                squaddieRepository: originalSquaddieRepository,
                battleState: BattleStateHelper.newBattleState({
                    missionId: "test mission",
                    camera: new BattleCamera(100, 200),
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 3,
                    },
                    recording: eventRecording0,
                    missionMap,
                    missionStatistics,
                    teams: [playerTeam, enemyTeam],
                    teamStrategiesById,
                    missionCompletionStatus,
                    cutsceneTriggers: triggers,
                }),
            });


            const newSaveData: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
                saveVersion: 9001,
                missionId: "This mission",
                battleOrchestratorState,
            });

            expect(newSaveData.missionId).toBe("This mission");
            expect(newSaveData.camera.xCoordinate).toBe(100);
            expect(newSaveData.camera.yCoordinate).toBe(200);
            expect(newSaveData.battlePhaseState.turnCount).toBe(3);
            expect(newSaveData.battlePhaseState.currentPhase).toBe(BattlePhase.PLAYER);

            expect(newSaveData.battleEventRecording.history).toHaveLength(1);
            expect(newSaveData.battleEventRecording.history[0]).toStrictEqual(firstBattleEvent);
            expect(newSaveData.squaddieMapPlacements).toHaveLength(2);
            expect(newSaveData.squaddieMapPlacements[0]).toStrictEqual({
                squaddieTemplateId: "template 0",
                battleSquaddieId: "battle 0",
                mapLocation: {q: 0, r: 0}
            });
            expect(newSaveData.squaddieMapPlacements[1]).toStrictEqual({
                squaddieTemplateId: "template 1",
                battleSquaddieId: "battle 1",
                mapLocation: {q: 0, r: 1}
            });

            expect(newSaveData.missionStatistics).toStrictEqual(missionStatistics);
            expect(Object.keys(newSaveData.inBattleAttributesBySquaddieBattleId)).toEqual(["player battle 0", "enemy battle 0"])

            expect(newSaveData.teams).toEqual(
                expect.arrayContaining(
                    [
                        playerTeam,
                        enemyTeam,
                    ]
                )
            );

            expect(newSaveData.teams).toEqual(
                expect.arrayContaining([playerTeam, enemyTeam])
            );
            expect(newSaveData.teamStrategiesById).toEqual(teamStrategiesById);

            expect(newSaveData.missionCompletionStatus).toEqual(missionCompletionStatus);

            expect(newSaveData.cutsceneTriggerCompletion).toEqual(triggers);

            expect(newSaveData.battlePhaseState.turnCount).toBe(battleOrchestratorState.battleState.battlePhaseState.turnCount);
            expect(newSaveData.battlePhaseState.currentPhase).toBe(battleOrchestratorState.battleState.battlePhaseState.currentAffiliation);
        });
    });
});
