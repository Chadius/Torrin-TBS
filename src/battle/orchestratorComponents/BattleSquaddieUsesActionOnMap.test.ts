import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {BattleSquaddieUsesActionOnMap} from "./battleSquaddieUsesActionOnMap";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState, GameEngineStateHelper} from "../../gameEngine/gameEngine";
import {Decision, DecisionService} from "../../decision/decision";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {ActionEffect} from "../../decision/actionEffect";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {ActionEffectSquaddieTemplateService} from "../../decision/actionEffectSquaddieTemplate";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";

describe('BattleSquaddieUsesActionOnMap', () => {
    let squaddieRepository: ObjectRepository;
    let squaddieTemplateBase: SquaddieTemplate;
    let battleSquaddieBase: BattleSquaddie;
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
            squaddieRepository: squaddieRepository,
            attributes: {
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                armorClass: 0,
                maxHitPoints: 0,
            },
        }));
    });

    it('can wait half a second before ending turn', () => {
        const endTurnInstruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "static_squaddie",
            battleSquaddieId: "dynamic_squaddie",
            startingLocation: {q: 0, r: 0},
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectEndTurnService.new()
                    ]
                })
            ]
        });

        const mapAction: BattleSquaddieUsesActionOnMap = new BattleSquaddieUsesActionOnMap();

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: GameEngineState = GameEngineStateHelper.new({
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                squaddieRepository: squaddieRepository,
                resourceHandler: undefined,
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    squaddieCurrentlyActing: CurrentlySelectedSquaddieDecisionService.new({
                        squaddieActionsForThisRound: endTurnInstruction,

                    }),
                }),
                decisionActionEffectIterator: DecisionActionEffectIteratorService.new({
                    decision: endTurnInstruction.decisions[0],
                }),
            })
        })

        mapAction.update(state, mockedP5GraphicsContext);
        expect(mapAction.animationCompleteStartTime).not.toBeUndefined();
        expect(mapAction.hasCompleted(state)).toBeFalsy();
        jest.spyOn(Date, 'now').mockImplementation(() => 500);

        mapAction.update(state, mockedP5GraphicsContext);
        expect(mapAction.hasCompleted(state)).toBeTruthy();

        const stateChanges = mapAction.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        mapAction.reset(state);
        expect(mapAction.animationCompleteStartTime).toBeUndefined();
        expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state.battleOrchestratorState)).toBeFalsy();
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

            return GameEngineStateHelper.new({
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    resourceHandler: undefined,
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
                    endTurnActionEffect
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    movementActionEffect
                ]
            });

            const state: GameEngineState = setupStateWithDecisions(decision, decision1);
            const mapAction: BattleSquaddieUsesActionOnMap = new BattleSquaddieUsesActionOnMap();
            const recommendedChanges = mapAction.recommendStateChanges(state);

            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(decision1.actionEffects[0]);
            expect(recommendedChanges.nextMode).toEqual(BattleOrchestratorMode.SQUADDIE_MOVER);
        });

        it('will suggest the squaddie act on squaddie mode if it has a squaddie action', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    endTurnActionEffect
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    squaddieActionEffect
                ]
            });
            const state: GameEngineState = setupStateWithDecisions(decision, decision1);
            const mapAction: BattleSquaddieUsesActionOnMap = new BattleSquaddieUsesActionOnMap();
            const recommendedChanges = mapAction.recommendStateChanges(state);

            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(decision1.actionEffects[0]);
            expect(recommendedChanges.nextMode).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);
        });

        it('will suggest the squaddie act on map mode if it has an end turn action', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    endTurnActionEffect
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    endTurnActionEffect
                ]
            });
            const state: GameEngineState = setupStateWithDecisions(decision, decision1);
            const mapAction: BattleSquaddieUsesActionOnMap = new BattleSquaddieUsesActionOnMap();
            const recommendedChanges = mapAction.recommendStateChanges(state);

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
            const mapAction: BattleSquaddieUsesActionOnMap = new BattleSquaddieUsesActionOnMap();
            const recommendedChanges = mapAction.recommendStateChanges(state);

            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBeUndefined();
            expect(recommendedChanges.nextMode).toBeUndefined();
        });
    });
});
