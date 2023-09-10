import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieActivity} from "../../squaddie/activity";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {TargetSquaddieInRange} from "./targetSquaddieInRange";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";

describe('target a squaddie within reach of activities', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let enemyBanditStatic: BattleSquaddieStatic;
    let enemyBanditDynamic: BattleSquaddieDynamic;
    let playerKnightStatic: BattleSquaddieStatic;
    let playerKnightDynamic: BattleSquaddieDynamic;
    let allyClericStatic: BattleSquaddieStatic;
    let allyClericDynamic: BattleSquaddieDynamic;
    let shortBowActivity: SquaddieActivity;
    let enemyTeam: BattleSquaddieTeam;
    let expectedInstruction: SquaddieActivitiesForThisRound;
    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();

        shortBowActivity = new SquaddieActivity({
            name: "short bow",
            id: "short_bow",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 2,
            actionsToSpend: 2,
        });

        ({
            staticSquaddie: enemyBanditStatic,
            dynamicSquaddie: enemyBanditDynamic
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "enemy_bandit",
            dynamicId: "enemy_bandit_0",
            name: "Bandit",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            activities: [shortBowActivity],
        }));

        ({
            staticSquaddie: playerKnightStatic,
            dynamicSquaddie: playerKnightDynamic
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "player_knight",
            dynamicId: "player_knight_0",
            name: "Knight",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        }));

        ({
            staticSquaddie: allyClericStatic,
            dynamicSquaddie: allyClericDynamic
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "ally_cleric",
            dynamicId: "ally_cleric_0",
            name: "Cleric",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository,
        }));

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 1 1 "]
            })
        })

        missionMap.addSquaddie(enemyBanditStatic.staticId, enemyBanditDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 0]}));

        enemyTeam = new BattleSquaddieTeam({
            name: "team",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepo: squaddieRepository,
        });
        enemyTeam.addDynamicSquaddieIds([enemyBanditDynamic.dynamicSquaddieId]);

        expectedInstruction = new SquaddieActivitiesForThisRound({
            staticSquaddieId: enemyBanditStatic.staticId,
            dynamicSquaddieId: enemyBanditDynamic.dynamicSquaddieId,
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
    });

    it('will return undefined if desired squaddies are out of range', () => {
        missionMap.addSquaddie(playerKnightStatic.staticId, playerKnightDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 3]}));
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.PLAYER
        });
        const actualInstruction: SquaddieActivitiesForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('will raise an error if there is no target squaddie or affiliation with a given id', () => {
        missionMap.addSquaddie(playerKnightStatic.staticId, playerKnightDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({});
        const shouldThrowError = () => {
            strategy.DetermineNextInstruction(state);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Target Squaddie In Range strategy has no target");
    });

    it('will target squaddie by dynamic id', () => {
        missionMap.addSquaddie(playerKnightStatic.staticId, playerKnightDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        missionMap.addSquaddie(allyClericStatic.staticId, allyClericDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 2]}));
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredDynamicSquaddieId: playerKnightDynamic.dynamicSquaddieId,
        });

        expectedInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({coordinates: [0, 1]}),
            squaddieActivity: shortBowActivity,
        }));

        const actualInstruction: SquaddieActivitiesForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will target squaddie by affiliation', () => {
        missionMap.addSquaddie(playerKnightStatic.staticId, playerKnightDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        missionMap.addSquaddie(allyClericStatic.staticId, allyClericDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 2]}));
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.ALLY
        });

        expectedInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({coordinates: [0, 2]}),
            squaddieActivity: shortBowActivity,
        }));

        const actualInstruction: SquaddieActivitiesForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will pass if there are no squaddies of the correct affiliation', () => {
        missionMap.addSquaddie(playerKnightStatic.staticId, playerKnightDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.ALLY
        });

        const actualInstruction: SquaddieActivitiesForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('will not use an activity if there are not enough actions remaining', () => {
        missionMap.addSquaddie(playerKnightStatic.staticId, playerKnightDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        missionMap.addSquaddie(allyClericStatic.staticId, allyClericDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 2]}));
        enemyBanditDynamic.squaddieTurn.spendNumberActions(4 - shortBowActivity.actionsToSpend);

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredDynamicSquaddieId: playerKnightDynamic.dynamicSquaddieId,
        });

        const actualInstruction: SquaddieActivitiesForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('will add to existing instruction', () => {
        missionMap.addSquaddie(playerKnightStatic.staticId, playerKnightDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 1]}));

        const startingInstruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: enemyBanditStatic.staticId,
            dynamicSquaddieId: enemyBanditDynamic.dynamicSquaddieId,
            startingLocation: new HexCoordinate({coordinates: [0, 0]})
        });
        const enemyBanditMoves = new SquaddieMovementActivity({
            destination: new HexCoordinate({coordinates: [0, 0]}),
            numberOfActionsSpent: 1,
        });
        startingInstruction.addActivity(enemyBanditMoves);

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
            instruction: startingInstruction,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredDynamicSquaddieId: playerKnightDynamic.dynamicSquaddieId,
        });

        expectedInstruction.addActivity(enemyBanditMoves);
        expectedInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({coordinates: [0, 1]}),
            squaddieActivity: shortBowActivity,
        }));

        const actualInstruction: SquaddieActivitiesForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will not change the currently acting squaddie', () => {
        const longBowActivity = new SquaddieActivity({
            name: "long bow",
            id: "long_bow",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 2,
            actionsToSpend: 2,
        });

        const {
            staticSquaddie: enemyBanditStatic2,
            dynamicSquaddie: enemyBanditDynamic2
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "enemy_bandit_2",
            dynamicId: "enemy_bandit_2",
            name: "Bandit",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            activities: [longBowActivity],
        });
        enemyTeam.addDynamicSquaddieIds([enemyBanditDynamic2.dynamicSquaddieId]);
        missionMap.addSquaddie(enemyBanditStatic2.staticId, enemyBanditDynamic2.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        missionMap.addSquaddie(playerKnightStatic.staticId, playerKnightDynamic.dynamicSquaddieId, new HexCoordinate({coordinates: [0, 2]}));

        const startingInstruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: enemyBanditStatic.staticId,
            dynamicSquaddieId: enemyBanditDynamic.dynamicSquaddieId,
            startingLocation: new HexCoordinate({coordinates: [0, 0]})
        });
        const enemyBanditMoves = new SquaddieMovementActivity({
            destination: new HexCoordinate({coordinates: [0, 0]}),
            numberOfActionsSpent: 1,
        });
        startingInstruction.addActivity(enemyBanditMoves);

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
            instruction: startingInstruction,
        });

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredDynamicSquaddieId: playerKnightDynamic.dynamicSquaddieId,
        });

        expectedInstruction.addActivity(enemyBanditMoves);
        expectedInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({coordinates: [0, 2]}),
            squaddieActivity: shortBowActivity,
        }));

        const actualInstruction: SquaddieActivitiesForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('should pass if there are no squaddies to act', () => {
        const allyTeam = new BattleSquaddieTeam({
            affiliation: SquaddieAffiliation.ALLY,
            dynamicSquaddieIds: [],
            name: "Da team",
            squaddieRepo: squaddieRepository,
        })

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredDynamicSquaddieId: playerKnightDynamic.dynamicSquaddieId,
        });
        expect(strategy.DetermineNextInstruction(state)).toBeUndefined();
    });
})
