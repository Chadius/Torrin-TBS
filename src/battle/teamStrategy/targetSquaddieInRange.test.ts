import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {BattleSquaddieTeam, BattleSquaddieTeamHelper} from "../battleSquaddieTeam";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../squaddie/action";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {TargetSquaddieInRange} from "./targetSquaddieInRange";
import {SquaddieMovementActionDataService} from "../history/squaddieMovementAction";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {SquaddieTurnHandler} from "../../squaddie/turn";

describe('target a squaddie within reach of actions', () => {
    let squaddieRepository: ObjectRepository;
    let missionMap: MissionMap;
    let enemyBanditStatic: SquaddieTemplate;
    let enemyBanditDynamic: BattleSquaddie;
    let playerKnightStatic: SquaddieTemplate;
    let playerKnightDynamic: BattleSquaddie;
    let allyClericStatic: SquaddieTemplate;
    let allyClericDynamic: BattleSquaddie;
    let shortBowAction: SquaddieSquaddieAction;
    let enemyTeam: BattleSquaddieTeam;
    let expectedInstruction: SquaddieActionsForThisRound;
    beforeEach(() => {
        squaddieRepository = ObjectRepositoryHelper.new();

        shortBowAction = SquaddieSquaddieActionService.new({
            name: "short bow",
            id: "short_bow",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }),
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

        missionMap.addSquaddie(enemyBanditStatic.squaddieId.templateId, enemyBanditDynamic.battleSquaddieId, {
            q: 0,
            r: 0
        });

        enemyTeam = {
            id: "teamId",
            name: "team",
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: [],
            iconResourceKey: "icon_enemy_team",
        };
        BattleSquaddieTeamHelper.addBattleSquaddieIds(enemyTeam, [enemyBanditDynamic.battleSquaddieId]);

        expectedInstruction = {
            squaddieTemplateId: enemyBanditStatic.squaddieId.templateId,
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
    });

    it('will return undefined if desired squaddies are out of range', () => {
        missionMap.addSquaddie(playerKnightStatic.squaddieId.templateId, playerKnightDynamic.battleSquaddieId, {
            q: 0,
            r: 3
        });
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.PLAYER
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toBeUndefined();
    });

    it('will raise an error if there is no target squaddie or affiliation with a given id', () => {
        missionMap.addSquaddie(playerKnightStatic.squaddieId.templateId, playerKnightDynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({});
        const shouldThrowError = () => {
            strategy.DetermineNextInstruction(state, squaddieRepository);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Target Squaddie In Range strategy has no target");
    });

    it('will target squaddie by dynamic id', () => {
        missionMap.addSquaddie(playerKnightStatic.squaddieId.templateId, playerKnightDynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        missionMap.addSquaddie(allyClericStatic.squaddieId.templateId, allyClericDynamic.battleSquaddieId, {
            q: 0,
            r: 2
        });
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        });

        SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
            type: SquaddieActionType.SQUADDIE,
            targetLocation: {q: 0, r: 1},
            squaddieAction: shortBowAction,
            numberOfActionPointsSpent: 1,
        });

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will target squaddie by affiliation', () => {
        missionMap.addSquaddie(playerKnightStatic.squaddieId.templateId, playerKnightDynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        missionMap.addSquaddie(allyClericStatic.squaddieId.templateId, allyClericDynamic.battleSquaddieId, {
            q: 0,
            r: 2
        });
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.ALLY
        });

        SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
            type: SquaddieActionType.SQUADDIE,
            targetLocation: {q: 0, r: 2},
            squaddieAction: shortBowAction,
            numberOfActionPointsSpent: 1,
        });

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will pass if there are no squaddies of the correct affiliation', () => {
        missionMap.addSquaddie(playerKnightStatic.squaddieId.templateId, playerKnightDynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.ALLY
        });

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toBeUndefined();
    });

    it('will not use an action if there are not enough action points remaining', () => {
        missionMap.addSquaddie(playerKnightStatic.squaddieId.templateId, playerKnightDynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });
        missionMap.addSquaddie(allyClericStatic.squaddieId.templateId, allyClericDynamic.battleSquaddieId, {
            q: 0,
            r: 2
        });
        SquaddieTurnHandler.spendActionPoints(enemyBanditDynamic.squaddieTurn, 4 - shortBowAction.actionPointCost);

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        });

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toBeUndefined();
    });

    it('will add to existing instruction', () => {
        missionMap.addSquaddie(playerKnightStatic.squaddieId.templateId, playerKnightDynamic.battleSquaddieId, {
            q: 0,
            r: 1
        });

        const startingInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: enemyBanditStatic.squaddieId.templateId,
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        const enemyBanditMoves = SquaddieMovementActionDataService.new({
            destination: {q: 0, r: 0},
            numberOfActionPointsSpent: 1,
        });
        SquaddieActionsForThisRoundHandler.addAction(startingInstruction, {
            type: SquaddieActionType.MOVEMENT,
            destination: enemyBanditMoves.destination,
            numberOfActionPointsSpent: enemyBanditMoves.numberOfActionPointsSpent,
        });

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
            instruction: startingInstruction,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        });

        SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
            type: SquaddieActionType.MOVEMENT,
            destination: enemyBanditMoves.destination,
            numberOfActionPointsSpent: enemyBanditMoves.numberOfActionPointsSpent,
        });

        SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
            type: SquaddieActionType.SQUADDIE,
            targetLocation: {q: 0, r: 1},
            squaddieAction: shortBowAction,
            numberOfActionPointsSpent: 1,
        });

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will not change the currently acting squaddie', () => {
        const longBowAction = SquaddieSquaddieActionService.new({
            name: "long bow",
            id: "long_bow",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }),
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
        BattleSquaddieTeamHelper.addBattleSquaddieIds(enemyTeam, [enemyBanditDynamic2.battleSquaddieId]);
        missionMap.addSquaddie(enemyBanditStatic2.squaddieId.templateId, enemyBanditDynamic2.battleSquaddieId, {
            q: 0,
            r: 1
        });
        missionMap.addSquaddie(playerKnightStatic.squaddieId.templateId, playerKnightDynamic.battleSquaddieId, {
            q: 0,
            r: 2
        });

        const startingInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: enemyBanditStatic.squaddieId.templateId,
            battleSquaddieId: enemyBanditDynamic.battleSquaddieId,
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        const enemyBanditMoves = SquaddieMovementActionDataService.new({
            destination: {q: 0, r: 0},
            numberOfActionPointsSpent: 1,
        });
        SquaddieActionsForThisRoundHandler.addAction(startingInstruction, {
            type: SquaddieActionType.MOVEMENT,
            destination: enemyBanditMoves.destination,
            numberOfActionPointsSpent: enemyBanditMoves.numberOfActionPointsSpent,
        });

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: enemyTeam,
            squaddieRepository: squaddieRepository,
            instruction: startingInstruction,
        });

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        });
        SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
            type: SquaddieActionType.MOVEMENT,
            destination: enemyBanditMoves.destination,
            numberOfActionPointsSpent: enemyBanditMoves.numberOfActionPointsSpent,
        });
        SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
            type: SquaddieActionType.SQUADDIE,
            targetLocation: {q: 0, r: 2},
            squaddieAction: shortBowAction,
            numberOfActionPointsSpent: 1,
        });

        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('should pass if there are no squaddies to act', () => {
        const allyTeam: BattleSquaddieTeam = {
            id: "allyTeamId",
            affiliation: SquaddieAffiliation.ALLY,
            battleSquaddieIds: [],
            name: "Da team",
            iconResourceKey: "icon_ally_team",
        }

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        });
        expect(strategy.DetermineNextInstruction(state, squaddieRepository)).toBeUndefined();
    });
})
