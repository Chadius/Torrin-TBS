import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddie} from "../battleSquaddie";
import {BattleOrchestratorState, BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieMover} from "./battleSquaddieMover";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {TIME_TO_MOVE} from "../animation/squaddieMoveAnimationUtils";
import {
    TODODELETEMESquaddieActionsForThisRoundService,
    TODODELETEMESquaddieDecisionsDuringThisPhase
} from "../history/TODODELETEMESquaddieDecisionsDuringThisPhase";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {
    TODODELETEMECurrentlySelectedSquaddieDecisionService
} from "../history/TODODELETEMECurrentlySelectedSquaddieDecision";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {BattleStateService} from "../orchestrator/battleState";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";
import {DecisionService, TODODELETEMEdecision} from "../../decision/TODODELETEMEdecision";
import {ActionEffectMovementService} from "../../decision/TODODELETEMEactionEffectMovement";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";
import {TODODELETEMEactionEffect} from "../../decision/TODODELETEMEactionEffect";
import {ActionEffectEndTurnService} from "../../decision/TODODELETEMEactionEffectEndTurn";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";

describe('BattleSquaddieMover', () => {
    let squaddieRepo: ObjectRepository;
    let player1Static: SquaddieTemplate;
    let player1BattleSquaddie: BattleSquaddie;
    let enemy1Static: SquaddieTemplate;
    let enemy1Dynamic: BattleSquaddie;
    let map: MissionMap;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepo = ObjectRepositoryService.new();
        map = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 ",
                    " 1 1 "
                ]
            })
        });

        ({
            squaddieTemplate: player1Static,
            battleSquaddie: player1BattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Player1",
            templateId: "player_1",
            battleId: "player_1",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepo,
        }));

        ({
            squaddieTemplate: enemy1Static,
            battleSquaddie: enemy1Dynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Enemy1",
            templateId: "enemy_1",
            battleId: "enemy_1",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository: squaddieRepo,
        }));
    });

    it('is complete once enough time passes and the squaddie finishes moving', () => {
        map.addSquaddie("player_1", "player_1", {q: 0, r: 0});

        const searchResults: SearchResult = PathfinderHelper.search({
            searchParameters: SearchParametersHelper.new({
                startLocations: [{q: 0, r: 0}],
                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                canStopOnSquaddies: true,
                movementPerAction: 99,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                maximumDistanceMoved: undefined,
                minimumDistanceMoved: undefined,
                ignoreTerrainCost: false,
                canPassOverPits: false,
                canPassThroughWalls: false,
                stopLocations: [{q: 1, r: 1}],
                numberOfActions: 1,
            }),
            missionMap: map,
            repository: squaddieRepo,
        });

        const movePath: SearchPath = SearchResultsHelper.getShortestPathToLocation(searchResults, 1, 1);

        const moveAction: TODODELETEMESquaddieDecisionsDuringThisPhase = TODODELETEMESquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "player_1",
            battleSquaddieId: "player_1",
            startingLocation: {q: 0, r: 0},
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectMovementService.new({
                            destination: {q: 1, r: 1},
                            numberOfActionPointsSpent: 3,
                        })
                    ]
                })
            ]
        });

        const state: GameEngineState = GameEngineStateService.new({
            repository: squaddieRepo,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap: map,
                    searchPath: movePath,
                    squaddieCurrentlyActing: TODODELETEMECurrentlySelectedSquaddieDecisionService.new({
                        squaddieActionsForThisRound: moveAction,
                    }),
                }),
            })
        });
        const mover: BattleSquaddieMover = new BattleSquaddieMover();
        jest.spyOn(Date, 'now').mockImplementation(() => 1);
        mover.update(state, mockedP5GraphicsContext);
        expect(mover.hasCompleted(state)).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
        mover.update(state, mockedP5GraphicsContext);
        expect(mover.hasCompleted(state)).toBeTruthy();
        mover.reset(state);
        expect(mover.animationStartTime).toBeUndefined();
    });

    describe('reset actions based on squaddie', () => {
        const setupSquaddie = ({
                                   battleSquaddieId,
                                   squaddieAffiliation,
                                   newInstruction
                               }: {
            battleSquaddieId: string,
            squaddieAffiliation: SquaddieAffiliation,
            newInstruction: TODODELETEMESquaddieDecisionsDuringThisPhase,
        }): BattleOrchestratorState => {
            const searchResults: SearchResult = PathfinderHelper.search({
                searchParameters: SearchParametersHelper.new({
                    startLocations: [{q: 0, r: 0}],
                    squaddieAffiliation: squaddieAffiliation,
                    canStopOnSquaddies: true,
                    movementPerAction: 999,
                    shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
                    maximumDistanceMoved: undefined,
                    minimumDistanceMoved: 0,
                    ignoreTerrainCost: false,
                    canPassOverPits: false,
                    canPassThroughWalls: false,
                    stopLocations: [{q: 1, r: 1}],
                    numberOfActions: 1,
                }),
                missionMap: map,
                repository: squaddieRepo,
            });

            const movePath: SearchPath = SearchResultsHelper.getShortestPathToLocation(searchResults, 1, 1);

            let decisionActionEffectIterator = DecisionActionEffectIteratorService.new({
                decision: TODODELETEMESquaddieActionsForThisRoundService.getMostRecentDecision(newInstruction)
            });

            return BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    missionMap: map,
                    searchPath: movePath,
                    squaddieCurrentlyActing: TODODELETEMECurrentlySelectedSquaddieDecisionService.new({
                        squaddieActionsForThisRound: newInstruction,
                    }),
                }),
                decisionActionEffectIterator,
            });
        }

        it('resets squaddie currently acting when it runs out of actions and finishes moving', () => {
            map.addSquaddie("player_1", "player_1", {q: 0, r: 0});

            const moveAction: TODODELETEMESquaddieDecisionsDuringThisPhase = TODODELETEMESquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "player_1",
                battleSquaddieId: "player_1",
                startingLocation: {q: 0, r: 0},
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectMovementService.new({
                                destination: {q: 1, r: 1},
                                numberOfActionPointsSpent: 3,
                            })
                        ]
                    })
                ]
            });

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            const state: GameEngineState = GameEngineStateService.new({
                battleOrchestratorState: setupSquaddie({
                    battleSquaddieId: "player_1",
                    squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    newInstruction: moveAction,
                }),
                repository: squaddieRepo,
                resourceHandler: mockResourceHandler,
            });
            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing).not.toBeUndefined();
            player1BattleSquaddie.squaddieTurn.remainingActionPoints = 0;

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5GraphicsContext);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5GraphicsContext);
            mover.reset(state);
            expect(state.battleOrchestratorState.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
            expect(state.battleOrchestratorState.battleState.squaddieCurrentlyActing).toBeUndefined();
        });

        it('should open the HUD if the squaddie turn has actions remaining', () => {
            map.addSquaddie("player_1", "player_1", {q: 0, r: 0});

            const moveAction: TODODELETEMESquaddieDecisionsDuringThisPhase = TODODELETEMESquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "player_1",
                battleSquaddieId: "player_1",
                startingLocation: {q: 0, r: 0},
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectMovementService.new({
                                destination: {q: 1, r: 1},
                                numberOfActionPointsSpent: 1,
                            })
                        ]
                    })
                ]
            });

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));
            const state: GameEngineState = GameEngineStateService.new({
                battleOrchestratorState: setupSquaddie({
                    battleSquaddieId: "player_1",
                    squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    newInstruction: moveAction,
                }),
                resourceHandler: mockResourceHandler,
                repository: squaddieRepo,
            });

            state.battleOrchestratorState.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                battleId: "player_1",
                repositionWindow: {mouseX: 0, mouseY: 0},
                state: state,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5GraphicsContext);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5GraphicsContext);
            mover.reset(state);
            expect(state.battleOrchestratorState.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
        });

        it('should not open the HUD if the squaddie turn is incomplete and is not controllable by the player', () => {
            map.addSquaddie("enemy_1", "enemy_1", {q: 0, r: 0});

            const moveAction: TODODELETEMESquaddieDecisionsDuringThisPhase = TODODELETEMESquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "enemy_1",
                battleSquaddieId: "enemy_1",
                startingLocation: {q: 0, r: 0},
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectMovementService.new({
                                destination: {q: 1, r: 1},
                                numberOfActionPointsSpent: 1,
                            })
                        ]
                    })
                ]
            });

            let mockResourceHandler = mocks.mockResourceHandler();
            mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

            const state: GameEngineState = GameEngineStateService.new({
                battleOrchestratorState: setupSquaddie({
                    battleSquaddieId: "enemy_1",
                    squaddieAffiliation: SquaddieAffiliation.ENEMY,
                    newInstruction: moveAction,
                }),
                resourceHandler: mockResourceHandler,
                repository: squaddieRepo,
            });

            state.battleOrchestratorState.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                battleId: "enemy_1",
                repositionWindow: {mouseX: 0, mouseY: 0},
                state: state,
            });

            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            jest.spyOn(Date, 'now').mockImplementation(() => 1);
            mover.update(state, mockedP5GraphicsContext);
            jest.spyOn(Date, 'now').mockImplementation(() => 1 + TIME_TO_MOVE);
            mover.update(state, mockedP5GraphicsContext);
            mover.reset(state);
            expect(state.battleOrchestratorState.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeFalsy();
        });
    });

    describe('will determine the next mode based on the next action effect', () => {
        let movementActionEffect: TODODELETEMEactionEffect;
        let squaddieActionEffect: TODODELETEMEactionEffect;
        let endTurnActionEffect: TODODELETEMEactionEffect;

        beforeEach(() => {
            movementActionEffect = ActionEffectMovementService.new({
                destination: {q: 0, r: 2},
                numberOfActionPointsSpent: 2,
            });

            // squaddieActionEffect = ActionEffectSquaddieService.new({
            //     targetLocation: {q: 0, r: 2},
            //     numberOfActionPointsSpent: 1,
            //     template: TODODELETEMEActionEffectSquaddieTemplateService.new({
            //         id: "shout",
            //         name: "shout"
            //     })
            // });

            endTurnActionEffect = ActionEffectEndTurnService.new();
        });

        const setupStateWithDecisions = (decision: TODODELETEMEdecision, decision1: TODODELETEMEdecision): GameEngineState => {
            const moveDecisions: TODODELETEMESquaddieDecisionsDuringThisPhase = TODODELETEMESquaddieActionsForThisRoundService.new({
                squaddieTemplateId: "enemy_1",
                battleSquaddieId: "enemy_1",
                startingLocation: {q: 0, r: 0},
                decisions: [
                    decision,
                    decision1,
                ].filter(x => x)
            });

            return GameEngineStateService.new({
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                    battleState: BattleStateService.newBattleState({
                        missionId: "the mission",
                        squaddieCurrentlyActing: TODODELETEMECurrentlySelectedSquaddieDecisionService.new({
                            squaddieActionsForThisRound: moveDecisions,
                        })
                    })
                }),
            });
        }

        it('will suggest the squaddie mover if it has a movement action', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    ActionEffectMovementService.new({
                        destination: {q: 1, r: 1},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    ActionEffectMovementService.new({
                        destination: {q: 1, r: 2},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            });

            const state: GameEngineState = setupStateWithDecisions(decision, decision1);
            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            const recommendedChanges = mover.recommendStateChanges(state);

            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(decision1.actionEffects[0]);
            expect(recommendedChanges.nextMode).toEqual(BattleOrchestratorMode.SQUADDIE_MOVER);
        });

        it('will suggest the squaddie act on squaddie mode if it has a squaddie action', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    movementActionEffect
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    squaddieActionEffect
                ]
            });
            const state: GameEngineState = setupStateWithDecisions(decision, decision1);
            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            const recommendedChanges = mover.recommendStateChanges(state);

            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(decision1.actionEffects[0]);
            expect(recommendedChanges.nextMode).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);
        });

        it('will suggest the squaddie act on map mode if it has an end turn action', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    movementActionEffect
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    endTurnActionEffect
                ]
            });
            const state: GameEngineState = setupStateWithDecisions(decision, decision1);
            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            const recommendedChanges = mover.recommendStateChanges(state);

            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toEqual(decision1.actionEffects[0]);
            expect(recommendedChanges.nextMode).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
        });

        it('will not suggest a mode if there are no more decisions to process', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    movementActionEffect
                ]
            });
            const state: GameEngineState = setupStateWithDecisions(decision, undefined);
            const mover: BattleSquaddieMover = new BattleSquaddieMover();
            const recommendedChanges = mover.recommendStateChanges(state);

            expect(OrchestratorUtilities.peekActionEffect(state.battleOrchestratorState, state.battleOrchestratorState.battleState.squaddieCurrentlyActing)).toBeUndefined();
            expect(recommendedChanges.nextMode).toBeUndefined();
        });
    });
});
