import {
    BattleSaveState,
    BattleSaveStateHandler,
    DefaultBattleSaveState,
    InBattleAttributesAndTurn
} from "./battleSaveState";
import {BattleCamera} from "../battleCamera";
import {Recording, RecordingHandler} from "./recording";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {BattleEvent} from "./battleEvent";
import {SquaddieAction, SquaddieActionHandler} from "../../squaddie/action";
import {Trait} from "../../trait/traitStatusStorage";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "./squaddieActionsForThisRound";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {NullMissionMap} from "../../utils/test/battleOrchestratorState";
import {MissionStatistics} from "../missionStatistics/missionStatistics";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddie, BattleSquaddieHelper} from "../battleSquaddie";
import {SquaddieTurnHandler} from "../../squaddie/turn";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {InBattleAttributesHandler} from "../stats/inBattleAttributes";
import {DefaultArmyAttributes} from "../../squaddie/armyAttributes";
import {DamageType} from "../../squaddie/squaddieService";
import {SquaddieActionType} from "./anySquaddieAction";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {TeamStrategy, TeamStrategyType} from "../teamStrategy/teamStrategy";
import {MissionCompletionStatus} from "../missionResult/missionCompletionStatus";
import {CutsceneTrigger, TriggeringEvent} from "../../cutscene/cutsceneTrigger";
import {SAVE_VERSION} from "../../utils/fileHandling/saveFile";
import {BattleStateHelper} from "../orchestrator/battleState";

