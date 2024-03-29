import {ObjectRepository, ObjectRepositoryService} from "../battle/objectRepository";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battle/battleSquaddieTeam";
import {SquaddieTemplate, SquaddieTemplateService} from "../campaign/squaddieTemplate";
import {BattleSquaddie, BattleSquaddieService} from "../battle/battleSquaddie";
import {ActionTemplate, ActionTemplateService} from "../action/template/actionTemplate";
import {BattleSquaddieSelectedHUD} from "../battle/hud/battleSquaddieSelectedHUD";
import {ResourceHandler} from "../resource/resourceHandler";
import {MissionMap, MissionMapService} from "../missionMap/missionMap";
import {ActionEffectSquaddieTemplateService} from "../action/template/actionEffectSquaddieTemplate";
import {Trait, TraitStatusStorageService} from "../trait/traitStatusStorage";
import {SquaddieIdService} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import * as mocks from "../utils/test/mocks";
import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {makeResult} from "../utils/ResultOrError";
import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {BattlePhaseState, BattlePhaseStateService} from "../battle/orchestratorComponents/battlePhaseController";
import {ActionsThisRound, ActionsThisRoundService} from "../battle/history/actionsThisRound";
import {GameEngineState, GameEngineStateService} from "../gameEngine/gameEngine";
import {BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {BattleStateService} from "../battle/orchestrator/battleState";
import {BattleCamera} from "../battle/battleCamera";
import {CampaignService} from "../campaign/campaign";
import {RectAreaService} from "../ui/rectArea";
import {DecidedActionService} from "../action/decided/decidedAction";
import {
    DecidedActionEndTurnEffect,
    DecidedActionEndTurnEffectService
} from "../action/decided/decidedActionEndTurnEffect";
import {ActionEffectEndTurnTemplateService} from "../action/template/actionEffectEndTurnTemplate";
import {BattlePhase} from "../battle/orchestratorComponents/battlePhaseTracker";
import {BattlePlayerSquaddieSelector} from "../battle/orchestratorComponents/battlePlayerSquaddieSelector";
import {convertMapCoordinatesToScreenCoordinates} from "../hexMap/convertCoordinates";
import {OrchestratorComponentMouseEventType} from "../battle/orchestrator/battleOrchestratorComponent";
import {SquaddieTurnService} from "../squaddie/turn";
import {OrchestratorUtilities} from "../battle/orchestratorComponents/orchestratorUtils";
import {BattleOrchestratorMode} from "../battle/orchestrator/battleOrchestrator";
import {
    ACTION_COMPLETED_WAIT_TIME_MS,
    BattleSquaddieUsesActionOnMap
} from "../battle/orchestratorComponents/battleSquaddieUsesActionOnMap";
import {ProcessedActionEndTurnEffectService} from "../action/processed/processedActionEndTurnEffect";
import {ProcessedActionService} from "../action/processed/processedAction";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {DrawSquaddieUtilities} from "../battle/animation/drawSquaddie";
import {BattleEventService} from "../battle/history/battleEvent";

describe('User ends their turn', () => {
    let repository: ObjectRepository;
    let gameEngineState: GameEngineState;

    let playerTeam: BattleSquaddieTeam;
    let playerSquaddieTemplate: SquaddieTemplate;
    let playerBattleSquaddie: BattleSquaddie;

    let attackAction: ActionTemplate;

    let battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;

    let resourceHandler: ResourceHandler;
    let missionMap: MissionMap;

    beforeEach(() => {
        repository = ObjectRepositoryService.new();
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    })
                })
            ]
        });

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplates: [attackAction],
        });
        ObjectRepositoryService.addSquaddieTemplate(repository, playerSquaddieTemplate);

        playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        });
        ObjectRepositoryService.addBattleSquaddie(repository, playerBattleSquaddie);

        playerTeam = BattleSquaddieTeamService.new({
            name: "player team",
            id: "player",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
        });

        battleSquaddieSelectedHUD = new BattleSquaddieSelectedHUD();

        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        resourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });
        MissionMapService.addSquaddie(missionMap, playerSquaddieTemplate.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
            q: 0,
            r: 0
        });

        gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository,
            teams: [playerTeam],
            battlePhaseState: BattlePhaseStateService.new({
                currentAffiliation: BattlePhase.PLAYER,
                turnCount: 0,
            }),
        });
        gameEngineState.battleOrchestratorState.battleSquaddieSelectedHUD = battleSquaddieSelectedHUD;

        selectSquaddieForTheHUD({
            battleSquaddie: playerBattleSquaddie,
            battleSquaddieSelectedHUD,
            gameEngineState,
        });
    });

    it('HUD knows the user selected end turn', () => {
        battleSquaddieSelectedHUD.mouseClicked(
            RectAreaService.centerX(battleSquaddieSelectedHUD.endTurnButton.rectangle.area),
            RectAreaService.centerY(battleSquaddieSelectedHUD.endTurnButton.rectangle.area),
            gameEngineState,
        );

        expect(battleSquaddieSelectedHUD.didPlayerSelectEndTurnAction()).toBeTruthy();
        expect(battleSquaddieSelectedHUD.didPlayerSelectSquaddieAction()).toBeFalsy();
    });

    it('EndTurn adds a ProcessedAction to end the turn', () => {
        const selector = new BattlePlayerSquaddieSelector();
        let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates());
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        });

        expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound).toBeUndefined();

        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: RectAreaService.centerX(battleSquaddieSelectedHUD.endTurnButton.rectangle.area),
            mouseY: RectAreaService.centerY(battleSquaddieSelectedHUD.endTurnButton.rectangle.area),
        });

        const actionsThisRound = gameEngineState.battleOrchestratorState.battleState.actionsThisRound;
        expect(actionsThisRound.processedActions).toHaveLength(1);

        const processedAction = actionsThisRound.processedActions[0];

        const decidedActionEndTurnEffect = DecidedActionEndTurnEffectService.new({
            template: ActionEffectEndTurnTemplateService.new({})
        });
        expect(processedAction.processedActionEffects).toHaveLength(1);
        expect(processedAction.processedActionEffects[0]).toEqual(
            ProcessedActionEndTurnEffectService.new({
                decidedActionEffect: decidedActionEndTurnEffect,
            })
        );
        expect(processedAction.decidedAction).toEqual(
            DecidedActionService.new({
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                actionTemplateName: "End Turn",
                actionEffects: [
                    decidedActionEndTurnEffect
                ]
            })
        );
    });

    describe('player squaddie selector reacts to ending the turn', () => {
        let selector: BattlePlayerSquaddieSelector;
        let highlightTileSpy: jest.SpyInstance;

        beforeEach(() => {
            highlightTileSpy = jest.spyOn(missionMap.terrainTileMap, "stopHighlightingTiles");
            selector = new BattlePlayerSquaddieSelector();
            let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates());
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
            });

            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: RectAreaService.centerX(battleSquaddieSelectedHUD.endTurnButton.rectangle.area),
                mouseY: RectAreaService.centerY(battleSquaddieSelectedHUD.endTurnButton.rectangle.area),
            });
        });

        afterEach(() => {
            highlightTileSpy.mockClear();
        })

        it('Selector has completed and HUD is no longer drawn', () => {
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy();
            selector.reset(gameEngineState);
            expect(battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });

        it('ends the squaddie turn', () => {
            expect(playerBattleSquaddie.squaddieTurn.remainingActionPoints).toEqual(0);
            expect(SquaddieTurnService.hasActionPointsRemaining(playerBattleSquaddie.squaddieTurn)).toBeFalsy();
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)).toBeTruthy();
        });

        it('tells the map to stop highlighting tiles', () => {
            expect(highlightTileSpy).toBeCalled();
        });

        it('Mode switches to MapAction phase', () => {
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy();
            const changes = selector.recommendStateChanges(gameEngineState);
            expect(changes.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
        });

        it('It adds an event showing the processed action', () => {
            const decidedActionEndTurnEffect = DecidedActionEndTurnEffectService.new({
                template: ActionEffectEndTurnTemplateService.new({})
            });

            expect(gameEngineState.battleOrchestratorState.battleState.recording.history).toContainEqual(
                BattleEventService.new({
                    processedAction: ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
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
                    }),
                    results: undefined,
                }),
            );
        });
    });

    describe('When MapAction phase completes', () => {
        let mapAction: BattleSquaddieUsesActionOnMap;
        let graphicsContext: GraphicsContext;
        let decidedActionEndTurnEffect: DecidedActionEndTurnEffect;
        let tintSpy: jest.SpyInstance;

        beforeEach(() => {
            decidedActionEndTurnEffect = DecidedActionEndTurnEffectService.new({
                template: ActionEffectEndTurnTemplateService.new({})
            });
            graphicsContext = new MockedP5GraphicsContext();
            mapAction = new BattleSquaddieUsesActionOnMap();
            gameEngineState = GameEngineStateService.new({
                repository: repository,
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: undefined,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        actionsThisRound: ActionsThisRoundService.new({
                            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                            startingLocation: {q: 0, r: 0},
                            processedActions: [
                                ProcessedActionService.new({
                                    decidedAction: DecidedActionService.new({
                                        battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                                        actionEffects: [
                                            decidedActionEndTurnEffect
                                        ]
                                    }),
                                    processedActionEffects: [
                                        ProcessedActionEndTurnEffectService.new({
                                            decidedActionEffect: decidedActionEndTurnEffect,
                                        })
                                    ]
                                })
                            ]
                        }),
                    }),
                }),
                campaign: CampaignService.default({}),
            })
            tintSpy = jest.spyOn(DrawSquaddieUtilities, "tintSquaddieMapIconIfTheyCannotAct");

            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            mapAction.update(gameEngineState, graphicsContext);
            jest.spyOn(Date, 'now').mockImplementation(() => ACTION_COMPLETED_WAIT_TIME_MS + 1);
            mapAction.update(gameEngineState, graphicsContext);
        });

        it('component is completed', () => {
            expect(mapAction.hasCompleted(gameEngineState)).toBeTruthy();
        });
        it('It iterates to the next processed action to show', () => {
            let nextAction = ActionsThisRoundService.getProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound);
            expect(nextAction).toEqual(
                ProcessedActionEndTurnEffectService.new({
                    decidedActionEffect: decidedActionEndTurnEffect,
                })
            );
            mapAction.recommendStateChanges(gameEngineState);
            mapAction.reset(gameEngineState);
            nextAction = ActionsThisRoundService.getProcessedActionEffectToShow(gameEngineState.battleOrchestratorState.battleState.actionsThisRound);
            expect(nextAction).toBeUndefined();
        });
        it('It clears ActionsThisRound when there are no more actions to process', () => {
            mapAction.recommendStateChanges(gameEngineState);
            mapAction.reset(gameEngineState);
            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound).toBeUndefined();
        });
        it('The squaddie is grayed out since it is out of actions', () => {
            expect(tintSpy).toBeCalled();
        });
    });
});

const getGameEngineState = ({
                                resourceHandler,
                                missionMap,
                                repository,
                                teams,
                                battlePhaseState,
                                actionsThisRound,
                            }: {
    resourceHandler: ResourceHandler,
    missionMap: MissionMap,
    repository: ObjectRepository,
    teams: BattleSquaddieTeam[],
    battlePhaseState: BattlePhaseState,
    actionsThisRound?: ActionsThisRound,
}): GameEngineState => {
    return GameEngineStateService.new({
        resourceHandler: resourceHandler,
        battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                missionMap,
                camera: new BattleCamera(0, 0),
                teams,
                battlePhaseState,
                actionsThisRound,
            }),
        }),
        repository,
        campaign: CampaignService.default({}),
    });
}

const selectSquaddieForTheHUD = ({
                                     battleSquaddie,
                                     battleSquaddieSelectedHUD,
                                     gameEngineState,
                                 }: {
    battleSquaddie: BattleSquaddie,
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD,
    gameEngineState: GameEngineState,
}) => {
    battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
        battleId: battleSquaddie.battleSquaddieId,
        state: gameEngineState,
        repositionWindow: {mouseX: 0, mouseY: 0},
    });
}
