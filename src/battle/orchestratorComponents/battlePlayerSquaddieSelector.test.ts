import {BattlePlayerSquaddieSelector} from "./battlePlayerSquaddieSelector";
import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {BattlePhase} from "./battlePhaseTracker";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";
import {DEFAULT_ACTION_POINTS_PER_TURN, SquaddieTurnService} from "../../squaddie/turn";
import {
    BattleOrchestratorChanges,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {MissionMap, MissionMapService} from "../../missionMap/missionMap";
import {BattleCamera} from "../battleCamera";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates
} from "../../hexMap/convertCoordinates";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {makeResult} from "../../utils/ResultOrError";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {
    CurrentlySelectedSquaddieDecision,
    CurrentlySelectedSquaddieDecisionService
} from "../history/currentlySelectedSquaddieDecision";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {ActionEffectType} from "../../decision/actionEffect";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState, GameEngineStateHelper} from "../../gameEngine/gameEngine";
import {DecisionService} from "../../decision/decision";
import {ActionEffectSquaddie} from "../../decision/actionEffectSquaddie";
import {DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";
import SpyInstance = jest.SpyInstance;

describe('BattleSquaddieSelector', () => {
    let selector: BattlePlayerSquaddieSelector = new BattlePlayerSquaddieSelector();
    let squaddieRepo: ObjectRepository = ObjectRepositoryService.new();
    let missionMap: MissionMap;
    let enemyDemonStatic: SquaddieTemplate;
    let enemyDemonDynamic: BattleSquaddie;
    let demonBiteAction: ActionEffectSquaddieTemplate;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let teams: BattleSquaddieTeam[];
    let playerSoldierBattleSquaddie: BattleSquaddie;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        selector = new BattlePlayerSquaddieSelector();
        squaddieRepo = ObjectRepositoryService.new();
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        teams = [];
    });

    const makeBattlePhaseTrackerWithEnemyTeam = (missionMap: MissionMap) => {
        const enemyTeam: BattleSquaddieTeam =
            {
                id: "teamId",
                name: "enemies cannot be controlled by the player",
                affiliation: SquaddieAffiliation.ENEMY,
                battleSquaddieIds: [],
                iconResourceKey: "icon_enemy_team",
            }
        ;

        demonBiteAction = ActionEffectSquaddieTemplateService.new({
            name: "demon bite",
            id: "demon_bite",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 2,
        });

        ({
            battleSquaddie: enemyDemonDynamic,
            squaddieTemplate: enemyDemonStatic,
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "enemy_demon",
            name: "Slither Demon",
            affiliation: SquaddieAffiliation.ENEMY,
            battleId: "enemy_demon_0",
            squaddieRepository: squaddieRepo,
            actions: [demonBiteAction],
        }));

        ObjectRepositoryService.addBattleSquaddie(squaddieRepo,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "enemy_demon_1",
                squaddieTemplateId: "enemy_demon",
                squaddieTurn: SquaddieTurnService.new()
            })
        );

        BattleSquaddieTeamService.addBattleSquaddieIds(enemyTeam, ["enemy_demon_0", "enemy_demon_1"]);

        teams.push(enemyTeam);

        missionMap.addSquaddie(
            enemyDemonStatic.squaddieId.templateId,
            enemyDemonDynamic.battleSquaddieId,
            {q: 0, r: 0},
        );
        missionMap.addSquaddie(
            enemyDemonStatic.squaddieId.templateId,
            enemyDemonDynamic.battleSquaddieId,
            {q: 0, r: 1},
        );
        return {
            currentAffiliation: BattlePhase.ENEMY,
            turnCount: 1,
        };
    }

    const makeBattlePhaseTrackerWithPlayerTeam = (missionMap: MissionMap) => {
        const playerTeam: BattleSquaddieTeam =
            {
                id: "playerTeamId",
                name: "player controlled team",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: [],
                iconResourceKey: "icon_player_team",
            }
        ;
        teams.push(playerTeam);

        ({battleSquaddie: playerSoldierBattleSquaddie} = CreateNewSquaddieAndAddToRepository({
            name: "Player Soldier",
            templateId: "player_soldier",
            battleId: "player_soldier_0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
        }));
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, ["player_soldier_0"]);

        missionMap.addSquaddie(
            "player_soldier",
            "player_soldier_0",
            {q: 0, r: 0},
        );

        return {
            currentAffiliation: BattlePhase.PLAYER,
            turnCount: 1,
        };
    }

    it('ignores mouse input when the player tries to move an uncontrollable squaddie during the player phase', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 "]
            })
        });

        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const enemyTeam: BattleSquaddieTeam =
            {
                id: "enemyTeamId",
                name: "enemies cannot be controlled by the player",
                affiliation: SquaddieAffiliation.ENEMY,
                battleSquaddieIds: [],
                iconResourceKey: "icon_enemy_team",
            }
        ;

        demonBiteAction = ActionEffectSquaddieTemplateService.new({
            name: "demon bite",
            id: "demon_bite",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 2,
        });

        ({
            battleSquaddie: enemyDemonDynamic,
            squaddieTemplate: enemyDemonStatic,
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "enemy_demon",
            name: "Slither Demon",
            affiliation: SquaddieAffiliation.ENEMY,
            battleId: "enemy_demon_0",
            squaddieRepository: squaddieRepo,
            actions: [demonBiteAction],
        }));
        BattleSquaddieTeamService.addBattleSquaddieIds(enemyTeam, ["enemy_demon_0"]);
        teams.push(enemyTeam);
        missionMap.addSquaddie(
            enemyDemonStatic.squaddieId.templateId,
            enemyDemonDynamic.battleSquaddieId,
            {q: 0, r: 1},
        );

        const camera: BattleCamera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedBattleSquaddieId = jest.fn().mockReturnValue("enemy_demon_0");
        mockHud.didMouseClickOnHUD = jest.fn().mockReturnValue(false);
        mockHud.didPlayerSelectSquaddieAction = jest.fn().mockReturnValue(false);
        mockHud.selectSquaddieAndDrawWindow = jest.fn();

        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    battlePhaseState,
                    teams,
                    missionMap,
                    camera,
                }),
                battleSquaddieSelectedHUD: mockHud,
                squaddieRepository: squaddieRepo,
            }),
        });

        const enemyLocation = convertMapCoordinatesToScreenCoordinates(0, 1, ...camera.getCoordinates())
        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: enemyLocation[0],
            mouseY: enemyLocation[1],
        });

        const enemyDestination = convertMapCoordinatesToScreenCoordinates(0, 2, ...camera.getCoordinates())
        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: enemyDestination[0],
            mouseY: enemyDestination[1],
        });

        expect(selector.hasCompleted(state)).toBeFalsy();
        expect(CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBe("");
    });

    it('recommends computer squaddie selector if the player cannot control the squaddies', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        const battlePhaseState = makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        const camera: BattleCamera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: undefined,
                squaddieRepository: squaddieRepo,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    battlePhaseState,
                    teams,
                    camera,
                    missionMap,
                }),
            })
        });

        selector.update(state, mockedP5GraphicsContext);

        expect(selector.hasCompleted(state)).toBeTruthy();
        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR);
    });

    it('can make a movement action by clicking on the field', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });

        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                squaddieRepository: squaddieRepo,
                resourceHandler: mocks.mockResourceHandler(),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    recording: {history: []},
                }),
            })
        });

        let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());
        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY
        });

        [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 1, ...camera.getCoordinates());
        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY
        });

        expect(selector.hasCompleted(state)).toBeTruthy();

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

        const expectedSquaddieInstruction: CurrentlySelectedSquaddieDecision =
            CurrentlySelectedSquaddieDecisionService.new({

                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    squaddieTemplateId: "player_soldier",
                    battleSquaddieId: "player_soldier_0",
                    startingLocation: {q: 0, r: 0},
                    decisions: [
                        DecisionService.new({
                            actionEffects: [
                                ActionEffectMovementService.new({
                                    destination: {q: 0, r: 1},
                                    numberOfActionPointsSpent: 1,
                                })
                            ]
                        })
                    ]
                }),
            });

        const history = state.battleOrchestratorState.battleState.recording.history;
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual({
            instruction: expectedSquaddieInstruction,
            results: undefined,
        });

        expect(playerSoldierBattleSquaddie.squaddieTurn.remainingActionPoints).toEqual(DEFAULT_ACTION_POINTS_PER_TURN - 1);
    });

    describe('adding movement mid turn instruction', () => {
        let camera: BattleCamera;
        let state: GameEngineState;
        let squaddieCurrentlyActing: CurrentlySelectedSquaddieDecision;

        beforeEach(() => {
            const missionMap: MissionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "]
                })
            });

            const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

            camera = new BattleCamera();

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            squaddieCurrentlyActing = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "player_soldier_0",
                    squaddieTemplateId: "player_soldier",
                    startingLocation: {q: 0, r: 0},
                    decisions: [
                        DecisionService.new({
                            actionEffects: [
                                ActionEffectMovementService.new({
                                    destination: {q: 0, r: 1},
                                    numberOfActionPointsSpent: 1,
                                })
                            ]
                        })
                    ]
                }),
            });

            state = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                    squaddieRepository: squaddieRepo,
                    resourceHandler: mockResourceHandler,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera,
                        battlePhaseState,
                        teams,
                        squaddieCurrentlyActing,
                        recording: {history: []},
                    }),
                })
            });

            const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());
            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY
            });
        });

        it('when user clicks on new location, will add movement to existing instruction', () => {
            const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 2, ...camera.getCoordinates());

            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
            });
            expect(selector.hasCompleted(state)).toBeTruthy();
            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.decisions).toHaveLength(2);
            const actionEffectMovement = ActionEffectMovementService.new({
                destination: {q: 0, r: 2},
                numberOfActionPointsSpent: 1,
            });
            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.decisions[1]).toStrictEqual(
                DecisionService.new({
                    actionEffects: [
                        actionEffectMovement
                    ]
                })
            );
            expect(DecisionActionEffectIteratorService.peekActionEffect(state.battleOrchestratorState.decisionActionEffectIterator)).toEqual(
                actionEffectMovement
            );
        });
        it('will update squaddie location to destination and spend action points', () => {
            const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 2, ...camera.getCoordinates());

            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
            });

            expect(MissionMapService.getByBattleSquaddieId(state.battleOrchestratorState.battleState.missionMap, playerSoldierBattleSquaddie.battleSquaddieId)).toEqual(
                {
                    battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                    squaddieTemplateId: playerSoldierBattleSquaddie.squaddieTemplateId,
                    mapLocation: {q: 0, r: 2},
                });
            expect(playerSoldierBattleSquaddie.squaddieTurn.remainingActionPoints).toEqual(DEFAULT_ACTION_POINTS_PER_TURN - 1);
            expect(DecisionActionEffectIteratorService.peekActionEffect(state.battleOrchestratorState.decisionActionEffectIterator).type).toBe(ActionEffectType.MOVEMENT);
        });
    });

    it('will add end turn to existing instruction', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();
        const squaddieCurrentlyActing: CurrentlySelectedSquaddieDecision =
            CurrentlySelectedSquaddieDecisionService.new({

                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "player_soldier_0",
                    squaddieTemplateId: "player_soldier",
                    startingLocation: {q: 0, r: 0},
                    decisions: [
                        DecisionService.new({
                            actionEffects: [
                                ActionEffectMovementService.new({
                                    destination: {q: 0, r: 1},
                                    numberOfActionPointsSpent: 1,
                                })
                            ]
                        })
                    ]
                }),
            });

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedBattleSquaddieId = jest.fn().mockReturnValue("player_soldier_0");
        mockHud.didPlayerSelectEndTurnAction = jest.fn().mockReturnValue(true);

        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                squaddieRepository: squaddieRepo,
                battleSquaddieSelectedHUD: mockHud,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    squaddieCurrentlyActing,
                    recording: {history: []},
                }),
            })
        });

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0
        });
        selector.update(state, mockedP5GraphicsContext);
        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.decisions).toHaveLength(2);
        expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.decisions[1].actionEffects[0].type).toBe(ActionEffectType.END_TURN);
        expect(DecisionActionEffectIteratorService.peekActionEffect(state.battleOrchestratorState.decisionActionEffectIterator).type).toEqual(
            ActionEffectType.END_TURN
        );
    });

    it('can instruct squaddie to end turn when player clicks on End Turn button', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedBattleSquaddieId = jest.fn().mockReturnValue(playerSoldierBattleSquaddie.battleSquaddieId);
        mockHud.didPlayerSelectEndTurnAction = jest.fn().mockReturnValue(true);

        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                squaddieRepository: squaddieRepo,
                battleSquaddieSelectedHUD: mockHud,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    recording: {history: []},
                }),
            })
        });

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0
        });

        expect(selector.hasCompleted(state)).toBeTruthy();
        const endTurnInstruction: CurrentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                squaddieTemplateId: playerSoldierBattleSquaddie.squaddieTemplateId,
                startingLocation: {q: 0, r: 0},
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectEndTurnService.new()
                        ]
                    })
                ]
            }),
        });

        expect(SquaddieActionsForThisRoundService.getMostRecentDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase).actionEffects[0].type).toBe(ActionEffectType.END_TURN);

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);

        const history = state.battleOrchestratorState.battleState.recording.history;
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual({
            instruction: endTurnInstruction,
            results: undefined,
        });
        expect(playerSoldierBattleSquaddie.squaddieTurn.remainingActionPoints).toEqual(0);
        expect(DecisionActionEffectIteratorService.peekActionEffect(state.battleOrchestratorState.decisionActionEffectIterator).type).toBe(ActionEffectType.END_TURN);
    });

    it('will recommend squaddie target if a SquaddieAction is selected that requires a target', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const longswordAction: ActionEffectSquaddieTemplate = ActionEffectSquaddieTemplateService.new({
            name: "longsword",
            id: "longsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues(),
            actionPointCost: 1,
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
        });

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedAction = jest.fn().mockReturnValue(longswordAction);
        mockHud.mouseClicked = jest.fn();
        mockHud.getSelectedBattleSquaddieId = jest.fn().mockReturnValue("player_soldier_0");
        mockHud.didPlayerSelectSquaddieAction = jest.fn().mockReturnValue(true);
        mockHud.getSquaddieSquaddieAction = jest.fn().mockReturnValue(longswordAction);

        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                squaddieRepository: squaddieRepo,
                battleSquaddieSelectedHUD: mockHud,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    recording: {history: []},
                }),
            })
        });

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0
        });

        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBe("player_soldier_0");

        const expectedInstruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            battleSquaddieId: "player_soldier_0",
            squaddieTemplateId: "player_soldier",
            startingLocation: {q: 0, r: 0},
        });

        expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase).toStrictEqual(expectedInstruction);
        expect((state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedDecision.actionEffects[0] as ActionEffectSquaddie).template).toStrictEqual(longswordAction);

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET);

        const history = state.battleOrchestratorState.battleState.recording.history;
        expect(history).toHaveLength(0);

        expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedDecision.actionEffects[0].type).toEqual(
            ActionEffectType.SQUADDIE
        );
    });

    describe('squaddie must complete their turn before moving other squaddies', () => {
        let missionMap: MissionMap;
        let interruptSquaddieStatic: SquaddieTemplate;
        let interruptBattleSquaddie: BattleSquaddie;
        let soldierCurrentlyActing: CurrentlySelectedSquaddieDecision;
        let mockHud: BattleSquaddieSelectedHUD;
        let selectSquaddieAndDrawWindowSpy: SpyInstance;
        let camera: BattleCamera;
        let state: GameEngineState;
        let startingMouseX: number;
        let startingMouseY: number;

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 1 "]
                })
            });
            const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);
            ({
                squaddieTemplate: interruptSquaddieStatic,
                battleSquaddie: interruptBattleSquaddie,
            } = CreateNewSquaddieAndAddToRepository({
                name: "interrupting squaddie",
                templateId: "interrupting squaddie",
                battleId: "interrupting squaddie",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: squaddieRepo,
            }));

            missionMap.addSquaddie(
                interruptSquaddieStatic.squaddieId.templateId,
                interruptBattleSquaddie.battleSquaddieId,
                {q: 0, r: 1},
            );

            const soldierSquaddieInfo = missionMap.getSquaddieByBattleId("player_soldier_0");

            const movingInstruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                squaddieTemplateId: soldierSquaddieInfo.squaddieTemplateId,
                battleSquaddieId: soldierSquaddieInfo.battleSquaddieId,
                startingLocation: soldierSquaddieInfo.mapLocation,
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectMovementService.new({
                                destination: {q: 0, r: 2},
                                numberOfActionPointsSpent: 1,
                            })
                        ]
                    })
                ]
            });

            soldierCurrentlyActing = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: movingInstruction,

            });

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            mockHud = new BattleSquaddieSelectedHUD();

            camera = new BattleCamera();
            selectSquaddieAndDrawWindowSpy = jest.spyOn(mockHud, "selectSquaddieAndDrawWindow");

            state = GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    resourceHandler: mockResourceHandler,
                    battleSquaddieSelectedHUD: mockHud,
                    squaddieRepository: squaddieRepo,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera,
                        battlePhaseState,
                        teams,
                        recording: {history: []},
                        squaddieCurrentlyActing: soldierCurrentlyActing,
                    }),
                })
            });

            const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());
            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY
            });

            const interruptSquaddieOnMap = missionMap.getSquaddieByBattleId("interrupting squaddie");
            [startingMouseX, startingMouseY] = convertMapCoordinatesToScreenCoordinates(
                interruptSquaddieOnMap.mapLocation.q,
                interruptSquaddieOnMap.mapLocation.r,
                ...camera.getCoordinates()
            );

            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: startingMouseX,
                mouseY: startingMouseY
            });
            expect(selectSquaddieAndDrawWindowSpy).toBeCalledWith({
                battleId: interruptBattleSquaddie.battleSquaddieId,
                repositionWindow: {
                    mouseX: startingMouseX, mouseY: startingMouseY
                },
                state: state.battleOrchestratorState,
            });
        });

        it('ignores movement commands issued to other squaddies', () => {
            expect(CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBe(
                CurrentlySelectedSquaddieDecisionService.battleSquaddieId(soldierCurrentlyActing)
            );
            expect(selectSquaddieAndDrawWindowSpy).toBeCalledWith({
                battleId: interruptBattleSquaddie.battleSquaddieId,
                repositionWindow: {
                    mouseX: startingMouseX, mouseY: startingMouseY
                },
                state: state.battleOrchestratorState,
            });
            expect(selector.hasCompleted(state)).toBeFalsy();

            const location = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(interruptBattleSquaddie.battleSquaddieId);
            let [endingMouseX, endingMouseY] = convertMapCoordinatesToScreenCoordinates(
                location.mapLocation.q, location.mapLocation.r,
                ...camera.getCoordinates()
            );

            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: endingMouseX,
                mouseY: endingMouseY
            });

            expect(CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBe(
                CurrentlySelectedSquaddieDecisionService.battleSquaddieId(soldierCurrentlyActing)
            );
            expect(selector.hasCompleted(state)).toBeFalsy();
        });

        it('ignores action commands issued to other squaddies', () => {
            const longswordAction: ActionEffectSquaddieTemplate = ActionEffectSquaddieTemplateService.new({
                name: "longsword",
                id: "longsword",
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                actionPointCost: 1,
                minimumRange: 0,
                maximumRange: 1,
                targetingShape: TargetingShape.SNAKE,
            });

            mockHud.didPlayerSelectSquaddieAction = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);
            mockHud.getSelectedAction = jest.fn().mockReturnValue(longswordAction);
            mockHud.shouldDrawTheHUD = jest.fn().mockReturnValue(true);
            mockHud.didMouseClickOnHUD = jest.fn().mockImplementationOnce(() => {
                return false;
            }).mockReturnValue(true);
            mockHud.mouseClicked = jest.fn();

            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: 0,
                mouseY: 0
            });
            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedDecision).toBeUndefined();
            expect(CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBe(
                CurrentlySelectedSquaddieDecisionService.battleSquaddieId(soldierCurrentlyActing)
            );
            expect(selector.hasCompleted(state)).toBeFalsy();
        });
    });

    it('will send key pressed events to the HUD', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.keyPressed = jest.fn();

        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: mockHud,
                squaddieRepository: squaddieRepo,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                }),
            })
        });

        selector.keyEventHappened(state, {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode: 0,
        });

        expect(mockHud.keyPressed).toHaveBeenCalled();
    });
});
