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
import {MissionMap, MissionMapService} from "../../missionMap/missionMap";
import {BattleCamera} from "../battleCamera";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates
} from "../../hexMap/convertCoordinates";
import {makeResult} from "../../utils/ResultOrError";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {TargetingShape} from "../targeting/targetingShapeGenerator";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {CampaignService} from "../../campaign/campaign";
import {ActionTemplate, ActionTemplateService} from "../../action/template/actionTemplate";
import {ActionEffectSquaddieTemplateService} from "../../action/template/actionEffectSquaddieTemplate";
import {DamageType} from "../../squaddie/squaddieService";
import {ActionsThisRound, ActionsThisRoundService} from "../history/actionsThisRound";
import {ProcessedActionService} from "../../action/processed/processedAction";
import {DecidedActionService} from "../../action/decided/decidedAction";
import {DecidedActionMovementEffectService} from "../../action/decided/decidedActionMovementEffect";
import {ActionEffectMovementTemplateService} from "../../action/template/actionEffectMovementTemplate";
import {ProcessedActionMovementEffectService} from "../../action/processed/processedActionMovementEffect";
import {ActionEffectType} from "../../action/template/actionEffectTemplate";
import {DecidedActionEndTurnEffectService} from "../../action/decided/decidedActionEndTurnEffect";
import {ActionEffectEndTurnTemplateService} from "../../action/template/actionEffectEndTurnTemplate";
import {ProcessedActionEndTurnEffectService} from "../../action/processed/processedActionEndTurnEffect";
import {BattlePhaseState} from "./battlePhaseController";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {BATTLE_HUD_MODE, config} from "../../configuration/config";
import {KeyButtonName} from "../../utils/keyboardConfig";
import SpyInstance = jest.SpyInstance;

