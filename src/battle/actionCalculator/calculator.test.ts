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
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {CalculateResults} from "./calculator";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {ArmyAttributes} from "../../squaddie/armyAttributes";

describe('calculator', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let player1DynamicId = "player 1";
    let player1StaticId = "player 1";
    let player1BattleSquaddie: BattleSquaddie;
    let enemy1DynamicId = "enemy 1";
    let enemy1StaticId = "enemy 1";
    let ally1BattleSquaddie: BattleSquaddie;
    let ally1DynamicId = "ally 1";
    let ally1StaticId = "ally 1";

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
                })
        );

        CreateNewSquaddieAndAddToRepository({
            affiliation: SquaddieAffiliation.ENEMY,
            battleId: enemy1DynamicId,
            templateId: enemy1StaticId,
            name: "enemy",
            squaddieRepository,
            attributes: new ArmyAttributes({
                maxHitPoints: 5,
            })
        });

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
        beforeEach(() => {
            missionMap.addSquaddie(player1StaticId, player1DynamicId, new HexCoordinate({q: 0, r: 0}));
            missionMap.addSquaddie(enemy1StaticId, enemy1DynamicId, new HexCoordinate({q: 0, r: 1}));
            missionMap.addSquaddie(ally1StaticId, ally1DynamicId, new HexCoordinate({q: 0, r: 2}));
        });

        it('will deal full damage to unarmored foes', () => {
            const actionDealsBodyDamage = new SquaddieAction({
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
                currentSquaddieAction: actionDealsBodyDamage
            });

            const results = CalculateResults(
                new BattleOrchestratorState({
                    missionMap,
                    squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                    squaddieRepository: squaddieRepository,
                }),
                player1BattleSquaddie,
                new HexCoordinate({q: 0, r: 1}),
            );

            expect(results.resultPerTarget[enemy1DynamicId].damageTaken).toBe(2);
        });

        it('will heal fully damage to allies', () => {
            const healsLostHitPoints = new SquaddieAction({
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

            ally1BattleSquaddie.inBattleAttributes.takeDamage(ally1BattleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints - 1, DamageType.Unknown);

            const squaddieCurrentlyInProgress = new SquaddieInstructionInProgress({
                currentSquaddieAction: healsLostHitPoints
            });

            const results = CalculateResults(
                new BattleOrchestratorState({
                    missionMap,
                    squaddieCurrentlyActing: squaddieCurrentlyInProgress,
                    squaddieRepository: squaddieRepository,
                }),
                player1BattleSquaddie,
                new HexCoordinate({q: 0, r: 2}),
            );

            expect(results.resultPerTarget[ally1DynamicId].healingReceived).toBe(2);
        });
    });
});