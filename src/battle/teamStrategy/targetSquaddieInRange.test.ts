import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieAction} from "../../squaddie/action";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {TargetSquaddieInRange} from "./targetSquaddieInRange";
import {SquaddieSquaddieAction} from "../history/squaddieSquaddieAction";
import {SquaddieMovementAction} from "../history/squaddieMovementAction";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

describe('target a squaddie within reach of actions', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let enemyBanditStatic: SquaddieTemplate;
    let enemyBanditDynamic: BattleSquaddie;
    let playerKnightStatic: SquaddieTemplate;
    let playerKnightDynamic: BattleSquaddie;
    let allyClericStatic: SquaddieTemplate;
    let allyClericDynamic: BattleSquaddie;
    let shortBowAction: SquaddieAction;
    let enemyTeam: BattleSquaddieTeam;
    let expectedInstruction: SquaddieActionsForThisRound;
    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();

        shortBowAction = new SquaddieAction({
            name: "short bow",
            id: "short_bow",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 2,
            actionPointCost: 2,
        });

        ({
            squaddieTemplate: enemyBanditStatic,
            battleSquaddie: enemyBanditDynamic
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "enemy_bandit",
            battleId: "enemy_bandit_0",
            name: "Bandit",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            actions: [shortBowAction],
        }));

        ({
            squaddieTemplate: playerKnightStatic,
            battleSquaddie: playerKnightDynamic
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "player_knight",
            battleId: "player_knight_0",
            name: "Knight",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        }));

        ({
            squaddieTemplate: allyClericStatic,
            battleSquaddie: allyClericDynamic
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "ally_cleric",
            battleId: "ally_cleric_0",
            name: "Cleric",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository,
        }));

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 1 1 "]
            })
        })

        missionMap.addSquaddie(enemyBanditStatic.templateId, enemyBanditDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 0]}));

        enemyTeam = new BattleSquaddieTeam({
            name: "team",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepo: squaddieRepository,
        });
        enemyTeam.addBattleSquaddieIds([enemyBanditDynamic.battleSquaddieId]);

        expectedInstruction = new SquaddieActionsForThisRound({
            squaddieTemplateId: enemyBanditStatic.templateId,
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
    });

    it('will return undefined if desired squaddies are out of range', () => {
        missionMap.addSquaddie(playerKnightStatic.templateId, playerKnightDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 3]}));
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.PLAYER
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('will raise an error if there is no target squaddie or affiliation with a given id', () => {
        missionMap.addSquaddie(playerKnightStatic.templateId, playerKnightDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
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
        missionMap.addSquaddie(playerKnightStatic.templateId, playerKnightDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        missionMap.addSquaddie(allyClericStatic.templateId, allyClericDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 2]}));
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        });

        expectedInstruction.addAction(new SquaddieSquaddieAction({
            targetLocation: new HexCoordinate({coordinates: [0, 1]}),
            squaddieAction: shortBowAction,
        }));

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will target squaddie by affiliation', () => {
        missionMap.addSquaddie(playerKnightStatic.templateId, playerKnightDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        missionMap.addSquaddie(allyClericStatic.templateId, allyClericDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 2]}));
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.ALLY
        });

        expectedInstruction.addAction(new SquaddieSquaddieAction({
            targetLocation: new HexCoordinate({coordinates: [0, 2]}),
            squaddieAction: shortBowAction,
        }));

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will pass if there are no squaddies of the correct affiliation', () => {
        missionMap.addSquaddie(playerKnightStatic.templateId, playerKnightDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.ALLY
        });

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('will not use an action if there are not enough action points remaining', () => {
        missionMap.addSquaddie(playerKnightStatic.templateId, playerKnightDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        missionMap.addSquaddie(allyClericStatic.templateId, allyClericDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 2]}));
        enemyBanditDynamic.squaddieTurn.spendActionPoints(4 - shortBowAction.actionPointCost);

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        });

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('will add to existing instruction', () => {
        missionMap.addSquaddie(playerKnightStatic.templateId, playerKnightDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 1]}));

        const startingInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: enemyBanditStatic.templateId,
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            startingLocation: new HexCoordinate({coordinates: [0, 0]})
        });
        const enemyBanditMoves = new SquaddieMovementAction({
            destination: new HexCoordinate({coordinates: [0, 0]}),
            numberOfActionPointsSpent: 1,
        });
        startingInstruction.addAction(enemyBanditMoves);

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
            instruction: startingInstruction,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        });

        expectedInstruction.addAction(enemyBanditMoves);
        expectedInstruction.addAction(new SquaddieSquaddieAction({
            targetLocation: new HexCoordinate({coordinates: [0, 1]}),
            squaddieAction: shortBowAction,
        }));

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will not change the currently acting squaddie', () => {
        const longBowAction = new SquaddieAction({
            name: "long bow",
            id: "long_bow",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 2,
            actionPointCost: 2,
        });

        const {
            squaddieTemplate: enemyBanditStatic2,
            battleSquaddie: enemyBanditDynamic2
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "enemy_bandit_2",
            battleId: "enemy_bandit_2",
            name: "Bandit",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepository,
            actions: [longBowAction],
        });
        enemyTeam.addBattleSquaddieIds([enemyBanditDynamic2.battleSquaddieId]);
        missionMap.addSquaddie(enemyBanditStatic2.templateId, enemyBanditDynamic2.battleSquaddieId, new HexCoordinate({coordinates: [0, 1]}));
        missionMap.addSquaddie(playerKnightStatic.templateId, playerKnightDynamic.battleSquaddieId, new HexCoordinate({coordinates: [0, 2]}));

        const startingInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: enemyBanditStatic.templateId,
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            startingLocation: new HexCoordinate({coordinates: [0, 0]})
        });
        const enemyBanditMoves = new SquaddieMovementAction({
            destination: new HexCoordinate({coordinates: [0, 0]}),
            numberOfActionPointsSpent: 1,
        });
        startingInstruction.addAction(enemyBanditMoves);

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
            instruction: startingInstruction,
        });

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        });

        expectedInstruction.addAction(enemyBanditMoves);
        expectedInstruction.addAction(new SquaddieSquaddieAction({
            targetLocation: new HexCoordinate({coordinates: [0, 2]}),
            squaddieAction: shortBowAction,
        }));

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('should pass if there are no squaddies to act', () => {
        const allyTeam = new BattleSquaddieTeam({
            affiliation: SquaddieAffiliation.ALLY,
            battleSquaddieIds: [],
            name: "Da team",
            squaddieRepo: squaddieRepository,
        })

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        });
        expect(strategy.DetermineNextInstruction(state)).toBeUndefined();
    });
})
