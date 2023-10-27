import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieAction} from "../../squaddie/action";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Trait, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {DamageType, HealingType} from "../../squaddie/squaddieService";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddie} from "../battleSquaddie";
import {CalculateResults} from "./calculator";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {MissionStatistics} from "../missionStatistics/missionStatistics";

describe('calculator', () => {
    let squaddieRepository: BattleSquaddieRepository;
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

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
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
                    attributes: new ArmyAttributes({
                        maxHitPoints: 5,
                    })
                })
        );

        ({battleSquaddie: enemy1BattleSquaddie} = CreateNewSquaddieAndAddToRepository({
            affiliation: SquaddieAffiliation.ENEMY,
            battleId: enemy1DynamicId,
            templateId: enemy1StaticId,
            name: "enemy",
            squaddieRepository,
            attributes: new ArmyAttributes({
                maxHitPoints: 5,
            })
        }));

        ({battleSquaddie: ally1BattleSquaddie} =
                CreateNewSquaddieAndAddToRepository({
                    affiliation: SquaddieAffiliation.ALLY,
                    battleId: ally1DynamicId,
                    templateId: ally1StaticId,
                    name: "ally",
                    squaddieRepository,
                    attributes: new ArmyAttributes({
                        maxHitPoints: 5,
                    })
                })
        );
    })

    describe('deals damage', () => {
        let actionDealsBodyDamage: SquaddieAction;
        let healsLostHitPoints: SquaddieAction;

        beforeEach(() => {
            missionMap.addSquaddie(player1StaticId, player1DynamicId, {q: 0, r: 0});
            missionMap.addSquaddie(enemy1StaticId, enemy1DynamicId, {q: 0, r: 1});
            missionMap.addSquaddie(ally1StaticId, ally1DynamicId, {q: 0, r: 2});

            actionDealsBodyDamage = new SquaddieAction({
                id: "deal body damage",
                name: "deal body damage",
                traits: new TraitStatusStorage({
                    initialTraitValues: {
                        [Trait.ATTACK]: true,
                        [Trait.ALWAYS_HITS]: true,
                    }
                }),
                minimumRange: 0,
                maximumRange: 9001,
                damageDescriptions: {[DamageType.Body]: 2}
            });
            healsLostHitPoints = new SquaddieAction({
                id: "heals lost hit points",
                name: "heals lost hit points",
                traits: new TraitStatusStorage({
                    initialTraitValues: {
                        [Trait.HEALING]: true,
                        [Trait.ALWAYS_HITS]: true,
                    }
                }),
                minimumRange: 0,
                maximumRange: 9001,
                healingDescriptions: {[HealingType.LostHitPoints]: 2},
            });
        });

        it('will deal full damage to unarmored foes', () => {
            const squaddieCurrentlyInProgress: SquaddieInstructionInProgress = {
                currentlySelectedAction: actionDealsBodyDamage,
                movingBattleSquaddieIds: [],
                squaddieActionsForThisRound: undefined,
            };

            const results = CalculateResults({
                    state: new BattleOrchestratorState({
                        missionMap,
                        squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                        squaddieRepository: squaddieRepository,
                    }),
                    actingBattleSquaddie: player1BattleSquaddie,
                    validTargetLocation: {q: 0, r: 1},
                }
            );

            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(2);
        });

        it('will record the damage dealt by the player to mission statistics', () => {
            const missionStatistics: MissionStatistics = new MissionStatistics({});
            missionStatistics.reset();
            missionStatistics.startRecording();

            const squaddieCurrentlyInProgress: SquaddieInstructionInProgress = {
                currentlySelectedAction: actionDealsBodyDamage,
                movingBattleSquaddieIds: [],
                squaddieActionsForThisRound: undefined,
            };

            CalculateResults({
                    state: new BattleOrchestratorState({
                        missionMap,
                        squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                        squaddieRepository: squaddieRepository,
                        missionStatistics,
                    }),
                    actingBattleSquaddie: player1BattleSquaddie,
                    validTargetLocation: {q: 0, r: 1},
                }
            );

            expect(missionStatistics.damageDealtByPlayerTeam).toBe(2);
        });

        it('will record the damage dealt to the player to mission statistics', () => {
            const missionStatistics: MissionStatistics = new MissionStatistics({});
            missionStatistics.reset();
            missionStatistics.startRecording();

            const squaddieCurrentlyInProgress: SquaddieInstructionInProgress = {
                currentlySelectedAction: actionDealsBodyDamage,
                movingBattleSquaddieIds: [],
                squaddieActionsForThisRound: undefined,
            };
            CalculateResults({
                    state: new BattleOrchestratorState({
                        missionMap,
                        squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                        squaddieRepository: squaddieRepository,
                        missionStatistics,
                    }),
                    actingBattleSquaddie: enemy1BattleSquaddie,
                    validTargetLocation: {q: 0, r: 0},
                }
            );

            expect(missionStatistics.damageTakenByPlayerTeam).toBe(2);
        });

        it('will heal allies fully', () => {
            ally1BattleSquaddie.inBattleAttributes.takeDamage(ally1BattleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints - 1, DamageType.Unknown);

            const squaddieCurrentlyInProgress: SquaddieInstructionInProgress = {
                currentlySelectedAction: healsLostHitPoints,
                movingBattleSquaddieIds: [],
                squaddieActionsForThisRound: undefined,
            };

            const results = CalculateResults({
                    state: new BattleOrchestratorState({
                        missionMap,
                        squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                        squaddieRepository: squaddieRepository,
                    }),

                    actingBattleSquaddie: player1BattleSquaddie,
                    validTargetLocation: {q: 0, r: 2},
                }
            );

            expect(results.resultPerTarget[ally1DynamicId].healingReceived).toBe(2);
        });

        it('will record the healing received by a player to mission statistics', () => {
            const missionStatistics: MissionStatistics = new MissionStatistics({});
            missionStatistics.reset();
            missionStatistics.startRecording();

            player1BattleSquaddie.inBattleAttributes.takeDamage(ally1BattleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints - 1, DamageType.Unknown);

            const squaddieCurrentlyInProgress: SquaddieInstructionInProgress = {
                currentlySelectedAction: healsLostHitPoints,
                movingBattleSquaddieIds: [],
                squaddieActionsForThisRound: undefined,
            };

            CalculateResults({
                    state: new BattleOrchestratorState({
                        missionMap,
                        squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                        squaddieRepository: squaddieRepository,
                        missionStatistics,
                    }),

                    actingBattleSquaddie: player1BattleSquaddie,
                    validTargetLocation: {q: 0, r: 0},
                }
            );

            expect(missionStatistics.healingReceivedByPlayerTeam).toBe(2);
        });
    });
});
