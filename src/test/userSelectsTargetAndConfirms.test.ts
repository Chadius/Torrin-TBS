import {ObjectRepository, ObjectRepositoryService} from "../battle/objectRepository";
import {GameEngineState, GameEngineStateService} from "../gameEngine/gameEngine";
import {SquaddieTemplate, SquaddieTemplateService} from "../campaign/squaddieTemplate";
import {BattleSquaddie, BattleSquaddieService} from "../battle/battleSquaddie";
import {ActionTemplate, ActionTemplateService} from "../action/template/actionTemplate";
import {ResourceHandler} from "../resource/resourceHandler";
import {MissionMap, MissionMapService} from "../missionMap/missionMap";
import {BattlePlayerSquaddieTarget} from "../battle/orchestratorComponents/battlePlayerSquaddieTarget";
import * as mocks from "../utils/test/mocks";
import {MockedP5GraphicsBuffer} from "../utils/test/mocks";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../action/template/actionEffectSquaddieTemplate";
import {Trait, TraitStatusStorageService} from "../trait/traitStatusStorage";
import {SquaddieIdService} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {makeResult} from "../utils/ResultOrError";
import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {ActionsThisRound, ActionsThisRoundService} from "../battle/history/actionsThisRound";
import {BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {BattleStateService} from "../battle/orchestrator/battleState";
import {BattleCamera} from "../battle/battleCamera";
import {BattlePhaseStateService} from "../battle/orchestratorComponents/battlePhaseController";
import {BattlePhase} from "../battle/orchestratorComponents/battlePhaseTracker";
import {CampaignService} from "../campaign/campaign";
import {ProcessedActionService} from "../action/processed/processedAction";
import {ProcessedActionSquaddieEffectService} from "../action/processed/processedActionSquaddieEffect";
import {
    DecidedActionSquaddieEffect,
    DecidedActionSquaddieEffectService
} from "../action/decided/decidedActionSquaddieEffect";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {convertMapCoordinatesToScreenCoordinates} from "../hexMap/convertCoordinates";
import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../battle/orchestrator/battleOrchestratorComponent";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {DegreeOfSuccess} from "../battle/actionCalculator/degreeOfSuccess";
import {BattleOrchestratorMode} from "../battle/orchestrator/battleOrchestrator";
import {SquaddieTargetsOtherSquaddiesAnimator} from "../battle/animation/squaddieTargetsOtherSquaddiesAnimatior";
import {BattleSquaddieUsesActionOnSquaddie} from "../battle/orchestratorComponents/battleSquaddieUsesActionOnSquaddie";
import {DamageType} from "../squaddie/squaddieService";
import {SquaddieSkipsAnimationAnimator} from "../battle/animation/squaddieSkipsAnimationAnimator";
import {DecidedActionService} from "../action/decided/decidedAction";
import {MouseButton} from "../utils/mouseConfig";
import {config} from "../configuration/config";
import {KeyButtonName} from "../utils/keyboardConfig";
import {GraphicsBuffer} from "../utils/graphics/graphicsRenderer";

describe('User Selects Target and Confirms', () => {
    let repository: ObjectRepository;
    let gameEngineState: GameEngineState;

    let playerSquaddieTemplate: SquaddieTemplate;
    let playerBattleSquaddie: BattleSquaddie;
    let player2BattleSquaddie: BattleSquaddie;

    let enemySquaddieTemplate: SquaddieTemplate;
    let enemyBattleSquaddie: BattleSquaddie;

    let attackAction: ActionTemplate;

    let resourceHandler: ResourceHandler;
    let missionMap: MissionMap;

    let targeting: BattlePlayerSquaddieTarget;
    let graphicsContext: MockedP5GraphicsBuffer

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
                        [Trait.ALWAYS_SUCCEEDS]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {[DamageType.BODY]: 1},
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

        player2BattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 2",
        });
        ObjectRepositoryService.addBattleSquaddie(repository, player2BattleSquaddie);

        graphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(graphicsContext)
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        resourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 "]
            })
        });
        MissionMapService.addSquaddie(missionMap, playerSquaddieTemplate.squaddieId.templateId, playerBattleSquaddie.battleSquaddieId, {
            q: 0,
            r: 1
        });

        enemySquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                templateId: "enemy",
            }),
            actionTemplates: [attackAction],
        });
        ObjectRepositoryService.addSquaddieTemplate(repository, enemySquaddieTemplate);

        enemyBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: enemySquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "enemy 0",
        });
        ObjectRepositoryService.addBattleSquaddie(repository, enemyBattleSquaddie);

        targeting = new BattlePlayerSquaddieTarget();
    });

    it('Clicking a target should show the confirmation window', () => {
        const actionsThisRound = useActionTemplateOnLocation({
            actionTemplate: attackAction,
            attackerBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            targetLocation: {q: 0, r: 2},
        });
        gameEngineState = getGameEngineState({
            repository,
            actionsThisRound: actionsThisRound,
            missionMap,
        });
        MissionMapService.addSquaddie(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            enemySquaddieTemplate.squaddieId.templateId,
            enemyBattleSquaddie.battleSquaddieId,
            {
                q: 0,
                r: 2
            });

        targeting.update(gameEngineState, graphicsContext);

        let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 2, ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates());
        targeting.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        });
        targeting.update(gameEngineState, graphicsContext);

        expect(targeting.hasSelectedValidTarget).toBeTruthy();
        expect(targeting.shouldDrawConfirmWindow()).toBeTruthy();
        expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound.processedActions).toHaveLength(1);
        expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound.processedActions[0].decidedAction).toEqual(
            DecidedActionService.new({
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                actionTemplateName: attackAction.name,
                actionTemplateId: attackAction.id,
                actionPointCost: attackAction.actionPoints,
                actionEffects: [
                    DecidedActionSquaddieEffectService.new({
                        template: attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                        target: {q: 0, r: 2},
                    })
                ]
            })
        );
        expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound.processedActions[0].processedActionEffects).toHaveLength(0);
    });

    describe('Confirming attack', () => {
        let actionsThisRound: ActionsThisRound;

        beforeEach(() => {
            ({gameEngineState, actionsThisRound} = clickOnEnemy({
                actionTemplate: attackAction,
                attackerBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                targetBattleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                targetBattleTemplateId: enemyBattleSquaddie.squaddieTemplateId,
                targeting,
                repository,
                missionMap,
                graphicsContext
            }))
        });

        const confirmMethods = [
            {
                name: "mouse clicks confirm",
                action: () => {
                    clickOnConfirmTarget({targeting, gameEngineState});
                }
            },
            {
                name: "keyboard presses accept",
                action: () => {
                    keyboardPressToConfirmTarget({targeting, gameEngineState});
                }
            },
        ];

        it.each(confirmMethods)(`After Squaddie Targets is confirmed, will process the first action template via $name`, ({
                                                                                                                              name,
                                                                                                                              action,
                                                                                                                          }) => {
            action();
            expect(gameEngineState.battleOrchestratorState.battleState.actionsThisRound).toEqual(
                ActionsThisRoundService.new({
                    battleSquaddieId: actionsThisRound.battleSquaddieId,
                    startingLocation: actionsThisRound.startingLocation,
                    previewedActionTemplateId: undefined,
                    processedActions: [
                        ProcessedActionService.new({
                            decidedAction: actionsThisRound.processedActions[0].decidedAction,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    decidedActionEffect: actionsThisRound.processedActions[0].decidedAction.actionEffects[0] as DecidedActionSquaddieEffect,
                                    results: {
                                        actingBattleSquaddieId: "player 0",
                                        actingSquaddieModifiers: {},
                                        actingSquaddieRoll: {
                                            occurred: false,
                                            rolls: [],
                                        },
                                        resultPerTarget: {
                                            [enemyBattleSquaddie.battleSquaddieId]: {
                                                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                                                damageTaken: 1,
                                                healingReceived: 0,
                                            },
                                        },
                                        targetedBattleSquaddieIds: ["enemy 0",],
                                    },
                                })
                            ]
                        })
                    ]
                })
            );
        });

        it.each(confirmMethods)(`Knows the targeting system is done via $name`, ({
                                                                                     name,
                                                                                     action,
                                                                                 }) => {
            action();
            expect(targeting.hasCompleted(gameEngineState)).toBeTruthy();
        });

        it.each(confirmMethods)(`Next mode should be the Squaddie Actor via $name`, ({
                                                                                         name,
                                                                                         action,
                                                                                     }) => {
            action();
            const battleOrchestratorChanges = targeting.recommendStateChanges(gameEngineState);
            expect(battleOrchestratorChanges.nextMode).toEqual(BattleOrchestratorMode.PLAYER_HUD_CONTROLLER)
        });
    });

    describe('Canceling attack', () => {
        let actionsThisRound: ActionsThisRound;

        beforeEach(() => {
            ({gameEngineState, actionsThisRound} = clickOnEnemy({
                actionTemplate: attackAction,
                attackerBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                targetBattleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                targetBattleTemplateId: enemyBattleSquaddie.squaddieTemplateId,
                targeting,
                repository,
                missionMap,
                graphicsContext
            }))
        });

        const cancelMethods = [
            {
                name: "mouse clicks ACCEPT on lower right corner",
                action: () => {
                    targeting.mouseEventHappened(
                        gameEngineState,
                        {
                            eventType: OrchestratorComponentMouseEventType.CLICKED,
                            mouseX: ScreenDimensions.SCREEN_WIDTH,
                            mouseY: ScreenDimensions.SCREEN_HEIGHT,
                            mouseButton: MouseButton.ACCEPT,
                        }
                    );
                }
            },
            {
                name: "mouse clicks CANCEL",
                action: () => {
                    targeting.mouseEventHappened(
                        gameEngineState,
                        {
                            eventType: OrchestratorComponentMouseEventType.CLICKED,
                            mouseX: 0,
                            mouseY: 0,
                            mouseButton: MouseButton.CANCEL,
                        }
                    );
                }
            },
            {
                name: "keyboard presses CANCEL",
                action: () => {
                    targeting.keyEventHappened(
                        gameEngineState,
                        {
                            eventType: OrchestratorComponentKeyEventType.PRESSED,
                            keyCode: config.KEYBOARD_SHORTCUTS[KeyButtonName.CANCEL][0],
                        }
                    )
                }
            },
        ]

        it.each(cancelMethods)(`does not complete the targeting module via $name`, ({
                                                                                        name,
                                                                                        action,
                                                                                    }) => {
            action();
            expect(targeting.hasCompleted(gameEngineState)).toBeFalsy();
        });

        it.each(cancelMethods)(`did not select a valid target via $name`, ({
                                                                               name,
                                                                               action,
                                                                           }) => {
            action();
            expect(targeting.hasSelectedValidTarget).toBeFalsy();
        });

        it.each(cancelMethods)(`did not confirm an action via $name`, ({
                                                                           name,
                                                                           action,
                                                                       }) => {
            action();
            expect(actionsThisRound.previewedActionTemplateId).toEqual(attackAction.id);
            expect(actionsThisRound.processedActions).toHaveLength(0);
        });
    });

    describe('Animator chooses correct mode', () => {
        let squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie;
        let squaddieTargetsOtherSquaddiesAnimatorUpdateSpy: jest.SpyInstance;
        let squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy: jest.SpyInstance;
        let squaddieSkipsAnimationAnimatorUpdateSpy: jest.SpyInstance;
        let squaddieSkipsAnimationAnimatorHasCompletedSpy: jest.SpyInstance;

        beforeEach(() => {
            squaddieUsesActionOnSquaddie = new BattleSquaddieUsesActionOnSquaddie();
            squaddieTargetsOtherSquaddiesAnimatorUpdateSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(false);

            squaddieSkipsAnimationAnimatorUpdateSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator, "update").mockImplementation();
            squaddieSkipsAnimationAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator, "hasCompleted").mockReturnValue(false);
        });

        it('If the action animates we should switch to SquaddieSquaddieAnimation', () => {
            ({gameEngineState} = clickOnEnemy({
                actionTemplate: attackAction,
                attackerBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                targetBattleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                targetBattleTemplateId: enemyBattleSquaddie.squaddieTemplateId,
                targeting,
                repository,
                missionMap,
                graphicsContext
            }))
            clickOnConfirmTarget({targeting, gameEngineState});

            targeting.recommendStateChanges(gameEngineState);
            targeting.reset(gameEngineState);

            squaddieUsesActionOnSquaddie.update(gameEngineState, graphicsContext);

            expect(squaddieUsesActionOnSquaddie.squaddieActionAnimator).toBeInstanceOf(SquaddieTargetsOtherSquaddiesAnimator);
            expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled();
            expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
            expect(squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)).toBeFalsy();
        });

        it('If the action does not animate we should switch to the non-animating phase', () => {
            (attackAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate).traits.booleanTraits[Trait.SKIP_ANIMATION] = true;

            ({gameEngineState} = clickOnEnemy({
                actionTemplate: attackAction,
                attackerBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                targetBattleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                targetBattleTemplateId: enemyBattleSquaddie.squaddieTemplateId,
                targeting,
                repository,
                missionMap,
                graphicsContext
            }))
            clickOnConfirmTarget({targeting, gameEngineState});

            targeting.recommendStateChanges(gameEngineState);
            targeting.reset(gameEngineState);

            squaddieUsesActionOnSquaddie.update(gameEngineState, graphicsContext);

            expect(squaddieUsesActionOnSquaddie.squaddieActionAnimator).toBeInstanceOf(SquaddieSkipsAnimationAnimator);
            expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled();
            expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled();
            expect(squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)).toBeFalsy();
        });
    });
});

