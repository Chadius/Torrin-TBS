import {ObjectRepository, ObjectRepositoryService} from "../battle/objectRepository";
import {GameEngineState, GameEngineStateService} from "../gameEngine/gameEngine";
import {SquaddieTemplate, SquaddieTemplateService} from "../campaign/squaddieTemplate";
import {BattleSquaddie, BattleSquaddieService} from "../battle/battleSquaddie";
import {ActionTemplate, ActionTemplateService} from "../action/template/actionTemplate";
import {ResourceHandler} from "../resource/resourceHandler";
import {MissionMap, MissionMapService} from "../missionMap/missionMap";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../action/template/actionEffectSquaddieTemplate";
import {Trait, TraitStatusStorageService} from "../trait/traitStatusStorage";
import {SquaddieIdService} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import * as mocks from "../utils/test/mocks";
import {MockedP5GraphicsContext} from "../utils/test/mocks";
import {makeResult} from "../utils/ResultOrError";
import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {BattlePhaseStateService} from "../battle/orchestratorComponents/battlePhaseController";
import {BattlePhase} from "../battle/orchestratorComponents/battlePhaseTracker";
import {BattlePlayerSquaddieTarget} from "../battle/orchestratorComponents/battlePlayerSquaddieTarget";
import {ActionsThisRound, ActionsThisRoundService} from "../battle/history/actionsThisRound";
import {BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {BattleStateService} from "../battle/orchestrator/battleState";
import {BattleCamera} from "../battle/battleCamera";
import {CampaignService} from "../campaign/campaign";
import {OrchestratorComponentMouseEventType} from "../battle/orchestrator/battleOrchestratorComponent";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {BattleOrchestratorMode} from "../battle/orchestrator/battleOrchestrator";
import {ProcessedActionService} from "../action/processed/processedAction";
import {ProcessedActionSquaddieEffectService} from "../action/processed/processedActionSquaddieEffect";
import {DecidedActionSquaddieEffectService} from "../action/decided/decidedActionSquaddieEffect";
import {OrchestratorUtilities} from "../battle/orchestratorComponents/orchestratorUtils";
import {convertMapCoordinatesToScreenCoordinates} from "../hexMap/convertCoordinates";

describe('User cancels the previewed action', () => {
    let repository: ObjectRepository;
    let gameEngineState: GameEngineState;

    let playerSquaddieTemplate: SquaddieTemplate;
    let playerBattleSquaddie: BattleSquaddie;

    let attackAction: ActionTemplate;

    let resourceHandler: ResourceHandler;
    let missionMap: MissionMap;

    let targeting: BattlePlayerSquaddieTarget;
    let graphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        repository = ObjectRepositoryService.new();
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
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

        targeting = new BattlePlayerSquaddieTarget();
        graphicsContext = new MockedP5GraphicsContext();
    });

    describe('when the user clicks on canceling the target', () => {
        let hexMapHighlightTilesSpy: jest.SpyInstance;

        beforeEach(() => {
            gameEngineState = getGameEngineState({
                repository,
                actionsThisRound: ActionsThisRoundService.new({
                    battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                    startingLocation: {q: 0, r: 0},
                    previewedActionTemplateId: attackAction.name,
                    processedActions: [],
                }),
            });
            MissionMapService.addSquaddie(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                playerSquaddieTemplate.squaddieId.templateId,
                playerBattleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0
                });

            targeting.update(gameEngineState, graphicsContext);
            hexMapHighlightTilesSpy = jest.spyOn(gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap, "highlightTiles");
            targeting.mouseEventHappened(
                gameEngineState,
                {
                    eventType: OrchestratorComponentMouseEventType.CLICKED,
                    mouseX: ScreenDimensions.SCREEN_WIDTH,
                    mouseY: ScreenDimensions.SCREEN_HEIGHT,
                }
            );
        });

        it('completes the targeting module', () => {
            expect(targeting.hasCompleted(gameEngineState)).toBeTruthy();
        });

        it('highlights the map', () => {
            targeting.recommendStateChanges(gameEngineState);
            expect(hexMapHighlightTilesSpy).toBeCalled();
        });

        it('If the user clicks cancel the target, clear the previewed power in ActionsThisRound', () => {
            const recommendedInfo = targeting.recommendStateChanges(gameEngineState);
            expect(recommendedInfo.nextMode).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound).toBeUndefined();
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)).toBeFalsy();
        });
    });

    it('Ensure if this is the 2nd action the user cannot cancel their turn.', () => {
        gameEngineState = getGameEngineState({
            repository,
            actionsThisRound: ActionsThisRoundService.new({
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                startingLocation: {q: 0, r: 0},
                previewedActionTemplateId: attackAction.name,
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: undefined,
                        processedActionEffects: [
                            ProcessedActionSquaddieEffectService.new({
                                decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                    template: attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                    target: {q: 0, r: 1},
                                }),
                                results: undefined,
                            }),
                        ]
                    }),
                ],
            })
        });
        MissionMapService.addSquaddie(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            playerSquaddieTemplate.squaddieId.templateId,
            playerBattleSquaddie.battleSquaddieId,
            {
                q: 0,
                r: 0
            });

        targeting.update(gameEngineState, graphicsContext);
        targeting.mouseEventHappened(
            gameEngineState,
            {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            }
        );

        expect(targeting.hasCompleted(gameEngineState)).toBeTruthy();
        targeting.recommendStateChanges(gameEngineState);
        expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId).toEqual(playerBattleSquaddie.battleSquaddieId);
        expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound.processedActions).toHaveLength(1);
        expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)).toBeTruthy();
    });

    it('After Clicking a target, Canceling the confirmation should not change ActionsThisRound - we’re still previewing', () => {
        const enemySquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                templateId: "enemy",
            }),
            actionTemplates: [attackAction],
        });
        ObjectRepositoryService.addSquaddieTemplate(repository, enemySquaddieTemplate);

        const enemyBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: enemySquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "enemy 0",
        });
        ObjectRepositoryService.addBattleSquaddie(repository, enemyBattleSquaddie);

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            startingLocation: {q: 0, r: 0},
            previewedActionTemplateId: attackAction.name,
            processedActions: [
                ProcessedActionService.new({
                    decidedAction: undefined,
                    processedActionEffects: [
                        ProcessedActionSquaddieEffectService.new({
                            decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                template: attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                target: {q: 0, r: 1},
                            }),
                            results: undefined,
                        }),
                    ]
                }),
            ],
        });

        gameEngineState = getGameEngineState({
            repository,
            actionsThisRound: actionsThisRound
        });
        MissionMapService.addSquaddie(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            enemySquaddieTemplate.squaddieId.templateId,
            enemyBattleSquaddie.battleSquaddieId,
            {
                q: 0,
                r: 1
            });
        MissionMapService.addSquaddie(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            playerSquaddieTemplate.squaddieId.templateId,
            playerBattleSquaddie.battleSquaddieId,
            {
                q: 0,
                r: 0
            });

        targeting.update(gameEngineState, graphicsContext);

        let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 1, ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates());
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY
        });
        targeting.update(gameEngineState, graphicsContext);

        expect(targeting.hasSelectedValidTarget).toBeTruthy();

        targeting.mouseEventHappened(
            gameEngineState,
            {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            }
        );

        expect(targeting.hasSelectedValidTarget).toBeFalsy();
        expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound).toEqual(actionsThisRound);
    });
});

const getGameEngineState = ({
                                repository,
                                actionsThisRound,
                            }: {
    repository: ObjectRepository,
    actionsThisRound?: ActionsThisRound,
}): GameEngineState => {
    return GameEngineStateService.new({
        battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                camera: new BattleCamera(0, 0),
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
                actionsThisRound,
                missionMap: MissionMapService.new({
                    terrainTileMap: new TerrainTileMap({
                        movementCost: [
                            "1 1 "
                        ]
                    })
                })
            }),
        }),
        repository,
        campaign: CampaignService.default({}),
    });
}