describe("BattleSaveState", () => {
    let eventRecording0: Recording;
    let firstBattleEvent: BattleEvent;
    let missionStatistics: MissionStatistics;
    let originalSquaddieRepository: BattleSquaddieRepository;
    let newSquaddieRepository: BattleSquaddieRepository;
    let player0BattleSquaddie: BattleSquaddie;
    let enemy0BattleSquaddieWithWoundsAndTurnEnded: BattleSquaddie;
    let playerTeam: BattleSquaddieTeam;
    let enemyTeam: BattleSquaddieTeam;

    beforeEach(() => {
        const action: SquaddieAction = SquaddieActionHandler.new({
                id: "att",
                name: "attack",
                traits: {
                    booleanTraits: {
                        [Trait.ATTACK]: true,
                        [Trait.ALWAYS_HITS]: true,
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
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: {q: 2, r: -5},
                numberOfActionPointsSpent: 1,
            }
        });

        SquaddieActionsForThisRoundHandler.addAction(firstSquaddieActions, {
            type: SquaddieActionType.SQUADDIE,
            data: {
                squaddieAction: action,
                targetLocation: {q: 3, r: 4},
            }
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
                    },
                    "target 1": {
                        damageTaken: 1,
                        healingReceived: 3,
                    },
                }
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
            affiliation: SquaddieAffiliation.PLAYER,
            name: "Player Team",
            battleSquaddieIds: ["player battle 0"],
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
            affiliation: SquaddieAffiliation.ENEMY,
            name: "Enemy Team",
            battleSquaddieIds: ["enemy battle 0"],
        }

        originalSquaddieRepository = new BattleSquaddieRepository();
        originalSquaddieRepository.addSquaddieTemplate(player0SquaddieTemplate);
        originalSquaddieRepository.addBattleSquaddie(player0BattleSquaddie);
        originalSquaddieRepository.addSquaddieTemplate(enemy0SquaddieTemplate);
        originalSquaddieRepository.addBattleSquaddie(enemy0BattleSquaddieWithWoundsAndTurnEnded);
        InBattleAttributesHandler.takeDamage(enemy0BattleSquaddieWithWoundsAndTurnEnded.inBattleAttributes, 1, DamageType.Unknown);

        newSquaddieRepository = new BattleSquaddieRepository();
        newSquaddieRepository.addSquaddieTemplate(player0SquaddieTemplate);
        newSquaddieRepository.addBattleSquaddie(player0BattleSquaddie);
        newSquaddieRepository.addSquaddieTemplate(enemy0SquaddieTemplate);

        const enemy0BattleSquaddieWithNewTurn = BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "enemy battle 0",
            squaddieTemplateId: "enemy template 0",
            squaddieTurn: SquaddieTurnHandler.new(),
            inBattleAttributes: InBattleAttributesHandler.new({
                ...DefaultArmyAttributes(),
                maxHitPoints: 5
            })
        });
        newSquaddieRepository.addBattleSquaddie(enemy0BattleSquaddieWithNewTurn);


    })

    it('Records the mission Id', () => {
        const saveState: BattleSaveState = {
            ...DefaultBattleSaveState(),
            mission_id: "123-a",
        };
        expect(saveState.mission_id).toBe("123-a");
    });

    it("Can read the camera and create a similar one", () => {
        const battleState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: new BattleSquaddieRepository(),
            battleState: BattleStateHelper.newBattleState({
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

        const newBattleState: BattleOrchestratorState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: new BattleSquaddieRepository(),
            battleState: BattleStateHelper.newBattleState({
                missionMap: NullMissionMap(),
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
    });

    it("Can read the battle phase and create a similar one", () => {
        const battleState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 3,
                },
            }),
            squaddieRepository: new BattleSquaddieRepository(),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });
        expect(saveState.turn_count).toBe(3);

        const newBattleState: BattleOrchestratorState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({}),
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
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: {q: 1, r: 6},
                numberOfActionPointsSpent: 3,
            }
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
                resultPerTarget: {}
            }
        };
        eventRecording0.history.push(
            secondBattleEvent
        );

        const battleState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionMap: NullMissionMap(),
                recording: eventRecording0,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
            squaddieRepository: new BattleSquaddieRepository(),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });
        expect(saveState.battle_event_recording.history).toHaveLength(2);

        const newBattleState: BattleOrchestratorState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({}),
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

        const battleState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: new BattleSquaddieRepository(),
            battleState: BattleStateHelper.newBattleState({
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
        expect(saveState.squaddie_map_placements).toHaveLength(2);

        const newBattleState: BattleOrchestratorState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionMap: new MissionMap({
                    terrainTileMap: new TerrainTileMap({
                        movementCost: ["1 2 - x "]
                    })
                })
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
        const battleState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionStatistics,
                missionMap: NullMissionMap(),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
            squaddieRepository: new BattleSquaddieRepository(),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });

        expect(saveState.mission_statistics.timeElapsedInMilliseconds).toBe(9001);
        expect(saveState.mission_statistics).toStrictEqual(missionStatistics);

        const newBattleState: BattleOrchestratorState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({}),
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });
        expect(newBattleState.battleState.missionStatistics).toStrictEqual(missionStatistics);
    });

    it("can record squaddies in battle attributes create a similar ones in a repository", () => {
        const battleState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
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
        expect(Object.keys(saveState.in_battle_attributes_by_squaddie_battle_id)).toHaveLength(2);

        const newBattleState: BattleOrchestratorState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({}),
            squaddieRepository: newSquaddieRepository,
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });
        expect(newBattleState.squaddieRepository.getBattleSquaddieIterator()).toHaveLength(2);
        const {
            squaddieTemplate: enemyTemplate,
            battleSquaddie: enemyBattle
        } = getResultOrThrowError(newBattleState.squaddieRepository.getSquaddieByBattleId("enemy battle 0"));
        expect(enemyTemplate.squaddieId.templateId).toBe("enemy template 0");
        expect(SquaddieTurnHandler.hasActionPointsRemaining(enemyBattle.squaddieTurn)).toBeFalsy();
        expect(enemyBattle.inBattleAttributes.currentHitPoints).toBe(4);
    });

    it("can record the squaddie teams from the Battle Orchestrator State and recreate them", () => {
        const teamsByAffiliation = {
            [SquaddieAffiliation.PLAYER]: playerTeam,
            [SquaddieAffiliation.ENEMY]: enemyTeam,
        };
        const battleState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionMap: NullMissionMap(),
                teamsByAffiliation,
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
            squaddieRepository: new BattleSquaddieRepository(),
        });

        const saveState: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
            missionId: "test",
            saveVersion: SAVE_VERSION,
            battleOrchestratorState: battleState,
        });
        expect(saveState.teams_by_affiliation).toEqual(teamsByAffiliation);

        const newBattleState: BattleOrchestratorState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({}),
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });

        expect(newBattleState.battleState.teamsByAffiliation[SquaddieAffiliation.PLAYER]).toEqual(teamsByAffiliation[SquaddieAffiliation.PLAYER]);
        expect(newBattleState.battleState.teamsByAffiliation[SquaddieAffiliation.ENEMY]).toEqual(teamsByAffiliation[SquaddieAffiliation.ENEMY]);
    });

    it("can record the TeamStrategy data used from the Battle Orchestrator and recreate them", () => {
        const teamStrategyByAffiliation: { [key in SquaddieAffiliation]?: TeamStrategy[] } = {
            [SquaddieAffiliation.ENEMY]: [
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
            [SquaddieAffiliation.ALLY]: [
                {
                    type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                    options: {
                        desiredBattleSquaddieId: "player leader",
                    }
                }
            ],
            [SquaddieAffiliation.NONE]: [],
        };
        const battleState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: new BattleSquaddieRepository(),
            battleState: BattleStateHelper.newBattleState({
                missionMap: NullMissionMap(),
                teamStrategyByAffiliation,
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
        expect(saveState.team_strategy_by_affiliation).toEqual(teamStrategyByAffiliation);

        const newBattleState: BattleOrchestratorState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({}),
        });
        BattleSaveStateHandler.applySaveStateToOrchestratorState({
            battleSaveState: saveState,
            battleOrchestratorState: newBattleState,
            squaddieRepository: newSquaddieRepository
        });
        expect(newBattleState.battleState.teamStrategyByAffiliation[SquaddieAffiliation.ENEMY]).toEqual(teamStrategyByAffiliation[SquaddieAffiliation.ENEMY]);
        expect(newBattleState.battleState.teamStrategyByAffiliation[SquaddieAffiliation.ALLY]).toEqual(teamStrategyByAffiliation[SquaddieAffiliation.ALLY]);
        expect(newBattleState.battleState.teamStrategyByAffiliation[SquaddieAffiliation.NONE]).toEqual(teamStrategyByAffiliation[SquaddieAffiliation.NONE]);
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

        const battleState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: new BattleSquaddieRepository(),
            battleState: BattleStateHelper.newBattleState({
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
        expect(saveState.cutscene_trigger_completion).toEqual(triggers);

        const newBattleState: BattleOrchestratorState = new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({}),
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
                    in_battle_attributes: player0BattleSquaddie.inBattleAttributes,
                    turn: player0BattleSquaddie.squaddieTurn,
                },
                [enemy0BattleSquaddieWithWoundsAndTurnEnded.battleSquaddieId]: {
                    in_battle_attributes: enemy0BattleSquaddieWithWoundsAndTurnEnded.inBattleAttributes,
                    turn: enemy0BattleSquaddieWithWoundsAndTurnEnded.squaddieTurn,
                },
            }

            saveData = {
                save_version: 90210,
                mission_id: "the mission",
                turn_count: 7,
                camera: {
                    xCoordinate: 100,
                    yCoordinate: 200,
                },
                battle_event_recording: eventRecording0,
                in_battle_attributes_by_squaddie_battle_id: inBattleAttributesBySquaddieBattleId,
                mission_statistics: missionStatistics,
                squaddie_map_placements: [
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
                teams_by_affiliation: {
                    [SquaddieAffiliation.PLAYER]: playerTeam,
                    [SquaddieAffiliation.ENEMY]: enemyTeam,
                },
                team_strategy_by_affiliation: {
                    [SquaddieAffiliation.ENEMY]: [
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
                    [SquaddieAffiliation.ALLY]: [
                        {
                            type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                            options: {
                                desiredBattleSquaddieId: "player leader",
                            }
                        }
                    ],
                },
                mission_completion_status: {
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
                cutscene_trigger_completion: [
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

            newBattleState = new BattleOrchestratorState({
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: undefined,
                squaddieRepository: undefined,
                battleState: BattleStateHelper.newBattleState({
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

            const teamStrategyByAffiliation: { [key in SquaddieAffiliation]?: TeamStrategy[] } = {
                [SquaddieAffiliation.ENEMY]: [
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
                [SquaddieAffiliation.ALLY]: [
                    {
                        type: TeamStrategyType.MOVE_CLOSER_TO_SQUADDIE,
                        options: {
                            desiredBattleSquaddieId: "player leader",
                        }
                    }
                ],
                [SquaddieAffiliation.NONE]: [],
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
            const battleOrchestratorState = new BattleOrchestratorState({
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: undefined,
                squaddieRepository: originalSquaddieRepository,
                battleState: BattleStateHelper.newBattleState({
                    camera: new BattleCamera(100, 200),
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 3,
                    },
                    recording: eventRecording0,
                    missionMap,
                    missionStatistics,
                    teamsByAffiliation: {
                        [SquaddieAffiliation.PLAYER]: playerTeam,
                        [SquaddieAffiliation.ENEMY]: enemyTeam,
                    },
                    teamStrategyByAffiliation: teamStrategyByAffiliation,
                    missionCompletionStatus,
                    cutsceneTriggers: triggers,
                }),
            });


            const saveData: BattleSaveState = BattleSaveStateHandler.newUsingBattleOrchestratorState({
                saveVersion: 9001,
                missionId: "This mission",
                battleOrchestratorState,
            });

            expect(saveData.mission_id).toBe("This mission");
            expect(saveData.camera.xCoordinate).toBe(100);
            expect(saveData.camera.yCoordinate).toBe(200);
            expect(saveData.turn_count).toBe(3);

            expect(saveData.battle_event_recording.history).toHaveLength(1);
            expect(saveData.battle_event_recording.history[0]).toStrictEqual(firstBattleEvent);
            expect(saveData.squaddie_map_placements).toHaveLength(2);
            expect(saveData.squaddie_map_placements[0]).toStrictEqual({
                squaddieTemplateId: "template 0",
                battleSquaddieId: "battle 0",
                mapLocation: {q: 0, r: 0}
            });
            expect(saveData.squaddie_map_placements[1]).toStrictEqual({
                squaddieTemplateId: "template 1",
                battleSquaddieId: "battle 1",
                mapLocation: {q: 0, r: 1}
            });

            expect(saveData.mission_statistics).toStrictEqual(missionStatistics);
            expect(Object.keys(saveData.in_battle_attributes_by_squaddie_battle_id)).toEqual(["player battle 0", "enemy battle 0"])

            expect(saveData.teams_by_affiliation).toEqual({
                [SquaddieAffiliation.PLAYER]: playerTeam,
                [SquaddieAffiliation.ENEMY]: enemyTeam,
            });

            expect(saveData.team_strategy_by_affiliation).toEqual(teamStrategyByAffiliation);

            expect(saveData.mission_completion_status).toEqual(missionCompletionStatus);

            expect(saveData.cutscene_trigger_completion).toEqual(triggers);
        });
    });
});
