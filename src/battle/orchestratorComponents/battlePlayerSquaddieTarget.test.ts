import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattlePlayerSquaddieTarget} from "./battlePlayerSquaddieTarget";
import {BattleSquaddie} from "../battleSquaddie";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionMap} from "../../missionMap/missionMap";
import {HexCoordinateToKey} from "../../hexMap/hexCoordinate/hexCoordinate";
import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {TODODELETEMESquaddieActionsForThisRoundService} from "../history/TODODELETEMESquaddieDecisionsDuringThisPhase";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {TODODELETEMEactionEffectSquaddie} from "../../decision/TODODELETEMEactionEffectSquaddie";
import {
    TODODELETEMECurrentlySelectedSquaddieDecisionService
} from "../history/TODODELETEMECurrentlySelectedSquaddieDecision";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {DamageType, GetHitPoints, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {BattleEvent} from "../history/battleEvent";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {BattleStateService} from "../orchestrator/battleState";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {DecisionService} from "../../decision/TODODELETEMEdecision";
import {ActionEffectMovementService} from "../../decision/TODODELETEMEactionEffectMovement";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {ActionTemplate, ActionTemplateService} from "../../action/template/actionTemplate";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../action/template/actionEffectSquaddieTemplate";
import {ActionsThisRoundService} from "../history/actionsThisRound";
import {ProcessedActionService} from "../../action/processed/processedAction";
import {DecidedActionService} from "../../action/decided/decidedAction";
import {DecidedActionSquaddieEffectService} from "../../action/decided/decidedActionSquaddieEffect";

// TODO review and figure out how to build ActionsThisRound through previews

describe('BattleSquaddieTarget', () => {
    let squaddieRepo: ObjectRepository = ObjectRepositoryService.new();
    let targetComponent: BattlePlayerSquaddieTarget;
    let knightStatic: SquaddieTemplate;
    let knightDynamic: BattleSquaddie;
    let citizenStatic: SquaddieTemplate;
    let citizenDynamic: BattleSquaddie;
    let thiefStatic: SquaddieTemplate;
    let thiefDynamic: BattleSquaddie;
    let battleMap: MissionMap;
    let longswordAction: ActionTemplate;
    let longswordActionId: string = "longsword";
    let longswordActionDamage: number = 2;
    let bandageWoundsAction: ActionTemplate;
    let bandageWoundsActionId: string = "bandage wounds";
    let state: GameEngineState;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        targetComponent = new BattlePlayerSquaddieTarget();
        squaddieRepo = ObjectRepositoryService.new();
        battleMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 ",
                    "  1 1 1 ",
                ]
            })
        });

        longswordActionDamage = 2;
        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: longswordActionId,
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
                        [DamageType.BODY]: longswordActionDamage,
                    },
                })
            ]
        });

        bandageWoundsAction = ActionTemplateService.new({
            name: "Bandage Wounds",
            id: bandageWoundsActionId,
            actionPoints: 2,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.HEALING]: true,
                        [Trait.TARGETS_ALLIES]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                })
            ]
        });

        ({
            squaddieTemplate: knightStatic,
            battleSquaddie: knightDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Knight",
            templateId: "Knight",
            battleId: "Knight 0",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
            actionTemplates: [longswordAction, bandageWoundsAction],
        }));
        battleMap.addSquaddie(knightStatic.squaddieId.templateId, knightDynamic.battleSquaddieId, {q: 1, r: 1});

        ({
            squaddieTemplate: citizenStatic,
            battleSquaddie: citizenDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Citizen",
            templateId: "Citizen",
            battleId: "Citizen 0",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository: squaddieRepo,
            actions: [],
        }));
        battleMap.addSquaddie(citizenStatic.squaddieId.templateId, citizenDynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });

        ({
            squaddieTemplate: thiefStatic,
            battleSquaddie: thiefDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Thief",
            templateId: "Thief",
            battleId: "Thief 0",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
            actionTemplates: [longswordAction],
            attributes: {
                maxHitPoints: 5,
                movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                armorClass: 0,
            }
        }));
        battleMap.addSquaddie(thiefStatic.squaddieId.templateId, thiefDynamic.battleSquaddieId, {q: 1, r: 2});

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: knightDynamic.battleSquaddieId,
            startingLocation: {q: 1, r: 1},
            previewedActionTemplateId: longswordActionId,
        });

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        state = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap: battleMap,
                    actionsThisRound,
                    recording: {history: []},
                }),
            }),
            repository: squaddieRepo,
        });
    });

    function clickOnThief() {
        const {mapLocation} = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(thiefDynamic.battleSquaddieId);
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            mapLocation.q,
            mapLocation.r,
            ...state.battleOrchestratorState.battleState.camera.getCoordinates()
        );
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        };

        targetComponent.mouseEventHappened(state, mouseEvent);
    }

    function clickOnCitizen() {
        const {mapLocation} = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(citizenDynamic.battleSquaddieId);
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            mapLocation.q,
            mapLocation.r,
            ...state.battleOrchestratorState.battleState.camera.getCoordinates()
        );
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        };

        targetComponent.mouseEventHappened(state, mouseEvent);
    }

    function clickOnConfirmTarget() {
        const confirmSelectionClick: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
        };

        targetComponent.mouseEventHappened(state, confirmSelectionClick);
    }


    it('should highlight the map with the ability range', () => {
        targetComponent.update(state, mockedP5GraphicsContext);

        expect(targetComponent.hasCompleted(state)).toBeFalsy();

        const highlightedTileDescription = {
            pulseColor: HighlightPulseRedColor,
            name: "map icon attack 1 action",
        };

        expect(battleMap.terrainTileMap.highlightedTiles).toStrictEqual({
            [HexCoordinateToKey({q: 1, r: 0})]: highlightedTileDescription,
            [HexCoordinateToKey({q: 1, r: 2})]: highlightedTileDescription,
            [HexCoordinateToKey({q: 0, r: 1})]: highlightedTileDescription,
            [HexCoordinateToKey({q: 2, r: 1})]: highlightedTileDescription,
            [HexCoordinateToKey({q: 2, r: 0})]: highlightedTileDescription,
            [HexCoordinateToKey({q: 0, r: 2})]: highlightedTileDescription,
        });
    });

    describe('canceling after selecting action but before selecting target', () => {
        const tests = [
            {
                mouseX: 0,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            },
            {
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            },
        ];
        it.each(tests)('should cancel target if the user clicks on the cancel button', ({
                                                                                            mouseX,
                                                                                            mouseY,
                                                                                        }) => {
            const mouseEvent: OrchestratorComponentMouseEvent = {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
            };

            targetComponent.mouseEventHappened(state, mouseEvent);

            expect(targetComponent.hasCompleted(state)).toBeTruthy();
            const recommendedInfo = targetComponent.recommendStateChanges(state);
            expect(recommendedInfo.nextMode).toBe(BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR);
            expect(state.battleOrchestratorState.battleState.TODODELETEMEsquaddieCurrentlyActing.currentlySelectedDecision).toBeUndefined();
        });
    });

    it('should clear whoever is acting if they cancel at the start of the turn', () => {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
        };

        state.battleOrchestratorState.battleState.TODODELETEMEsquaddieCurrentlyActing = TODODELETEMECurrentlySelectedSquaddieDecisionService.new({

            squaddieActionsForThisRound: TODODELETEMESquaddieActionsForThisRoundService.new({
                battleSquaddieId: knightDynamic.battleSquaddieId,
                squaddieTemplateId: knightStatic.squaddieId.templateId,
                startingLocation: {q: 1, r: 1},
            }),
        });

        // TODO
        // const decision = DecisionService.new({
        //     actionEffects: [
        //         ActionEffectSquaddieService.new({
        //             template: longswordAction,
        //             targetLocation: {q: 0, r: 0},
        //             numberOfActionPointsSpent: 1,
        //         })
        //     ]
        // });
        // TODODELETEMECurrentlySelectedSquaddieDecisionService.selectCurrentDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, decision);

        targetComponent.mouseEventHappened(state, mouseEvent);
        // expect(TODODELETEMECurrentlySelectedSquaddieDecisionService.squaddieHasActedThisTurn(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBeFalsy();
        expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeFalsy();
    });

    it('should remember the squaddie is still acting if they cancel midway through their turn', () => {
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
        };

        state.battleOrchestratorState.battleState.TODODELETEMEsquaddieCurrentlyActing = TODODELETEMECurrentlySelectedSquaddieDecisionService.new({

            squaddieActionsForThisRound: TODODELETEMESquaddieActionsForThisRoundService.new({
                battleSquaddieId: knightDynamic.battleSquaddieId,
                squaddieTemplateId: knightStatic.squaddieId.templateId,
                startingLocation: {q: 1, r: 1},
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectMovementService.new({
                                destination: {q: 0, r: 1},
                                numberOfActionPointsSpent: 1,
                            })
                        ],
                    })
                ],
            }),
        });

        // TODO
        // TODODELETEMECurrentlySelectedSquaddieDecisionService.addConfirmedDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing,
        //     DecisionService.new({
        //         actionEffects: [
        //             ActionEffectSquaddieService.new({
        //                 template: longswordAction,
        //                 targetLocation: {q: 0, r: 0},
        //                 numberOfActionPointsSpent: 1,
        //             })
        //         ]
        //     }),
        // );

        targetComponent.mouseEventHappened(state, mouseEvent);
        // expect(TODODELETEMECurrentlySelectedSquaddieDecisionService.squaddieHasActedThisTurn(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBeTruthy();
        expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeTruthy();
    });

    it('should ignore if the user does not click off of the map', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(battleMap.terrainTileMap.getDimensions().numberOfRows + 1, 0, ...state.battleOrchestratorState.battleState.camera.getCoordinates());
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
        };

        targetComponent.mouseEventHappened(state, mouseEvent);
        expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
        expect(targetComponent.hasCompleted(state)).toBeFalsy();
    });

    it('should ignore if the target is out of range', () => {
        state.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(thiefDynamic.battleSquaddieId, {
            q: 0,
            r: 0
        });
        targetComponent.update(state, mockedP5GraphicsContext);
        clickOnThief();
        expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
        expect(targetComponent.hasCompleted(state)).toBeFalsy();
    });

    describe('user clicks on target with attack', () => {
        beforeEach(() => {
            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnThief();
        });

        it('should show the confirm window', () => {
            expect(targetComponent.shouldDrawConfirmWindow()).toBeTruthy();
            expect(targetComponent.hasCompleted(state)).toBeFalsy();
        });

        it('should cancel decision if the user cancels the target', () => {
            const cancelTargetClick: OrchestratorComponentMouseEvent = {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
            };

            targetComponent.mouseEventHappened(state, cancelTargetClick);

            expect(targetComponent.hasCompleted(state)).toBeFalsy();
            expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
            expect(state.battleOrchestratorState.battleState.TODODELETEMEsquaddieCurrentlyActing.currentlySelectedDecision).toBeUndefined();
        });
    });

    describe('user clicks on target with heal', () => {
        beforeEach(() => {
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: knightDynamic.battleSquaddieId,
                startingLocation: {q: 1, r: 1},
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            battleSquaddieId: knightDynamic.battleSquaddieId,
                            actionPointCost: bandageWoundsAction.actionPoints,
                            actionTemplateName: bandageWoundsActionId,
                            actionEffects: [
                                DecidedActionSquaddieEffectService.new({
                                    template: bandageWoundsAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                    target: {q: 0, r: 0},
                                })
                            ]
                        })
                    })
                ]
            });

            state = GameEngineStateService.new({
                resourceHandler: mockResourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap: battleMap,
                        actionsThisRound,
                        recording: {history: []}
                    }),
                }),
                repository: squaddieRepo,
            });

            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnCitizen();
        });

        it('should show the confirm window', () => {
            expect(targetComponent.shouldDrawConfirmWindow()).toBeTruthy();
            expect(targetComponent.hasCompleted(state)).toBeFalsy();
        });
    });

    describe('user confirms the target', () => {
        beforeEach(() => {
            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnThief();
            clickOnConfirmTarget();
        });

        // TODO
        // it('should create a squaddie instruction', () => {
        //     const decision = DecisionService.new({
        //         actionEffects: [
        //             ActionEffectSquaddieService.new({
        //                 targetLocation: {q: 1, r: 2},
        //                 template: longswordAction,
        //                 numberOfActionPointsSpent: 1,
        //             })
        //         ]
        //     });
        //     const expectedInstruction: TODODELETEMESquaddieDecisionsDuringThisPhase = TODODELETEMESquaddieActionsForThisRoundService.new({
        //         squaddieTemplateId: knightStatic.squaddieId.templateId,
        //         battleSquaddieId: knightDynamic.battleSquaddieId,
        //         startingLocation: {q: 1, r: 1},
        //         decisions: [
        //             decision
        //         ]
        //     });
        //
        //     expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase).toStrictEqual(expectedInstruction);
        //     expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedDecision).toEqual(decision);
        // });

        it('should be completed', () => {
            expect(targetComponent.hasCompleted(state)).toBeTruthy();
        });

        it('should change the state to Squaddie Uses Action On Squaddie', () => {
            const recommendedInfo = targetComponent.recommendStateChanges(state);
            expect(recommendedInfo.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);
        });

        it('should consume the squaddie action points', () => {
            const {actionPointsRemaining} = GetNumberOfActionPoints({
                squaddieTemplate: knightStatic,
                battleSquaddie: knightDynamic
            });
            expect(actionPointsRemaining).toBe(2);
        });
    });

    describe('confirming an action mid turn', () => {
        beforeEach(() => {
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: knightDynamic.battleSquaddieId,
                startingLocation: {q: 1, r: 1},
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            battleSquaddieId: knightDynamic.battleSquaddieId,
                            actionPointCost: longswordAction.actionPoints,
                            actionTemplateName: longswordActionId,
                            actionEffects: [
                                DecidedActionSquaddieEffectService.new({
                                    template: longswordAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                    target: {q: 0, r: 0},
                                })
                            ]
                        })
                    })
                ]
            });

            expect(targetComponent.hasCompleted(state)).toBeFalsy();
            targetComponent.update(state, mockedP5GraphicsContext);
            clickOnThief();
            clickOnConfirmTarget();
            expect(targetComponent.hasCompleted(state)).toBeTruthy();
        });

        // TODO
        // it('should add to existing instruction when confirmed mid turn', () => {
        //     const expectedInstruction: TODODELETEMESquaddieDecisionsDuringThisPhase = TODODELETEMESquaddieActionsForThisRoundService.new({
        //         squaddieTemplateId: knightStatic.squaddieId.templateId,
        //         battleSquaddieId: knightDynamic.battleSquaddieId,
        //         startingLocation: {q: 1, r: 1},
        //         decisions: [
        //             DecisionService.new({
        //                 actionEffects: [
        //                     ActionEffectSquaddieService.new({
        //                         targetLocation: {q: 1, r: 2},
        //                         template: longswordAction,
        //                         numberOfActionPointsSpent: 1,
        //                     })
        //                 ]
        //             })
        //         ]
        //     });
        //
        //     expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase).toStrictEqual(expectedInstruction);
        // });

        it('should spend the action resource cost after confirming but before showing results', () => {
            const {actionPointsRemaining} = GetNumberOfActionPoints({
                squaddieTemplate: knightStatic,
                battleSquaddie: knightDynamic
            });
            expect(actionPointsRemaining).toBe(3 - longswordAction.actionPoints);
        });

        it('should add the results to the history', () => {
            expect(state.battleOrchestratorState.battleState.recording.history).toHaveLength(1);
            const mostRecentEvent: BattleEvent = state.battleOrchestratorState.battleState.recording.history[0];
            expect(mostRecentEvent.instruction.squaddieDecisionsDuringThisPhase.decisions).toHaveLength(1);
            expect((
                mostRecentEvent.instruction.squaddieDecisionsDuringThisPhase.decisions[0].actionEffects[0] as TODODELETEMEactionEffectSquaddie
            ).template.id).toBe(longswordAction.id);
            const results = mostRecentEvent.results;
            expect(results.actingBattleSquaddieId).toBe(knightDynamic.battleSquaddieId);
            expect(results.targetedBattleSquaddieIds).toHaveLength(1);
            expect(results.targetedBattleSquaddieIds[0]).toBe(thiefDynamic.battleSquaddieId);
            expect(results.resultPerTarget[thiefDynamic.battleSquaddieId]).toBeTruthy();
        });

        it('should store the calculated results', () => {
            const mostRecentEvent: BattleEvent = state.battleOrchestratorState.battleState.recording.history[0];
            const knightUsesLongswordOnThiefResults = mostRecentEvent.results.resultPerTarget[thiefDynamic.battleSquaddieId];
            expect(knightUsesLongswordOnThiefResults.damageTaken).toBe(longswordActionDamage);

            const {maxHitPoints, currentHitPoints} = GetHitPoints({
                squaddieTemplate: thiefStatic,
                battleSquaddie: thiefDynamic
            });
            expect(currentHitPoints).toBe(maxHitPoints - longswordActionDamage);
        });
    });

    describe('invalid target based on affiliation', () => {
        const tests = [
            {
                name: 'target foe tries to attack an ally',
                actionTraits: [Trait.ATTACK, Trait.TARGETS_FOE],
                invalidTargetClicker: clickOnCitizen,
            },
            {
                name: 'heal ally tries to heal a foe',
                actionTraits: [Trait.HEALING, Trait.TARGETS_ALLIES],
                invalidTargetClicker: clickOnThief,
            }
        ]
        it.each(tests)(`$name do not show a confirm window`, ({
                                                                  name,
                                                                  actionTraits,
                                                                  invalidTargetClicker,
                                                              }) => {
            const traits: { [key in Trait]?: boolean } = Object.fromEntries(
                actionTraits.map(e => [e, true])
            );

            const action = ActionTemplateService.new({
                id: name,
                name,
                actionEffectTemplates: [
                    ActionEffectSquaddieTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues(traits),
                        minimumRange: 0,
                        maximumRange: 9001,
                    })
                ]
            });

            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: knightDynamic.battleSquaddieId,
                startingLocation: {q: 1, r: 1},
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: DecidedActionService.new({
                            battleSquaddieId: knightDynamic.battleSquaddieId,
                            actionPointCost: action.actionPoints,
                            actionTemplateName: name,
                            actionEffects: [
                                DecidedActionSquaddieEffectService.new({
                                    template: action.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                    target: {q: 0, r: 0},
                                })
                            ]
                        })
                    })
                ]
            });

            state = GameEngineStateService.new({
                resourceHandler: mockResourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap: battleMap,
                        actionsThisRound,
                    }),
                }),
                repository: squaddieRepo,
            });

            targetComponent.update(state, mockedP5GraphicsContext);
            invalidTargetClicker();

            expect(targetComponent.shouldDrawConfirmWindow()).toBeFalsy();
            expect(targetComponent.hasCompleted(state)).toBeFalsy();
        });
    })
});