const getGameEngineState = ({
                                repository,
                                actionsThisRound,
                                missionMap,
                            }: {
    repository: ObjectRepository,
    actionsThisRound?: ActionsThisRound,
    missionMap: MissionMap,
}): GameEngineState => {
    return GameEngineStateService.new({
        battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                camera: new BattleCamera(0, 0),
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
                actionsThisRound,
                missionMap,
            }),
        }),
        repository,
        campaign: CampaignService.default({}),
    });
}

const useActionTemplateOnLocation = ({
                                         actionTemplate,
                                         attackerBattleSquaddieId,
                                         targetLocation,
                                     }: {
    actionTemplate: ActionTemplate,
    attackerBattleSquaddieId: string,
    targetLocation: HexCoordinate,
}): ActionsThisRound => {
    return ActionsThisRoundService.new({
        battleSquaddieId: attackerBattleSquaddieId,
        startingLocation: {q: 0, r: 0},
        previewedActionTemplateId: actionTemplate.id,
        processedActions: [
            ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    battleSquaddieId: attackerBattleSquaddieId,
                    actionTemplateName: actionTemplate.name,
                    actionTemplateId: actionTemplate.id,
                    actionPointCost: actionTemplate.actionPoints,
                    actionEffects: [
                        DecidedActionSquaddieEffectService.new({
                            template: actionTemplate.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                            target: {q: 0, r: 2},
                        })
                    ]
                }),
                processedActionEffects: [],
            }),
        ],
    });
}

