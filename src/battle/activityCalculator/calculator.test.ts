import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieActivity} from "../../squaddie/activity";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Trait, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {DamageType, HealingType} from "../../squaddie/squaddieService";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieDynamic} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {CalculateResults} from "./calculator";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {ArmyAttributes} from "../../squaddie/armyAttributes";

describe('calculator', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let player1DynamicId = "player 1";
    let player1StaticId = "player 1";
    let player1DynamicSquaddie: BattleSquaddieDynamic;
    let enemy1DynamicId = "enemy 1";
    let enemy1StaticId = "enemy 1";
    let ally1DynamicSquaddie: BattleSquaddieDynamic;
    let ally1DynamicId = "ally 1";
    let ally1StaticId = "ally 1";

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 1 1 1 "]
            })
        });

        ({dynamicSquaddie: player1DynamicSquaddie} =
                CreateNewSquaddieAndAddToRepository({
                    affiliation: SquaddieAffiliation.PLAYER,
                    dynamicId: player1DynamicId,
                    staticId: player1StaticId,
                    name: "player",
                    squaddieRepository,
                })
        );

        CreateNewSquaddieAndAddToRepository({
            affiliation: SquaddieAffiliation.ENEMY,
            dynamicId: enemy1DynamicId,
            staticId: enemy1StaticId,
            name: "enemy",
            squaddieRepository,
            attributes: new ArmyAttributes({
                maxHitPoints: 5,
            })
        });

        ({dynamicSquaddie: ally1DynamicSquaddie} =
                CreateNewSquaddieAndAddToRepository({
                    affiliation: SquaddieAffiliation.ALLY,
                    dynamicId: ally1DynamicId,
                    staticId: ally1StaticId,
                    name: "ally",
                    squaddieRepository,
                    attributes: new ArmyAttributes({
                        maxHitPoints: 5,
                    })
                })
        );
    })

    describe('deals damage', () => {
        beforeEach(() => {
            missionMap.addSquaddie(player1StaticId, player1DynamicId, new HexCoordinate({q: 0, r: 0}));
            missionMap.addSquaddie(enemy1StaticId, enemy1DynamicId, new HexCoordinate({q: 0, r: 1}));
            missionMap.addSquaddie(ally1StaticId, ally1DynamicId, new HexCoordinate({q: 0, r: 2}));
        });

        it('will deal full damage to unarmored foes', () => {
            const activityDealsBodyDamage = new SquaddieActivity({
                id: "deal body damage",
                name: "deal body damage",
                traits: new TraitStatusStorage({
                    [Trait.ATTACK]: true,
                    [Trait.ALWAYS_HITS]: true,
                }),
                minimumRange: 0,
                maximumRange: 9001,
                damageDescriptions: {[DamageType.Body]: 2}
            });

            const squaddieCurrentlyInProgress = new SquaddieInstructionInProgress({
                currentSquaddieActivity: activityDealsBodyDamage
            });

            const results = CalculateResults(
                new BattleOrchestratorState({
                    missionMap,
                    squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                    squaddieRepo: squaddieRepository,
                }),
                player1DynamicSquaddie,
                new HexCoordinate({q: 0, r: 1}),
            );

            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(2);
        });

        it('will heal fully damage to allies', () => {
            const healsLostHitPoints = new SquaddieActivity({
                id: "heals lost hit points",
                name: "heals lost hit points",
                traits: new TraitStatusStorage({
                    [Trait.HEALING]: true,
                    [Trait.ALWAYS_HITS]: true,
                }),
                minimumRange: 0,
                maximumRange: 9001,
                healingDescriptions: {[HealingType.LostHitPoints]: 2},
            });

            ally1DynamicSquaddie.inBattleAttributes.takeDamage(ally1DynamicSquaddie.inBattleAttributes.armyAttributes.maxHitPoints - 1, DamageType.Unknown);

            const squaddieCurrentlyInProgress = new SquaddieInstructionInProgress({
                currentSquaddieActivity: healsLostHitPoints
            });

            const results = CalculateResults(
                new BattleOrchestratorState({
                    missionMap,
                    squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                    squaddieRepo: squaddieRepository,
                }),
                player1DynamicSquaddie,
                new HexCoordinate({q: 0, r: 2}),
            );

            expect(results.resultPerTarget[ally1DynamicId].healingReceived).toBe(2);
        });
    });
});
