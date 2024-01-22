import {BattleOrchestratorState, BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {
    CurrentlySelectedSquaddieDecision,
    CurrentlySelectedSquaddieDecisionService
} from "../history/currentlySelectedSquaddieDecision";
import {BattleSquaddieUsesActionOnSquaddie} from "./battleSquaddieUsesActionOnSquaddie";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {LabelHelper} from "../../ui/label";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as orchestratorUtils from "./orchestratorUtils";
import {OrchestratorUtilities} from "./orchestratorUtils";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {Recording, RecordingService} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {DamageType, IsSquaddieAlive} from "../../squaddie/squaddieService";
import {MissionMap} from "../../missionMap/missionMap";
import {SquaddieTargetsOtherSquaddiesAnimator} from "../animation/squaddieTargetsOtherSquaddiesAnimatior";
import {SquaddieSkipsAnimationAnimator} from "../animation/squaddieSkipsAnimationAnimator";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {InBattleAttributesHandler} from "../stats/inBattleAttributes";
import {SquaddieTurnService} from "../../squaddie/turn";
import {BattleStateService} from "../orchestrator/battleState";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {DegreeOfSuccess} from "../actionCalculator/degreeOfSuccess";
import {Decision, DecisionService} from "../../decision/decision";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {ActionEffect} from "../../decision/actionEffect";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";

describe('BattleSquaddieUsesActionOnSquaddie', () => {
    let squaddieRepository: ObjectRepository;
    let squaddieTemplateBase: SquaddieTemplate;
    let battleSquaddieBase: BattleSquaddie;
    let targetStatic: SquaddieTemplate;
    let targetDynamic: BattleSquaddie;
    let powerAttackLongswordAction: ActionEffectSquaddieTemplate;
    let monkKoanAction: ActionEffectSquaddieTemplate;
    let monkMeditatesEvent: BattleEvent;
    let monkMeditatesInstruction: CurrentlySelectedSquaddieDecision;
    let squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let battleEventRecording: Recording;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepository = ObjectRepositoryService.new();
        ({
            squaddieTemplate: squaddieTemplateBase,
            battleSquaddie: battleSquaddieBase,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Torrin",
            templateId: "static_squaddie",
            battleId: "dynamic_squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
            attributes: {
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                maxHitPoints: 1,
                armorClass: 0,
            },
        }));

        ({
            squaddieTemplate: targetStatic,
            battleSquaddie: targetDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Target",
            templateId: "target_static_squaddie",
            battleId: "target_dynamic_squaddie",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            attributes: {
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                maxHitPoints: 3,
                armorClass: 0,
            },
        }));

        powerAttackLongswordAction = ActionEffectSquaddieTemplateService.new({
            name: "power attack longsword",
            id: "powerAttackLongsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 3,
            damageDescriptions: {
                [DamageType.BODY]: 9001,
            },
        });

        monkKoanAction = ActionEffectSquaddieTemplateService.new({
            id: "koan",
            name: "koan",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.SKIP_ANIMATION]: true
            }),
            maximumRange: 0,
            minimumRange: 0,
        });

        jest.spyOn(LabelHelper, "draw").mockReturnValue(null);
        jest.spyOn(orchestratorUtils, "DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation").mockImplementation(() => {
        });

        squaddieUsesActionOnSquaddie = new BattleSquaddieUsesActionOnSquaddie();

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        battleEventRecording = {history: []};
    });

    function addMonkKoanEventToRecording() {
        const instruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "static_squaddie",
            battleSquaddieId: "dynamic_squaddie",
            startingLocation: {q: 0, r: 0},
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            targetLocation: {q: 0, r: 0},
                            template: monkKoanAction,
                            numberOfActionPointsSpent: 1,
                        })
                    ]
                })
            ]
        });

        monkMeditatesInstruction = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: instruction,

            currentlySelectedDecision: DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: monkKoanAction,
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }),
        });
        CurrentlySelectedSquaddieDecisionService.selectCurrentDecision(monkMeditatesInstruction,
            DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: monkKoanAction,
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }),
        );

        monkMeditatesEvent = {
            instruction: monkMeditatesInstruction,
            results: {
                actingBattleSquaddieId: battleSquaddieBase.battleSquaddieId,
                targetedBattleSquaddieIds: [],
                resultPerTarget: {},
                actingSquaddieRoll: {
                    occurred: false,
                    rolls: [],
                },
                actingSquaddieModifiers: {},
            }
        };

        RecordingService.addEvent(battleEventRecording, monkMeditatesEvent);
    }

    function useMonkKoanAndReturnState({missionMap}: {
        missionMap?: MissionMap
    }): GameEngineState {
        addMonkKoanEventToRecording();
        const battleOrchestratorState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                squaddieCurrentlyActing: monkMeditatesInstruction,
                missionMap,
                recording: battleEventRecording,
            }),
        })

        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState,
            repository: squaddieRepository,
            resourceHandler: mockResourceHandler,
        });

        battleOrchestratorState.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: battleSquaddieBase.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state: gameEngineState,
        });
        SquaddieTurnService.spendActionPointsOnActionTemplate(battleSquaddieBase.squaddieTurn, powerAttackLongswordAction);
        return gameEngineState;
    }

    function usePowerAttackLongswordAndReturnState({missionMap}: {
        missionMap?: MissionMap
    }): GameEngineState {
        const wholeTurnInstruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "static_squaddie",
            battleSquaddieId: "dynamic_squaddie",
            startingLocation: {q: 0, r: 0},
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            targetLocation: {q: 0, r: 0},
                            template: powerAttackLongswordAction,
                            numberOfActionPointsSpent: 1,
                        })
                    ]
                })
            ]
        });

        const squaddieInstructionInProgress: CurrentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: wholeTurnInstruction,
            currentlySelectedDecision: DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: powerAttackLongswordAction,
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }),
        });

        const newEvent: BattleEvent = {
            instruction: squaddieInstructionInProgress,
            results: {
                actingBattleSquaddieId: battleSquaddieBase.battleSquaddieId,
                targetedBattleSquaddieIds: ["target_dynamic_squaddie"],
                resultPerTarget: {
                    ["target_dynamic_squaddie"]: {
                        damageTaken: 9001,
                        healingReceived: 0,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS
                    }
                },
                actingSquaddieRoll: {
                    occurred: false,
                    rolls: [],
                },
                actingSquaddieModifiers: {},
            }
        };
        RecordingService.addEvent(battleEventRecording, newEvent);

        const battleOrchestratorState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                missionMap,
                squaddieCurrentlyActing: squaddieInstructionInProgress,
                recording: battleEventRecording,
            }),
        })

        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState,
            repository: squaddieRepository,
            resourceHandler: mockResourceHandler,
        });

        battleOrchestratorState.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: battleSquaddieBase.battleSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
            state: gameEngineState,
        });
        SquaddieTurnService.spendActionPointsOnActionTemplate(battleSquaddieBase.squaddieTurn, powerAttackLongswordAction);
        return gameEngineState;
    }

    it('hides dead squaddies after the action animates', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
        })

        const state = usePowerAttackLongswordAndReturnState({missionMap});
        expect(missionMap.isSquaddieHiddenFromDrawing(targetDynamic.battleSquaddieId)).toBeFalsy();

        InBattleAttributesHandler.takeDamage(
            targetDynamic.inBattleAttributes,
            targetStatic.attributes.maxHitPoints, DamageType.BODY
        );
        expect(IsSquaddieAlive({battleSquaddie: targetDynamic, squaddieTemplate: targetStatic})).toBeFalsy();

        jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(true);

        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(missionMap.isSquaddieHiddenFromDrawing(targetDynamic.battleSquaddieId)).toBeTruthy();
    });

    it('resets squaddie currently acting when it runs out of actions and finishes acting', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
        })

        const state = usePowerAttackLongswordAndReturnState({missionMap});
        battleSquaddieBase.squaddieTurn.remainingActionPoints = 0;

        jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(true);

        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeTruthy();
        expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing).toBeUndefined();
    });

    it('uses the SquaddieTargetsOtherSquaddiesAnimator for appropriate situations and waits after it completes', () => {
        const state = usePowerAttackLongswordAndReturnState({});

        const squaddieTargetsOtherSquaddiesAnimatorUpdateSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "update").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorResetSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "reset").mockImplementation();
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "hasCompleted").mockReturnValue(false);
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);

        expect(squaddieUsesActionOnSquaddie.squaddieActionAnimator).toBeInstanceOf(SquaddieTargetsOtherSquaddiesAnimator);
        expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled();
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeFalsy();

        squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy.mockReturnValue(true);
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);
        expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled();
        expect(squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeTruthy();

        const stateChanges = squaddieUsesActionOnSquaddie.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        squaddieUsesActionOnSquaddie.reset(state);
        expect(squaddieTargetsOtherSquaddiesAnimatorResetSpy).toBeCalled();
    });

    it('uses the SquaddieSkipsAnimationAnimator for actions that lack animation and waits after it completes', () => {
        const state = useMonkKoanAndReturnState({});

        const squaddieSkipsAnimationAnimatorUpdateSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator, "update").mockImplementation();
        const squaddieSkipsAnimationAnimatorResetSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator, "reset").mockImplementation();
        const squaddieSkipsAnimationAnimatorHasCompletedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator, "hasCompleted").mockReturnValue(false);
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);

        expect(squaddieUsesActionOnSquaddie.squaddieActionAnimator).toBeInstanceOf(SquaddieSkipsAnimationAnimator);
        expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled();
        expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeFalsy();

        squaddieSkipsAnimationAnimatorHasCompletedSpy.mockReturnValue(true);
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext);
        expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled();
        expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled();
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeTruthy();

        squaddieUsesActionOnSquaddie.reset(state);
        expect(squaddieSkipsAnimationAnimatorResetSpy).toBeCalled();
    });

    it('passes mouse events on to the animator', () => {
        const state = usePowerAttackLongswordAndReturnState({});

        const squaddieTargetsOtherSquaddiesAnimatorMouseEventHappenedSpy = jest.spyOn(squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator, "mouseEventHappened").mockImplementation();

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
        };

        squaddieUsesActionOnSquaddie.mouseEventHappened(state, mouseEvent);
        expect(squaddieTargetsOtherSquaddiesAnimatorMouseEventHappenedSpy).toBeCalled();
    });

    describe('will determine the next mode based on the next action effect', () => {
        let movementActionEffect: ActionEffect;
        let squaddieActionEffect: ActionEffect;
        let endTurnActionEffect: ActionEffect;

        beforeEach(() => {
            movementActionEffect = ActionEffectMovementService.new({
                destination: {q: 0, r: 2},
                numberOfActionPointsSpent: 2,
            });

            squaddieActionEffect = ActionEffectSquaddieService.new({
                targetLocation: {q: 0, r: 2},
                numberOfActionPointsSpent: 1,
                template: ActionEffectSquaddieTemplateService.new({
                    id: "shout",
                    name: "shout"
                })
            });

            endTurnActionEffect = ActionEffectEndTurnService.new();
        });

        const setupStateWithDecisions = (decision: Decision, decision1: Decision): GameEngineState => {
            const moveDecisions: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "enemy_1",
                battleSquaddieId: "enemy_1",
                startingLocation: {q: 0, r: 0},
                decisions: [
                    decision,
                    decision1,
                ].filter(x => x),
            });

            return GameEngineStateService.new({
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleState: BattleStateService.newBattleState({
                        missionId: "the mission",
                        squaddieCurrentlyActing: CurrentlySelectedSquaddieDecisionService.new({
                            squaddieActionsForThisRound: moveDecisions,
                        })
                    }),
                }),
            });
        }

        it('will suggest the squaddie mover if it has a movement action', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    squaddieActionEffect
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    movementActionEffect
                ]
            });

            const state: GameEngineState = setupStateWithDecisions(decision, decision1);
            const recommendedChanges = squaddieUsesActionOnSquaddie.recommendStateChanges(state);

            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(decision1.actionEffects[0]);
            expect(recommendedChanges.nextMode).toEqual(BattleOrchestratorMode.SQUADDIE_MOVER);
        });

        it('will suggest the squaddie act on squaddie mode if it has a squaddie action', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    squaddieActionEffect
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    squaddieActionEffect
                ]
            });
            const state: GameEngineState = setupStateWithDecisions(decision, decision1);
            const recommendedChanges = squaddieUsesActionOnSquaddie.recommendStateChanges(state);
            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(decision1.actionEffects[0]);
            expect(recommendedChanges.nextMode).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);
        });

        it('will suggest the squaddie act on map mode if it has an end turn action', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    squaddieActionEffect
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    endTurnActionEffect
                ]
            });

            const state: GameEngineState = setupStateWithDecisions(decision, decision1);
            const recommendedChanges = squaddieUsesActionOnSquaddie.recommendStateChanges(state);
            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(decision1.actionEffects[0]);
            expect(recommendedChanges.nextMode).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
        });

        it('will not suggest a mode if there are no more decisions to process', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    squaddieActionEffect
                ]
            });

            const state: GameEngineState = setupStateWithDecisions(decision, undefined);
            const recommendedChanges = squaddieUsesActionOnSquaddie.recommendStateChanges(state);
            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBeUndefined();
            expect(recommendedChanges.nextMode).toBeUndefined();
        });
    });
});