const clickOnEnemy = ({
                          actionTemplate,
                          attackerBattleSquaddieId,
                          targetBattleSquaddieId,
                          targetBattleTemplateId,
                          targeting,
                          repository,
                          missionMap,
                          graphicsContext
                      }: {
    actionTemplate: ActionTemplate,
    attackerBattleSquaddieId: string,
    targetBattleSquaddieId: string,
    targetBattleTemplateId: string,
    targeting: BattlePlayerSquaddieTarget,
    repository: ObjectRepository,
    missionMap: MissionMap,
    graphicsContext: GraphicsBuffer
}) => {
    const actionsThisRound = ActionsThisRoundService.new({
        battleSquaddieId: attackerBattleSquaddieId,
        startingLocation: {q: 0, r: 0},
        previewedActionTemplateId: actionTemplate.id,
    });
    const gameEngineState = getGameEngineState({
        repository,
        actionsThisRound: actionsThisRound,
        missionMap,
    });
    MissionMapService.addSquaddie(
        missionMap,
        targetBattleTemplateId,
        targetBattleSquaddieId,
        {
            q: 0,
            r: 2
        });

    targeting.update(gameEngineState, graphicsContext);

    let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 2, ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates());
    targeting.mouseEventHappened(gameEngineState, {
        eventType: OrchestratorComponentMouseEventType.CLICKED,
        mouseX,
        mouseY,
        mouseButton: MouseButton.ACCEPT,
    });
    targeting.update(gameEngineState, graphicsContext);

    return {
        gameEngineState,
        actionsThisRound,
    }
}

const clickOnConfirmTarget = ({
                                  targeting,
                                  gameEngineState,
                              }: {
    targeting: BattlePlayerSquaddieTarget,
    gameEngineState: GameEngineState
}) => {
    const confirmSelectionClick: OrchestratorComponentMouseEvent = {
        eventType: OrchestratorComponentMouseEventType.CLICKED,
        mouseX: ScreenDimensions.SCREEN_WIDTH,
        mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
        mouseButton: MouseButton.ACCEPT,
    };

    targeting.mouseEventHappened(gameEngineState, confirmSelectionClick);
}

const keyboardPressToConfirmTarget = ({
                                          targeting,
                                          gameEngineState,
                                      }: {
    targeting: BattlePlayerSquaddieTarget,
    gameEngineState: GameEngineState
}) => {
    const confirmSelectionPress: OrchestratorComponentKeyEvent = {
        eventType: OrchestratorComponentKeyEventType.PRESSED,
        keyCode: config.KEYBOARD_SHORTCUTS.ACCEPT[0],
    };

    targeting.keyEventHappened(gameEngineState, confirmSelectionPress);
}