describe('BattleSquaddieSelector', () => {
    let selector: BattlePlayerSquaddieSelector = new BattlePlayerSquaddieSelector();
    let squaddieRepo: ObjectRepository = ObjectRepositoryService.new();
    let missionMap: MissionMap;
    let enemyDemonStatic: SquaddieTemplate;
    let enemyDemonDynamic: BattleSquaddie;
    let demonBiteAction: ActionTemplate;
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

        demonBiteAction = ActionTemplateService.new({
            name: "demon bite",
            id: "demon_bite",
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                }),
            ],
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
            actionTemplates: [demonBiteAction],
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

    const makeBattlePhaseTrackerWithPlayerTeam = (missionMap: MissionMap): BattlePhaseState => {
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

        demonBiteAction = ActionTemplateService.new({
            name: "demon bite",
            id: "demon_bite",
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                }),
            ],
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
            actionTemplates: [demonBiteAction],
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

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    battlePhaseState,
                    teams,
                    missionMap,
                    camera,
                }),
                battleSquaddieSelectedHUD: mockHud,
            }),
            repository: squaddieRepo,
            campaign: CampaignService.default({}),
        });

        clickOnMapCoordinate({
            selector,
            gameEngineState: state,
            q: 0,
            r: 1,
            camera
        });

        clickOnMapCoordinate({
            selector,
            gameEngineState: state,
            q: 0,
            r: 2,
            camera
        });

        expect(selector.hasCompleted(state)).toBeFalsy();
        expect(state.battleOrchestratorState.battleState.actionsThisRound).toBeUndefined();
    });

    it('recommends computer squaddie selector if the player cannot control the squaddies', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        const battlePhaseState = makeBattlePhaseTrackerWithEnemyTeam(missionMap);

        const camera: BattleCamera = new BattleCamera(...convertMapCoordinatesToWorldCoordinates(0, 0));
        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    battlePhaseState,
                    teams,
                    camera,
                    missionMap,
                }),
            }),
            repository: squaddieRepo,
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

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: mocks.mockResourceHandler(),
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    recording: {history: []},
                }),
            }),
            repository: squaddieRepo,
            campaign: CampaignService.default({}),
        });

        clickOnMapCoordinate({
            selector,
            gameEngineState: state,
            q: 0,
            r: 0,
            camera
        });

        clickOnMapCoordinate({
            selector,
            gameEngineState: state,
            q: 0,
            r: 1,
            camera
        });

        expect(selector.hasCompleted(state)).toBeTruthy();

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);

        const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
            template: ActionEffectMovementTemplateService.new({}),
            destination: {q: 0, r: 1},
        });
        const processedAction = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                battleSquaddieId: "player_soldier_0",
                actionPointCost: 1,
                actionTemplateName: "Move",
                actionEffects: [
                    decidedActionMovementEffect
                ]
            }),
            processedActionEffects: [
                ProcessedActionMovementEffectService.new({
                    decidedActionEffect: decidedActionMovementEffect,
                })
            ]
        });

        const history = state.battleOrchestratorState.battleState.recording.history;
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual({
            results: undefined,
            processedAction: processedAction,
        });

        expect(playerSoldierBattleSquaddie.squaddieTurn.remainingActionPoints).toEqual(DEFAULT_ACTION_POINTS_PER_TURN - 1);
    });

    describe('adding movement mid turn instruction', () => {
        let camera: BattleCamera;
        let missionMap: MissionMap;
        let gameEngineState: GameEngineState;
        let actionsThisRound: ActionsThisRound;

        beforeEach(() => {
            camera = new BattleCamera();

            const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: {q: 0, r: 1},
            });
            const processedAction = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    battleSquaddieId: "player_soldier_0",
                    actionPointCost: 1,
                    actionTemplateName: "Move",
                    actionEffects: [
                        decidedActionMovementEffect
                    ]
                }),
                processedActionEffects: [
                    ProcessedActionMovementEffectService.new({
                        decidedActionEffect: decidedActionMovementEffect,
                    })
                ]
            });

            actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "player_soldier_0",
                startingLocation: {q: 0, r: 0},
                previewedActionTemplateId: undefined,
                processedActions: [
                    processedAction
                ]
            });

            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "]
                })
            });
        });

        const setUpGameEngineState = (missionMap: MissionMap, battlePhaseState: BattlePhaseState) => {
            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            gameEngineState = GameEngineStateService.new({
                resourceHandler: mockResourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera,
                        battlePhaseState,
                        teams,
                        actionsThisRound,
                        recording: {history: []},
                    }),
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            });
        }

        const clickOnSquaddie = () => {
            const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY
            });
        }

        it('open the HUD if the character is controllable', () => {
            const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);
            setUpGameEngineState(missionMap, battlePhaseState);

            selector.update(gameEngineState, mockedP5GraphicsContext);
            expect(gameEngineState.battleOrchestratorState.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
        });
        it('will not open the HUD if the character is not controllable', () => {
            const battlePhaseState = makeBattlePhaseTrackerWithEnemyTeam(missionMap);
            setUpGameEngineState(missionMap, battlePhaseState);

            selector.update(gameEngineState, mockedP5GraphicsContext);
            expect(gameEngineState.battleOrchestratorState.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });
        it('when user clicks on new location, will add movement to existing instruction', () => {
            const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);
            setUpGameEngineState(missionMap, battlePhaseState);
            clickOnSquaddie();
            clickOnMapCoordinate({
                selector,
                gameEngineState,
                q: 0,
                r: 2,
                camera
            });
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy();
            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound.processedActions).toHaveLength(2);
            const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: {q: 0, r: 2},
            });
            const processedAction = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    actionPointCost: 1,
                    battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                    actionTemplateName: "Move",
                    actionEffects: [
                        decidedActionMovementEffect
                    ]
                }),
                processedActionEffects: [
                    ProcessedActionMovementEffectService.new({
                        decidedActionEffect: decidedActionMovementEffect,
                    })
                ]
            });
            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound.processedActions[1]).toEqual(
                processedAction
            );
            ActionsThisRoundService.nextProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound);
            expect(ActionsThisRoundService.getProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound)).toEqual(
                ProcessedActionMovementEffectService.new({
                    decidedActionEffect: decidedActionMovementEffect,
                })
            );
        });
        it('will update squaddie location to destination and spend action points', () => {
            const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);
            setUpGameEngineState(missionMap, battlePhaseState);
            clickOnSquaddie();
            clickOnMapCoordinate({
                selector,
                gameEngineState,
                q: 0,
                r: 2,
                camera
            });

            expect(MissionMapService.getByBattleSquaddieId(gameEngineState.battleOrchestratorState.battleState.missionMap, playerSoldierBattleSquaddie.battleSquaddieId)).toEqual(
                {
                    battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                    squaddieTemplateId: playerSoldierBattleSquaddie.squaddieTemplateId,
                    mapLocation: {q: 0, r: 2},
                });
            expect(playerSoldierBattleSquaddie.squaddieTurn.remainingActionPoints).toEqual(DEFAULT_ACTION_POINTS_PER_TURN - 1);
            expect(ActionsThisRoundService.getProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound).type).toEqual(ActionEffectType.MOVEMENT);
        });
    });

    it('will add end turn to existing instruction', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();
        const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
            template: ActionEffectMovementTemplateService.new({}),
            destination: {q: 0, r: 1},
        });
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
            startingLocation: {q: 0, r: 0},
            previewedActionTemplateId: undefined,
            processedActions: [
                ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        actionPointCost: 1,
                        battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                        actionTemplateName: "Move",
                        actionEffects: [
                            decidedActionMovementEffect
                        ]
                    }),
                    processedActionEffects: []
                })
            ]
        });

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedBattleSquaddieId = jest.fn().mockReturnValue("player_soldier_0");
        mockHud.didPlayerSelectEndTurnAction = jest.fn().mockReturnValue(true);

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: mockHud,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    actionsThisRound,
                    recording: {history: []},
                }),
            }),
            repository: squaddieRepo,
        });

        clickOnMapCoordinate({
            selector,
            gameEngineState: state,
            q: 0,
            r: 0,
            camera
        });
        selector.update(state, mockedP5GraphicsContext);
        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(state.battleOrchestratorState.battleState.actionsThisRound.processedActions).toHaveLength(2);
        expect(state.battleOrchestratorState.battleState.actionsThisRound.processedActions[1].processedActionEffects).toHaveLength(1);
        expect(state.battleOrchestratorState.battleState.actionsThisRound.processedActions[1].processedActionEffects[0].type).toEqual(ActionEffectType.END_TURN);
        expect(ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound).type).toEqual(ActionEffectType.END_TURN);
    });

    it('can instruct squaddie to end turn when player clicks on End Turn button', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedBattleSquaddieId = jest.fn().mockReturnValue(playerSoldierBattleSquaddie.battleSquaddieId);
        mockHud.didPlayerSelectEndTurnAction = jest.fn().mockReturnValue(true);

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: mockHud,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    recording: {history: []},
                }),
            }),
            repository: squaddieRepo,
        });

        clickOnMapCoordinate({
            selector,
            gameEngineState: state,
            q: 0,
            r: 0,
            camera
        });

        expect(selector.hasCompleted(state)).toBeTruthy();
        const decidedActionEndTurnEffect = DecidedActionEndTurnEffectService.new({
            template: ActionEffectEndTurnTemplateService.new({}),
        });
        const processedAction = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                actionPointCost: 1,
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                actionTemplateName: "End Turn",
                actionEffects: [
                    decidedActionEndTurnEffect
                ]
            }),
            processedActionEffects: [
                ProcessedActionEndTurnEffectService.new({
                    decidedActionEffect: decidedActionEndTurnEffect,
                })
            ]
        });

        expect(ActionsThisRoundService.getProcessedActionToShow(state.battleOrchestratorState.battleState.actionsThisRound).processedActionEffects[0].type).toEqual(ActionEffectType.END_TURN);

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);

        const history = state.battleOrchestratorState.battleState.recording.history;
        expect(history).toHaveLength(1);
        expect(history[0]).toStrictEqual({
            results: undefined,
            processedAction,
        });
        expect(playerSoldierBattleSquaddie.squaddieTurn.remainingActionPoints).toEqual(0);
    });

    it('will recommend squaddie target if a SquaddieAction is selected that requires a target', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        const longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                    minimumRange: 0,
                    maximumRange: 1,
                    targetingShape: TargetingShape.SNAKE,
                }),
            ]
        });

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.getSelectedActionTemplate = jest.fn().mockReturnValue(longswordAction);
        mockHud.mouseClicked = jest.fn();
        mockHud.getSelectedBattleSquaddieId = jest.fn().mockReturnValue("player_soldier_0");
        mockHud.didPlayerSelectSquaddieAction = jest.fn().mockReturnValue(true);
        mockHud.getSquaddieSquaddieAction = jest.fn().mockReturnValue(longswordAction);

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: mockHud,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    recording: {history: []},
                }),
            }),
            repository: squaddieRepo,
        });
        clickOnMapCoordinate({
            selector,
            gameEngineState: state,
            q: 0,
            r: 0,
            camera
        });

        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId).toEqual("player_soldier_0");
        expect(state.battleOrchestratorState.battleState.actionsThisRound.startingLocation).toEqual({q: 0, r: 0});

        const recommendation: BattleOrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET);

        const history = state.battleOrchestratorState.battleState.recording.history;
        expect(history).toHaveLength(0);
        expect(state.battleOrchestratorState.battleState.actionsThisRound.previewedActionTemplateId).toEqual(longswordAction.id);
    });

    describe('squaddie must complete their turn before moving other squaddies', () => {
        let missionMap: MissionMap;
        let interruptSquaddieStatic: SquaddieTemplate;
        let interruptBattleSquaddie: BattleSquaddie;
        let actionsThisRound: ActionsThisRound;
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

            const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: {q: 0, r: 2},
            });
            actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: soldierSquaddieInfo.battleSquaddieId,
                startingLocation: soldierSquaddieInfo.mapLocation,
                previewedActionTemplateId: undefined,
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            actionPointCost: 1,
                            battleSquaddieId: soldierSquaddieInfo.battleSquaddieId,
                            actionTemplateName: "Move",
                            actionEffects: [
                                decidedActionMovementEffect
                            ]
                        }),
                        processedActionEffects: [
                            ProcessedActionMovementEffectService.new({
                                decidedActionEffect: decidedActionMovementEffect,
                            })
                        ]
                    })
                ]
            });

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            mockHud = new BattleSquaddieSelectedHUD();

            camera = new BattleCamera();
            selectSquaddieAndDrawWindowSpy = jest.spyOn(mockHud, "selectSquaddieAndDrawWindow");

            state = GameEngineStateService.new({
                resourceHandler: mockResourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: mockHud,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera,
                        battlePhaseState,
                        teams,
                        recording: {history: []},
                        actionsThisRound,
                    }),
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            });

            clickOnMapCoordinate({
                selector,
                gameEngineState: state,
                q: 0,
                r: 0,
                camera
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

            expect(selectSquaddieAndDrawWindowSpy.mock.calls[0][0].battleId).toEqual(playerSoldierBattleSquaddie.battleSquaddieId);
        });

        it('ignores movement commands issued to other squaddies', () => {
            expect(state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId).toEqual(actionsThisRound.battleSquaddieId);

            const location = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(interruptBattleSquaddie.battleSquaddieId);
            clickOnMapCoordinate({
                selector,
                gameEngineState: state,
                q: location.mapLocation.q,
                r: location.mapLocation.r,
                camera
            });

            expect(state.battleOrchestratorState.battleState.actionsThisRound).toEqual(actionsThisRound);
            expect(selector.hasCompleted(state)).toBeFalsy();
        });

        it('ignores action commands issued to other squaddies', () => {
            const longswordAction = ActionTemplateService.new({
                name: "longsword",
                id: "longsword",
                actionEffectTemplates: [
                    ActionEffectSquaddieTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues(),
                        minimumRange: 0,
                        maximumRange: 1,
                        targetingShape: TargetingShape.SNAKE,
                    })
                ]
            });

            mockHud.didPlayerSelectSquaddieAction = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);
            mockHud.getSelectedActionTemplate = jest.fn().mockReturnValue(longswordAction);
            mockHud.shouldDrawTheHUD = jest.fn().mockReturnValue(true);
            mockHud.didMouseClickOnHUD = jest.fn().mockImplementationOnce(() => {
                return false;
            }).mockReturnValue(true);
            mockHud.mouseClicked = jest.fn();

            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeTruthy();

            selector.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: 0,
                mouseY: 0
            });

            expect(state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId).toEqual(actionsThisRound.battleSquaddieId);
            expect(state.battleOrchestratorState.battleState.actionsThisRound.previewedActionTemplateId).toBeUndefined();
            expect(selector.hasCompleted(state)).toBeFalsy();
        });
    });

    it('will send key pressed events to the HUD', () => {
        const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);

        const camera: BattleCamera = new BattleCamera();

        let mockHud = mocks.battleSquaddieSelectedHUD();
        mockHud.keyPressed = jest.fn();

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: mockHud,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                }),
            }),
            repository: squaddieRepo,
        });

        selector.keyEventHappened(state, {
            eventType: OrchestratorComponentKeyEventType.PRESSED,
            keyCode: 0,
        });

        expect(mockHud.keyPressed).toHaveBeenCalled();
    });

    it('will accept commands even after canceling', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        const battlePhaseState: BattlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);
        const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
            template: ActionEffectMovementTemplateService.new({}),
            destination: {q: 0, r: 1},
        });
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
            startingLocation: {q: 0, r: 0},
            previewedActionTemplateId: undefined,
            processedActions: [
                ProcessedActionService.new({
                    decidedAction: DecidedActionService.new({
                        actionPointCost: 1,
                        battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                        actionTemplateName: "Move",
                        actionEffects: [
                            decidedActionMovementEffect
                        ]
                    }),
                    processedActionEffects: [
                        ProcessedActionMovementEffectService.new({
                            decidedActionEffect: decidedActionMovementEffect,
                        })
                    ]
                })
            ]
        });

        const camera: BattleCamera = new BattleCamera();

        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: mocks.mockResourceHandler(),
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap,
                    camera,
                    battlePhaseState,
                    teams,
                    actionsThisRound,
                    recording: {history: []},
                }),
            }),
            repository: squaddieRepo,
            campaign: CampaignService.default({}),
        });

        clickOnMapCoordinate({
            selector,
            gameEngineState: state,
            q: 0,
            r: 0,
            camera
        });

        clickOnMapCoordinate({
            selector,
            gameEngineState: state,
            q: 0,
            r: 1,
            camera
        });

        expect(state.battleOrchestratorState.battleState.actionsThisRound.processedActions).toHaveLength(2);
        expect(ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound).type).toEqual(ActionEffectType.MOVEMENT);
    });

    describe('selecting a different squaddie before and during a turn', () => {
        let missionMap: MissionMap;
        let gameEngineState: GameEngineState;
        let camera: BattleCamera;
        let selectSquaddieAndDrawWindowSpy: jest.SpyInstance;

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "]
                })
            });

            const battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);
            const playerTeam = teams.find(t => t.id === "playerTeamId");

            const anotherPlayerSoldierBattleSquaddie = BattleSquaddieService.new({
                squaddieTemplateId: "player_soldier",
                battleSquaddieId: "player_soldier_1",
            });

            ObjectRepositoryService.addBattleSquaddie(squaddieRepo, anotherPlayerSoldierBattleSquaddie);
            BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, ["player_soldier_1"]);
            MissionMapService.addSquaddie(missionMap, "player_soldier", "player_soldier_1", {q: 0, r: 2});

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));
            camera = new BattleCamera();

            const mockHud = new BattleSquaddieSelectedHUD();
            selectSquaddieAndDrawWindowSpy = jest.spyOn(mockHud, "selectSquaddieAndDrawWindow");
            gameEngineState = GameEngineStateService.new({
                resourceHandler: mockResourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: mockHud,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        camera,
                        battlePhaseState,
                        teams,
                        recording: {history: []},
                    }),
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            });
        });

        it('selects a different squaddie if the first squaddie has not started their turn', () => {
            const {mapLocation: firstBattleSquaddieMapLocation} = missionMap.getSquaddieByBattleId("player_soldier_0");
            clickOnMapCoordinate({
                selector,
                gameEngineState,
                q: firstBattleSquaddieMapLocation.q,
                r: firstBattleSquaddieMapLocation.r,
                camera
            });
            expect(selectSquaddieAndDrawWindowSpy).toBeCalledTimes(1);
            expect(selectSquaddieAndDrawWindowSpy.mock.calls[0][0]["battleId"]).toEqual("player_soldier_0");

            const {mapLocation: anotherBattleSquaddieMapLocation} = missionMap.getSquaddieByBattleId("player_soldier_1");
            clickOnMapCoordinate({
                selector,
                gameEngineState,
                q: anotherBattleSquaddieMapLocation.q,
                r: anotherBattleSquaddieMapLocation.r,
                camera
            });
            expect(selectSquaddieAndDrawWindowSpy).toBeCalledTimes(2);
            expect(selectSquaddieAndDrawWindowSpy.mock.calls[1][0]["battleId"]).toEqual("player_soldier_1");

            clickOnMapCoordinate({
                selector,
                gameEngineState,
                q: 0,
                r: 1,
                camera
            });
            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId).toEqual("player_soldier_1");
        });
        it('does not select a different squaddie if the first squaddie starts their turn', () => {
            const {mapLocation: firstBattleSquaddieMapLocation} = missionMap.getSquaddieByBattleId("player_soldier_0");
            clickOnMapCoordinate({
                selector,
                gameEngineState,
                q: firstBattleSquaddieMapLocation.q,
                r: firstBattleSquaddieMapLocation.r,
                camera
            });
            expect(selectSquaddieAndDrawWindowSpy).toBeCalledTimes(1);
            expect(selectSquaddieAndDrawWindowSpy.mock.calls[0][0]["battleId"]).toEqual("player_soldier_0");

            clickOnMapCoordinate({
                selector,
                gameEngineState,
                q: firstBattleSquaddieMapLocation.q,
                r: firstBattleSquaddieMapLocation.r + 1,
                camera
            });

            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId).toEqual(playerSoldierBattleSquaddie.battleSquaddieId);
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)).toBeTruthy();

            const {mapLocation: anotherBattleSquaddieMapLocation} = missionMap.getSquaddieByBattleId("player_soldier_1");
            clickOnMapCoordinate({
                selector,
                gameEngineState,
                q: anotherBattleSquaddieMapLocation.q,
                r: anotherBattleSquaddieMapLocation.r,
                camera
            });
            expect(selectSquaddieAndDrawWindowSpy).toBeCalledTimes(1);
        });
    });

    describe('swap HUD', () => {
        let hud: BattleSquaddieSelectedHUD;
        let battlePhaseState: BattlePhaseState;

        beforeEach(() => {
            hud = new BattleSquaddieSelectedHUD();
        });
        it('changes the HUD when the key is pressed and not in production', () => {
            battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);
            const gameEngineState: GameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(),
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: hud,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        battlePhaseState,
                        missionMap,
                        camera: new BattleCamera(),
                        teams,
                    }),
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            });
            expect(gameEngineState.battleOrchestratorState.battleHUDMode.hudMode).toEqual(BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD);
            selector.keyEventHappened(gameEngineState, {
                eventType: OrchestratorComponentKeyEventType.PRESSED,
                keyCode: config.KEYBOARD_SHORTCUTS[KeyButtonName.SWAP_HUD][0],
            });
            expect(gameEngineState.battleOrchestratorState.battleHUDMode.hudMode).toEqual(BATTLE_HUD_MODE.BATTLE_HUD_PANEL);
        });
        it('ignores change HUD command when it is not the player turn', () => {
            battlePhaseState = makeBattlePhaseTrackerWithEnemyTeam(missionMap);
            const gameEngineState: GameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(),
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: hud,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        battlePhaseState,
                        missionMap,
                        camera: new BattleCamera(),
                        teams,
                    }),
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            });
            expect(gameEngineState.battleOrchestratorState.battleHUDMode.hudMode).toEqual(BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD);
            selector.keyEventHappened(gameEngineState, {
                eventType: OrchestratorComponentKeyEventType.PRESSED,
                keyCode: config.KEYBOARD_SHORTCUTS[KeyButtonName.SWAP_HUD][0],
            });
            expect(gameEngineState.battleOrchestratorState.battleHUDMode.hudMode).toEqual(BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD);
        });
        it('ignores change HUD command when the player is mid turn', () => {
            battlePhaseState = makeBattlePhaseTrackerWithPlayerTeam(missionMap);
            const decidedActionMovementEffect = DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
                destination: {q: 0, r: 1},
            });
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                startingLocation: {q: 0, r: 0},
                previewedActionTemplateId: undefined,
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            actionPointCost: 1,
                            battleSquaddieId: playerSoldierBattleSquaddie.battleSquaddieId,
                            actionTemplateName: "Move",
                            actionEffects: [
                                decidedActionMovementEffect
                            ]
                        }),
                        processedActionEffects: [
                            ProcessedActionMovementEffectService.new({
                                decidedActionEffect: decidedActionMovementEffect,
                            })
                        ]
                    })
                ]
            });
            const gameEngineState: GameEngineState = GameEngineStateService.new({
                resourceHandler: mocks.mockResourceHandler(),
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: hud,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        battlePhaseState,
                        missionMap,
                        camera: new BattleCamera(),
                        teams,
                        actionsThisRound,
                    }),
                }),
                repository: squaddieRepo,
                campaign: CampaignService.default({}),
            });
            expect(gameEngineState.battleOrchestratorState.battleHUDMode.hudMode).toEqual(BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD);
            selector.keyEventHappened(gameEngineState, {
                eventType: OrchestratorComponentKeyEventType.PRESSED,
                keyCode: config.KEYBOARD_SHORTCUTS[KeyButtonName.SWAP_HUD][0],
            });
            expect(gameEngineState.battleOrchestratorState.battleHUDMode.hudMode).toEqual(BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD);
        });
    });
});

const clickOnMapCoordinate = ({
                                  selector,
                                  gameEngineState,
                                  q,
                                  r,
                                  camera
                              }: {
    selector: BattlePlayerSquaddieSelector,
    gameEngineState: GameEngineState,
    q: number,
    r: number,
    camera: BattleCamera
}) => {
    let [destinationScreenX, destinationScreenY] = convertMapCoordinatesToScreenCoordinates(
        q,
        r,
        ...camera.getCoordinates()
    );
    selector.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.CLICKED,
        mouseX: destinationScreenX,
        mouseY: destinationScreenY
    });
}
