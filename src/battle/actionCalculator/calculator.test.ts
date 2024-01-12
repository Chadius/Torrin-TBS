import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {DamageType, HealingType} from "../../squaddie/squaddieService";
import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddie} from "../battleSquaddie";
import {
    CurrentlySelectedSquaddieDecision,
    CurrentlySelectedSquaddieDecisionService
} from "../history/currentlySelectedSquaddieDecision";
import {MissionStatistics, MissionStatisticsHandler} from "../missionStatistics/missionStatistics";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {InBattleAttributesHandler} from "../stats/inBattleAttributes";
import {BattleStateService} from "../orchestrator/battleState";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {StreamNumberGenerator} from "../numberGenerator/stream";
import {NumberGeneratorStrategy} from "../numberGenerator/strategy";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ActionCalculator} from "./calculator";
import {SquaddieActionsForThisRoundService} from "../history/squaddieDecisionsDuringThisPhase";

import {ATTACK_MODIFIER} from "../modifierConstants";
import {DegreeOfSuccess} from "./degreeOfSuccess";
import {DecisionService} from "../../decision/decision";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";

describe('calculator', () => {
    let squaddieRepository: ObjectRepository;
    let missionMap: MissionMap;
    let player1DynamicId = "player 1";
    let player1StaticId = "player 1";
    let player1BattleSquaddie: BattleSquaddie;
    let enemy1DynamicId = "enemy 1";
    let enemy1StaticId = "enemy 1";
    let enemy1BattleSquaddie: BattleSquaddie;
    let ally1DynamicId = "ally 1";
    let ally1StaticId = "ally 1";
    let ally1BattleSquaddie: BattleSquaddie;
    let actionAlwaysHitsAndDealsBodyDamage: ActionEffectSquaddieTemplate;
    let actionNeedsAnAttackRollToDealBodyDamage: ActionEffectSquaddieTemplate;

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryService.new();
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 1 1 1 "]
            })
        });

        ({battleSquaddie: player1BattleSquaddie} =
                CreateNewSquaddieAndAddToRepository({
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleId: player1DynamicId,
                    templateId: player1StaticId,
                    name: "player",
                    squaddieRepository,
                    attributes: {
                        maxHitPoints: 5,
                        movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                        armorClass: 1,
                    }
                })
        );

        ({battleSquaddie: enemy1BattleSquaddie} = CreateNewSquaddieAndAddToRepository({
            affiliation: SquaddieAffiliation.ENEMY,
            battleId: enemy1DynamicId,
            templateId: enemy1StaticId,
            name: "enemy",
            squaddieRepository,
            attributes: {
                maxHitPoints: 5,
                movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                armorClass: 7,
            }
        }));

        ({battleSquaddie: ally1BattleSquaddie} =
                CreateNewSquaddieAndAddToRepository({
                    affiliation: SquaddieAffiliation.ALLY,
                    battleId: ally1DynamicId,
                    templateId: ally1StaticId,
                    name: "ally",
                    squaddieRepository,
                    attributes: {
                        maxHitPoints: 5,
                        movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                        armorClass: 0,
                    }
                })
        );

        actionAlwaysHitsAndDealsBodyDamage = ActionEffectSquaddieTemplateService.new({
            id: "deal body damage auto hit",
            name: "deal body damage (Auto Hit)",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                    [Trait.ATTACK]: true,
                    [Trait.ALWAYS_SUCCEEDS]: true,
                }
            ),
            minimumRange: 0,
            maximumRange: 9001,
            damageDescriptions: {[DamageType.BODY]: 2}
        });
        actionNeedsAnAttackRollToDealBodyDamage = ActionEffectSquaddieTemplateService.new({
            id: "deal body damage",
            name: "deal body damage",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                    [Trait.ATTACK]: true,
                }
            ),
            minimumRange: 0,
            maximumRange: 9001,
            damageDescriptions: {[DamageType.BODY]: 2}
        });
    })

    function dealBodyDamage({
                                actingBattleSquaddie,
                                validTargetLocation,
                                missionStatistics,
                                currentlySelectedAction,
                                numberGenerator,
                            }: {
        currentlySelectedAction?: ActionEffectSquaddieTemplate,
        actingBattleSquaddie?: BattleSquaddie,
        validTargetLocation?: HexCoordinate,
        missionStatistics?: MissionStatistics,
        numberGenerator?: NumberGeneratorStrategy,
    }) {
        const squaddieCurrentlyInProgress: CurrentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
            currentlySelectedDecision: DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: currentlySelectedAction ?? actionAlwaysHitsAndDealsBodyDamage,
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }),

            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.default(),
        });

        return ActionCalculator.calculateResults({
                state: BattleOrchestratorStateService.newOrchestratorState({
                    squaddieRepository: squaddieRepository,
                    resourceHandler: undefined,
                    battleSquaddieSelectedHUD: undefined,
                    numberGenerator,
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        missionMap,
                        squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                        missionStatistics,
                    }),
                }),
                actingBattleSquaddie: actingBattleSquaddie ?? player1BattleSquaddie,
                validTargetLocation: validTargetLocation ?? {q: 0, r: 1},
            }
        );
    }

    describe('deals damage', () => {
        beforeEach(() => {
            missionMap.addSquaddie(player1StaticId, player1DynamicId, {q: 0, r: 0});
            missionMap.addSquaddie(enemy1StaticId, enemy1DynamicId, {q: 0, r: 1});
        });

        it('will deal full damage to unarmored foes', () => {
            const results = dealBodyDamage({currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage});
            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(2);
        });

        it('will not require a roll for attacks that always hit', () => {
            const results = dealBodyDamage({currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage});
            expect(results.actingSquaddieRoll.occurred).toBeFalsy();
        });

        it('will require a roll for attacks that require rolls', () => {
            const expectedRolls: number[] = [61, 66];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            const results = dealBodyDamage({
                currentlySelectedAction: actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            });
            expect(results.actingSquaddieRoll.occurred).toBeTruthy();
            expect(results.actingSquaddieRoll.rolls).toEqual([1, 6]);
        });

        it('will record the damage dealt by the player to mission statistics', () => {
            const missionStatistics: MissionStatistics = MissionStatisticsHandler.new();
            MissionStatisticsHandler.reset(missionStatistics);
            MissionStatisticsHandler.startRecording(missionStatistics);

            dealBodyDamage({missionStatistics});

            expect(missionStatistics.damageDealtByPlayerTeam).toBe(2);
        });

        it('will record the damage dealt to the player to mission statistics', () => {
            const missionStatistics: MissionStatistics = MissionStatisticsHandler.new();
            MissionStatisticsHandler.reset(missionStatistics);
            MissionStatisticsHandler.startRecording(missionStatistics);

            dealBodyDamage({
                actingBattleSquaddie: enemy1BattleSquaddie,
                validTargetLocation: {q: 0, r: 0},
                missionStatistics,
            });

            expect(missionStatistics.damageTakenByPlayerTeam).toBe(2);
        });
    });

    describe('healing abilities', () => {
        let healsLostHitPoints: ActionEffectSquaddieTemplate;

        beforeEach(() => {
            missionMap.addSquaddie(player1StaticId, player1DynamicId, {q: 0, r: 0});
            missionMap.addSquaddie(ally1StaticId, ally1DynamicId, {q: 0, r: 2});

            healsLostHitPoints = ActionEffectSquaddieTemplateService.new({
                id: "heals lost hit points",
                name: "heals lost hit points",
                traits: TraitStatusStorageHelper.newUsingTraitValues(
                    {
                        [Trait.HEALING]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                    }
                ),
                minimumRange: 0,
                maximumRange: 9001,
                healingDescriptions: {[HealingType.LOST_HIT_POINTS]: 2},
            });
        });

        it('will heal allies fully', () => {
            InBattleAttributesHandler.takeDamage(
                ally1BattleSquaddie.inBattleAttributes,
                ally1BattleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints - 1, DamageType.UNKNOWN);

            const squaddieCurrentlyInProgress: CurrentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
                currentlySelectedDecision: DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            template: healsLostHitPoints,
                            targetLocation: {q: 0, r: 0},
                            numberOfActionPointsSpent: 1,
                        })
                    ]
                }),
                squaddieActionsForThisRound: undefined
            });

            const results = ActionCalculator.calculateResults({
                    state: BattleOrchestratorStateService.newOrchestratorState({
                        resourceHandler: undefined,
                        battleSquaddieSelectedHUD: undefined,
                        battleState: BattleStateService.newBattleState({
                            missionId: "test mission",
                            missionMap,
                            squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                        }),

                        squaddieRepository: squaddieRepository,
                    }),

                    actingBattleSquaddie: player1BattleSquaddie,
                    validTargetLocation: {q: 0, r: 2},
                }
            );

            expect(results.resultPerTarget[ally1DynamicId].healingReceived).toBe(2);
        });

        it('will record the healing received by a player to mission statistics', () => {
            const missionStatistics: MissionStatistics = MissionStatisticsHandler.new();
            MissionStatisticsHandler.reset(missionStatistics);
            MissionStatisticsHandler.startRecording(missionStatistics);

            InBattleAttributesHandler.takeDamage(
                player1BattleSquaddie.inBattleAttributes,
                ally1BattleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints - 1, DamageType.UNKNOWN
            );

            const squaddieCurrentlyInProgress: CurrentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
                currentlySelectedDecision: DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            template: healsLostHitPoints,
                            targetLocation: {q: 0, r: 0},
                            numberOfActionPointsSpent: 1,
                        })
                    ]
                }),
                squaddieActionsForThisRound: undefined,
            });

            ActionCalculator.calculateResults({
                    state: BattleOrchestratorStateService.newOrchestratorState({
                        resourceHandler: undefined,
                        battleSquaddieSelectedHUD: undefined,
                        battleState: BattleStateService.newBattleState({
                            missionId: "test mission",
                            missionMap,
                            squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                            missionStatistics,
                        }),
                        squaddieRepository: squaddieRepository,
                    }),

                    actingBattleSquaddie: player1BattleSquaddie,
                    validTargetLocation: {q: 0, r: 0},
                }
            );

            expect(missionStatistics.healingReceivedByPlayerTeam).toBe(2);
        });
    });

    describe('chance to hit', () => {
        beforeEach(() => {
            missionMap.addSquaddie(player1StaticId, player1DynamicId, {q: 0, r: 0});
            missionMap.addSquaddie(enemy1StaticId, enemy1DynamicId, {q: 0, r: 1});
        });

        it('will hit if the roll hits the defender armor', () => {
            const {battleSquaddie: enemyBattle} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, enemy1DynamicId));
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 7;

            const expectedRolls: number[] = [1, 6];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            const results = dealBodyDamage({
                currentlySelectedAction: actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            });
            expect(results.resultPerTarget[enemy1DynamicId].actorDegreeOfSuccess).toBe(DegreeOfSuccess.SUCCESS);
            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(actionAlwaysHitsAndDealsBodyDamage.damageDescriptions.BODY);
        });

        it('will miss if the roll is less than the defender armor class', () => {
            const {battleSquaddie: enemyBattle} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, enemy1DynamicId));
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 7;

            const expectedRolls: number[] = [1, 2];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            const results = dealBodyDamage({
                currentlySelectedAction: actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            });
            expect(results.resultPerTarget[enemy1DynamicId].actorDegreeOfSuccess).toBe(DegreeOfSuccess.FAILURE);
            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(0);
        });

        it('will always hit if the action always hits', () => {
            const {battleSquaddie: enemyBattle} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, enemy1DynamicId));
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 7;

            const expectedRolls: number[] = [1, 2];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            const results = dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
                numberGenerator,
            });

            expect(results.resultPerTarget[enemy1DynamicId].actorDegreeOfSuccess).toBe(DegreeOfSuccess.SUCCESS);
            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(actionAlwaysHitsAndDealsBodyDamage.damageDescriptions.BODY);
        });

        it('knows when multiple attack penalties should apply', () => {
            const {battleSquaddie: enemyBattle} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, enemy1DynamicId));
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 7;

            const expectedRolls: number[] = [1, 6];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            const squaddieCurrentlyInProgress: CurrentlySelectedSquaddieDecision = CurrentlySelectedSquaddieDecisionService.new({
                currentlySelectedDecision: DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            template: actionNeedsAnAttackRollToDealBodyDamage,
                            targetLocation: {q: 0, r: 0},
                            numberOfActionPointsSpent: 1,
                        })
                    ]
                }),

                squaddieActionsForThisRound: SquaddieActionsForThisRoundService.default(),
            });
            SquaddieActionsForThisRoundService.addDecision(
                squaddieCurrentlyInProgress.squaddieDecisionsDuringThisPhase,
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            template: actionNeedsAnAttackRollToDealBodyDamage,
                            numberOfActionPointsSpent: 1,
                            targetLocation: {q: 0, r: 0},
                        })
                    ]
                })
            );
            SquaddieActionsForThisRoundService.addDecision(
                squaddieCurrentlyInProgress.squaddieDecisionsDuringThisPhase,
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            template: actionNeedsAnAttackRollToDealBodyDamage,
                            numberOfActionPointsSpent: 1,
                            targetLocation: {q: 0, r: 0},
                        })
                    ]
                })
            );

            const results = ActionCalculator.calculateResults({
                    state: BattleOrchestratorStateService.newOrchestratorState({
                        squaddieRepository: squaddieRepository,
                        resourceHandler: undefined,
                        battleSquaddieSelectedHUD: undefined,
                        numberGenerator,
                        battleState: BattleStateService.newBattleState({
                            missionId: "test mission",
                            missionMap,
                            squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                            missionStatistics: MissionStatisticsHandler.new(),
                        }),
                    }),
                    actingBattleSquaddie: player1BattleSquaddie,
                    validTargetLocation: {q: 0, r: 1},
                }
            );

            expect(results.resultPerTarget[enemy1DynamicId].actorDegreeOfSuccess).toBe(DegreeOfSuccess.FAILURE);
            expect(results.actingSquaddieModifiers[ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY]).toEqual(-3);
        });
    });

    describe('critical hit chance', () => {
        beforeEach(() => {
            missionMap.addSquaddie(player1StaticId, player1DynamicId, {q: 0, r: 0});
            missionMap.addSquaddie(enemy1StaticId, enemy1DynamicId, {q: 0, r: 1});
        });

        it('will critically hit if the roll hits the defender armor by 6 points or more', () => {
            const {battleSquaddie: enemyBattle} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, enemy1DynamicId));
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 2;

            const expectedRolls: number[] = [2, 6];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            const results = dealBodyDamage({
                currentlySelectedAction: actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            });
            expect(results.resultPerTarget[enemy1DynamicId].actorDegreeOfSuccess).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(actionAlwaysHitsAndDealsBodyDamage.damageDescriptions.BODY * 2);
        });

        it('will critically hit if the roll is 6 and 6', () => {
            const {battleSquaddie: enemyBattle} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, enemy1DynamicId));
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 9001;

            const expectedRolls: number[] = [6, 6];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            const results = dealBodyDamage({
                currentlySelectedAction: actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            });
            expect(results.resultPerTarget[enemy1DynamicId].actorDegreeOfSuccess).toBe(DegreeOfSuccess.CRITICAL_SUCCESS);
            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(actionAlwaysHitsAndDealsBodyDamage.damageDescriptions.BODY * 2);
        });

        it('cannot critically hit if the action is forbidden from critically succeeding', () => {
            const {battleSquaddie: enemyBattle} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, enemy1DynamicId));
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 2;

            const expectedRolls: number[] = [6, 6];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            TraitStatusStorageHelper.setStatus(actionAlwaysHitsAndDealsBodyDamage.traits, Trait.CANNOT_CRITICALLY_SUCCEED, true);
            const results = dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
                numberGenerator,
            });

            expect(results.resultPerTarget[enemy1DynamicId].actorDegreeOfSuccess).toBe(DegreeOfSuccess.SUCCESS);
            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(actionAlwaysHitsAndDealsBodyDamage.damageDescriptions.BODY);
        });

        it('will critically miss if the roll is 6 points or more under the defender armor', () => {
            const {battleSquaddie: enemyBattle} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, enemy1DynamicId));
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 10;

            const expectedRolls: number[] = [2, 2];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            const results = dealBodyDamage({
                currentlySelectedAction: actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            });
            expect(results.resultPerTarget[enemy1DynamicId].actorDegreeOfSuccess).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(0);
        });

        it('will critically miss if the roll is 1 and 1', () => {
            const {battleSquaddie: enemyBattle} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, enemy1DynamicId));
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 9001;

            const expectedRolls: number[] = [1, 1];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            const results = dealBodyDamage({
                currentlySelectedAction: actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            });
            expect(results.resultPerTarget[enemy1DynamicId].actorDegreeOfSuccess).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(0);
        });

        it('cannot critically fail if the action is forbidden from critically failing', () => {
            const {battleSquaddie: enemyBattle} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, enemy1DynamicId));
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 10;

            const expectedRolls: number[] = [2, 2];
            const numberGenerator: StreamNumberGenerator = new StreamNumberGenerator({results: expectedRolls});

            TraitStatusStorageHelper.setStatus(actionNeedsAnAttackRollToDealBodyDamage.traits, Trait.CANNOT_CRITICALLY_FAIL, true);
            const results = dealBodyDamage({
                currentlySelectedAction: actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            });
            expect(results.resultPerTarget[enemy1DynamicId].actorDegreeOfSuccess).toBe(DegreeOfSuccess.CRITICAL_FAILURE);
            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(0);
        });
    });
});
