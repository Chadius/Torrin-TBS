import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera} from "../battleCamera";
import {convertMapCoordinatesToScreenCoordinates,} from "../../hexMap/convertCoordinates";
import {GetSquaddieAtMapLocation, GetSquaddieAtScreenLocation, OrchestratorUtilities} from "./orchestratorUtils";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate, SquaddieTemplateService} from "../../campaign/squaddieTemplate";
import {ArmyAttributesService} from "../../squaddie/armyAttributes";
import {SquaddieIdService} from "../../squaddie/id";
import {BattleOrchestratorState, BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {BattleStateService} from "../orchestrator/battleState";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {Decision, DecisionService} from "../../decision/decision";
import {ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {SquaddieActionsForThisRoundService} from "../history/squaddieDecisionsDuringThisPhase";
import {SquaddieService} from "../../squaddie/squaddieService";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {DEFAULT_ACTION_POINTS_PER_TURN} from "../../squaddie/turn";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {ActionEffectSquaddieTemplateService} from "../../decision/actionEffectSquaddieTemplate";
import {ActionEffect} from "../../decision/actionEffect";
import {DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";

describe("Orchestration Utils", () => {
    let knightSquaddieStatic: SquaddieTemplate;
    let knightBattleSquaddie: BattleSquaddie;
    let squaddieRepository: ObjectRepository;
    let map: MissionMap;
    let camera: BattleCamera;
    let movementActionEffect: ActionEffect;
    let squaddieActionEffect: ActionEffect;
    let endTurnActionEffect: ActionEffect;

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryService.new();

        ({
            squaddieTemplate: knightSquaddieStatic,
            battleSquaddie: knightBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "knight",
            templateId: "knight_static",
            battleId: "knight_dynamic",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        }));

        map = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 "
                ]
            })
        });
        map.addSquaddie(
            knightSquaddieStatic.squaddieId.templateId,
            knightBattleSquaddie.battleSquaddieId,
            {q: 0, r: 2}
        );

        camera = new BattleCamera();

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

    it('can return the squaddie and information at a given location on the screen', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 2, ...camera.getCoordinates());

        const {
            squaddieTemplate,
            battleSquaddie,
            squaddieMapLocation,
        } = GetSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera,
            map,
            squaddieRepository,
        });

        expect(squaddieTemplate).toStrictEqual(knightSquaddieStatic);
        expect(battleSquaddie).toStrictEqual(knightBattleSquaddie);
        expect(squaddieMapLocation).toStrictEqual({q: 0, r: 2});
    });

    it('can return the squaddie and information at a given map location', () => {
        const {
            squaddieTemplate,
            battleSquaddie,
            squaddieMapLocation,
        } = GetSquaddieAtMapLocation({
            mapLocation: {q: 0, r: 2},
            map,
            squaddieRepository,
        });

        expect(squaddieTemplate).toStrictEqual(knightSquaddieStatic);
        expect(battleSquaddie).toStrictEqual(knightBattleSquaddie);
        expect(squaddieMapLocation).toStrictEqual({q: 0, r: 2});
    });

    it('returns undefined information if there is no squaddie at the location', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());

        const {
            squaddieTemplate,
            battleSquaddie,
            squaddieMapLocation,
        } = GetSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera,
            map,
            squaddieRepository,
        });

        expect(squaddieTemplate).toBeUndefined();
        expect(battleSquaddie).toBeUndefined();
        expect(squaddieMapLocation).toBeUndefined();
    });

    it('throws an error if squaddie repository does not have squaddie', () => {
        map.addSquaddie("static does not exist", "dynamic does not exist",
            {q: 0, r: 0}
        );
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());

        const shouldThrowError = () => {
            GetSquaddieAtScreenLocation({
                mouseX,
                mouseY,
                camera,
                map,
                squaddieRepository,
            });
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
    });

    describe('isSquaddieCurrentlyTakingATurn', () => {
        let repository: ObjectRepository;
        let state: BattleOrchestratorState;
        let moveDecision: Decision;

        beforeEach(() => {
            repository = ObjectRepositoryService.new();
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                SquaddieTemplateService.new({
                    attributes: ArmyAttributesService.default(),
                    squaddieId: SquaddieIdService.new({
                        templateId: "templateId",
                        name: "name",
                        affiliation: SquaddieAffiliation.PLAYER,
                    }),
                })
            )
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                BattleSquaddieService.new({
                    squaddieTemplateId: "templateId",
                    battleSquaddieId: "battle"
                })
            );

            state = new BattleOrchestratorState({
                squaddieRepository: repository,
                battleState: BattleStateService.defaultBattleState({
                    missionId: "missionId"
                }),
                battleSquaddieSelectedHUD: undefined,
                decisionActionEffectIterator: undefined,
                numberGenerator: undefined,
                resourceHandler: undefined
            });

            moveDecision = DecisionService.new({
                actionEffects: [
                    ActionEffectMovementService.new({
                        destination: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            })
        });

        it('is not if there is no state or battle state', () => {
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(undefined)).toBeFalsy();
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(new BattleOrchestratorState({
                squaddieRepository,
                battleState: undefined,
                battleSquaddieSelectedHUD: undefined,
                decisionActionEffectIterator: undefined,
                numberGenerator: undefined,
                resourceHandler: undefined
            }))).toBeFalsy();
        });

        it('is not if there is no squaddie is currently acting', () => {
            state.battleState.squaddieCurrentlyActing = undefined;
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeFalsy();

            state.battleState.squaddieCurrentlyActing = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.default()
            });
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeFalsy();
        });

        it('is if the squaddie is previewing a decision', () => {
            state.battleState.squaddieCurrentlyActing = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "battle",
                    squaddieTemplateId: "templateId",
                    startingLocation: {q: 0, r: 0},
                    decisions: [],
                }),
                currentlySelectedDecision: moveDecision,
            });
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeTruthy();
        });

        it('is if the squaddie already made a decision that does not end the turn', () => {
            state.battleState.squaddieCurrentlyActing = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "battle",
                    squaddieTemplateId: "templateId",
                    startingLocation: {q: 0, r: 0},
                    decisions: [moveDecision],
                }),
            });
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeTruthy();
        });

        it('will agree with the squaddie service after finishing its checks', () => {
            state.battleState.squaddieCurrentlyActing = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "battle",
                    squaddieTemplateId: "templateId",
                    startingLocation: {q: 0, r: 0},
                }),
            });

            let squaddieServiceSpy = jest.spyOn(SquaddieService, 'isSquaddieCurrentlyTakingATurn').mockReturnValue(true);
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeTruthy();
            expect(squaddieServiceSpy).toBeCalled();

            jest.clearAllMocks();
            expect(squaddieServiceSpy).not.toBeCalled();

            squaddieServiceSpy = jest.spyOn(SquaddieService, 'isSquaddieCurrentlyTakingATurn').mockReturnValue(false);
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeFalsy();
            expect(squaddieServiceSpy).toBeCalled();
        });

        it('is not if the squaddie already made a decision that does end the turn', () => {
            state.battleState.squaddieCurrentlyActing = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "battle",
                    squaddieTemplateId: "templateId",
                    startingLocation: {q: 0, r: 0},
                    decisions: [
                        DecisionService.new({
                            actionEffects: [ActionEffectEndTurnService.new()]
                        })
                    ],
                }),
            });

            let squaddieServiceSpy = jest.spyOn(SquaddieService, 'isSquaddieCurrentlyTakingATurn').mockReturnValue(false);
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeFalsy();
            expect(squaddieServiceSpy).toBeCalled();
            jest.clearAllMocks();
        });

        it('is not if the squaddie cancels their first decision before confirming it', () => {
            state.battleState.squaddieCurrentlyActing = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "battle",
                    squaddieTemplateId: "templateId",
                    startingLocation: {q: 0, r: 0},
                    decisions: [],
                }),
                currentlySelectedDecision: moveDecision,
            });
            CurrentlySelectedSquaddieDecisionService.cancelSelectedCurrentDecision(state.battleState.squaddieCurrentlyActing);
            expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeFalsy();
        });
    });

    describe('updateSquaddieBasedOnActionEffect', () => {
        it('will move the squaddie and spend action points based on the movement actionEffect', () => {
            OrchestratorUtilities.updateSquaddieBasedOnActionEffect({
                actionEffect: ActionEffectMovementService.new({
                    destination: {q: 0, r: 2},
                    numberOfActionPointsSpent: 2,
                }),
                missionMap: map,
                repository: squaddieRepository,
                battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            });

            expect(knightBattleSquaddie.squaddieTurn.remainingActionPoints).toEqual(DEFAULT_ACTION_POINTS_PER_TURN - 2);
            let {mapLocation} = map.getSquaddieByBattleId(knightBattleSquaddie.battleSquaddieId);
            expect(mapLocation).toEqual({q: 0, r: 2});
        });
        it('will spend action points based on the squaddie actionEffect', () => {
            OrchestratorUtilities.updateSquaddieBasedOnActionEffect({
                actionEffect: ActionEffectSquaddieService.new({
                    targetLocation: {q: 0, r: 2},
                    numberOfActionPointsSpent: 1,
                    template: ActionEffectSquaddieTemplateService.new({
                        id: "shout",
                        name: "shout"
                    })
                }),
                missionMap: map,
                repository: squaddieRepository,
                battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            });

            expect(knightBattleSquaddie.squaddieTurn.remainingActionPoints).toEqual(DEFAULT_ACTION_POINTS_PER_TURN - 1);
        });
        it('will spend all action points when an end turn actionEffect is used', () => {
            OrchestratorUtilities.updateSquaddieBasedOnActionEffect({
                actionEffect: ActionEffectEndTurnService.new(),
                missionMap: map,
                repository: squaddieRepository,
                battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            });

            expect(knightBattleSquaddie.squaddieTurn.remainingActionPoints).toEqual(0);
        });
    });

    describe('iterateToNextActionEffect', () => {
        it('will not create an iterator and return undefined if it is called without a decision', () => {
            const currentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "battleSquaddieId",
                    startingLocation: {q: 0, r: 0},
                    squaddieTemplateId: "squaddieTemplateId",
                })
            });

            const state = BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                battleState: BattleStateService.defaultBattleState({
                    squaddieCurrentlyActing: currentlySelectedSquaddieDecision,
                    missionId: "da mission",
                }),
            });

            expect(OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)).toBeUndefined();
            expect(state.decisionActionEffectIterator).toBeUndefined()
            expect(OrchestratorUtilities.nextActionEffect(state, currentlySelectedSquaddieDecision)).toBeUndefined();
        });

        it('will create an iterator the first time it is called and a decision exists', () => {
            const decision = DecisionService.new({
                actionEffects: [
                    movementActionEffect,
                ]
            });

            const currentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "battleSquaddieId",
                    startingLocation: {q: 0, r: 0},
                    squaddieTemplateId: "squaddieTemplateId",
                    decisions: [decision],
                })
            });

            const state = BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                battleState: BattleStateService.defaultBattleState({
                    squaddieCurrentlyActing: currentlySelectedSquaddieDecision,
                    missionId: "da mission",
                }),
            });

            OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)
            expect(currentlySelectedSquaddieDecision.decisionIndex).toEqual(0);
            expect(state.decisionActionEffectIterator).toEqual({
                decision,
                actionEffectIndex: 0,
            });

            expect(OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(movementActionEffect);
        });

        it('will iterate to the next action effect of a single decision', () => {
            const decisionWithManyActionEffects = DecisionService.new({
                actionEffects: [
                    movementActionEffect,
                    squaddieActionEffect,
                    endTurnActionEffect,
                ]
            });

            const currentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "battleSquaddieId",
                    startingLocation: {q: 0, r: 0},
                    squaddieTemplateId: "squaddieTemplateId",
                    decisions: [decisionWithManyActionEffects],
                })
            });

            const state = BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                battleState: BattleStateService.defaultBattleState({
                    squaddieCurrentlyActing: currentlySelectedSquaddieDecision,
                    missionId: "da mission",
                }),
            })

            expect(OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(movementActionEffect);
            expect(OrchestratorUtilities.nextActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(movementActionEffect);

            expect(OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(squaddieActionEffect);
            expect(OrchestratorUtilities.nextActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(squaddieActionEffect);

            expect(OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(endTurnActionEffect);
            expect(OrchestratorUtilities.nextActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(endTurnActionEffect);

            expect(OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)).toBeUndefined();
            expect(OrchestratorUtilities.nextActionEffect(state, currentlySelectedSquaddieDecision)).toBeUndefined();
        });

        it('will iterate between multiple decisions', () => {
            const decision0 = DecisionService.new({
                actionEffects: [
                    movementActionEffect,
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    squaddieActionEffect,
                ]
            });

            const currentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "battleSquaddieId",
                    startingLocation: {q: 0, r: 0},
                    squaddieTemplateId: "squaddieTemplateId",
                    decisions: [decision0, decision1],
                })
            });

            const state = BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                battleState: BattleStateService.defaultBattleState({
                    squaddieCurrentlyActing: currentlySelectedSquaddieDecision,
                    missionId: "da mission",
                }),
            });

            expect(OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(movementActionEffect);
            expect(OrchestratorUtilities.nextActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(movementActionEffect);

            expect(OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(squaddieActionEffect);
            expect(OrchestratorUtilities.nextActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(squaddieActionEffect);

            expect(OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)).toBeUndefined();
            expect(OrchestratorUtilities.nextActionEffect(state, currentlySelectedSquaddieDecision)).toBeUndefined();
        });

        it('will reset the iterator if a different decision is used', () => {
            const decision0 = DecisionService.new({
                actionEffects: [
                    movementActionEffect,
                ]
            });
            const decision1 = DecisionService.new({
                actionEffects: [
                    squaddieActionEffect,
                ]
            });

            const currentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                    battleSquaddieId: "battleSquaddieId",
                    startingLocation: {q: 0, r: 0},
                    squaddieTemplateId: "squaddieTemplateId",
                    decisions: [decision0],
                })
            });

            const state = BattleOrchestratorStateService.newOrchestratorState({
                resourceHandler: undefined,
                battleState: BattleStateService.defaultBattleState({
                    squaddieCurrentlyActing: currentlySelectedSquaddieDecision,
                    missionId: "da mission",
                }),
                decisionActionEffectIterator: DecisionActionEffectIteratorService.new({decision: decision1}),
            });
            expect(DecisionActionEffectIteratorService.peekActionEffect(state.decisionActionEffectIterator)).toEqual(squaddieActionEffect);

            expect(OrchestratorUtilities.peekActionEffect(state, currentlySelectedSquaddieDecision)).toEqual(movementActionEffect);
            expect(DecisionActionEffectIteratorService.peekActionEffect(state.decisionActionEffectIterator)).toEqual(movementActionEffect);
        });
    });

    describe('recommendNewModeBasedOnActionEffect', () => {
        it('will recommend moving a squaddie if the next action effect is movement type', () => {
            expect(OrchestratorUtilities.getNextModeBasedOnActionEffect(movementActionEffect)).toEqual(BattleOrchestratorMode.SQUADDIE_MOVER);
        });
        it('will recommend using an action effect on a squaddie if the next action effect is squaddie type', () => {
            expect(OrchestratorUtilities.getNextModeBasedOnActionEffect(squaddieActionEffect)).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE);
        });
        it('will recommend acting on the map if the next action effect is end turn', () => {
            expect(OrchestratorUtilities.getNextModeBasedOnActionEffect(endTurnActionEffect)).toEqual(BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP);
        });
        it('will return undefined if there is no action effect', () => {
            expect(OrchestratorUtilities.getNextModeBasedOnActionEffect(undefined)).toBeUndefined();
        });
    });
});
