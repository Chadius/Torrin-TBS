import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam, BattleSquaddieTeamHelper} from "../battleSquaddieTeam";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {MoveCloserToSquaddie} from "./moveCloserToSquaddie";
import {BattleSquaddie} from "../battleSquaddie";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {DefaultArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {DamageType, SquaddieService} from "../../squaddie/squaddieService";

describe('move towards closest squaddie in range', () => {
    let squaddieRepository: ObjectRepository;
    let missionMap: MissionMap;
    let targetSquaddieTemplate: SquaddieTemplate;
    let targetBattleSquaddie: BattleSquaddie;
    let ignoredSquaddieStatic: SquaddieTemplate;
    let ignoredSquaddieDynamic: BattleSquaddie;
    let searchingSquaddieTemplate: SquaddieTemplate;
    let target: BattleSquaddie;
    let allyTeam: BattleSquaddieTeam;

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryHelper.new();

        ({
            squaddieTemplate: targetSquaddieTemplate,
            battleSquaddie: targetBattleSquaddie
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "target_squaddie",
            battleId: "target_squaddie_0",
            name: "Target",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        }));

        ({
            squaddieTemplate: ignoredSquaddieStatic,
            battleSquaddie: ignoredSquaddieDynamic
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "ignored_squaddie",
            battleId: "ignored_squaddie_0",
            name: "Ignored",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        }));

        ({
                squaddieTemplate: searchingSquaddieTemplate,
                battleSquaddie: target
            } = CreateNewSquaddieAndAddToRepository({
                templateId: "searching_squaddie",
                battleId: "searching_squaddie_0",
                name: "Searching",
                affiliation: SquaddieAffiliation.ALLY,
                squaddieRepository,
                attributes: {
                    ...DefaultArmyAttributes(),
                    ...{
                        movement: CreateNewSquaddieMovementWithTraits({
                            movementPerAction: 1,
                            traits: TraitStatusStorageHelper.newUsingTraitValues(),
                        })
                    }
                }
            })
        );

        allyTeam = {
            id: "allyTeamId",
            name: "team",
            affiliation: SquaddieAffiliation.ALLY,
            battleSquaddieIds: [],
        };
        BattleSquaddieTeamHelper.addBattleSquaddieIds(allyTeam, ["searching_squaddie_0"]);
    });

    it('will move towards squaddie with given dynamic Id', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });
        missionMap.addSquaddie(targetSquaddieTemplate.squaddieId.templateId, "target_squaddie_0", {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(ignoredSquaddieStatic.squaddieId.templateId, "ignored_squaddie_0", {
            q: 0,
            r: 3
        });
        missionMap.addSquaddie(searchingSquaddieTemplate.squaddieId.templateId, "searching_squaddie_0", {
            q: 0,
            r: 2
        });

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            startingLocation: {q: 0, r: 2},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
            type: SquaddieActionType.MOVEMENT,
            destination: {q: 0, r: 1},
            numberOfActionPointsSpent: 1,
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will not change the currently acting squaddie', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });

        const {
            squaddieTemplate: searchingSquaddieStatic2,
            battleSquaddie: searchingSquaddieDynamic2
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "searching_squaddie_2",
            battleId: "searching_squaddie_2",
            name: "Searching",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository,
            attributes: {
                ...DefaultArmyAttributes(),
                ...{
                    movement: CreateNewSquaddieMovementWithTraits({
                        movementPerAction: 10,
                        traits: TraitStatusStorageHelper.newUsingTraitValues(),
                    })
                }
            }
        });
        BattleSquaddieTeamHelper.addBattleSquaddieIds(allyTeam, [searchingSquaddieDynamic2.battleSquaddieId]);

        missionMap.addSquaddie(targetSquaddieTemplate.squaddieId.templateId, "target_squaddie_0", {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(searchingSquaddieStatic2.squaddieId.templateId, searchingSquaddieDynamic2.battleSquaddieId, {
            q: 0,
            r: 3
        });
        missionMap.addSquaddie(searchingSquaddieTemplate.squaddieId.templateId, "searching_squaddie_0", {
            q: 0,
            r: 2
        });

        const startingInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: searchingSquaddieStatic2.squaddieId.templateId,
            battleSquaddieId: searchingSquaddieDynamic2.battleSquaddieId,
            startingLocation: {q: 0, r: 5},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.addAction(startingInstruction, {
            type: SquaddieActionType.MOVEMENT,
            destination: {q: 0, r: 3},
            numberOfActionPointsSpent: 1,
        });

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
            instruction: startingInstruction,
        });

        const expectedInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: searchingSquaddieStatic2.squaddieId.templateId,
            battleSquaddieId: searchingSquaddieDynamic2.battleSquaddieId,
            startingLocation: {q: 0, r: 3},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
            type: SquaddieActionType.MOVEMENT,
            destination: {q: 0, r: 1},
            numberOfActionPointsSpent: 1,
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will raise an error if there is no target', () => {
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });
        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({});

        const shouldThrowError = () => {
            strategy.DetermineNextInstruction(state, squaddieRepository);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Move Closer to Squaddie strategy has no target");
    });

    it('will give no instruction if it is already next to the target', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 1 1 1 1 1 1 ",
                    " 1 1 1 1 1 1 1 1 1 "
                ]
            })
        });

        missionMap.addSquaddie(targetSquaddieTemplate.squaddieId.templateId, "target_squaddie_0", {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(searchingSquaddieTemplate.squaddieId.templateId, "searching_squaddie_0", {
            q: 0,
            r: 1
        });

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0"
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toBeUndefined();
    });

    it('will give no instruction if no targets are in range', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });

        missionMap.addSquaddie(targetSquaddieTemplate.squaddieId.templateId, "target_squaddie_0", {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(searchingSquaddieTemplate.squaddieId.templateId, "searching_squaddie_0", {
            q: 0,
            r: 8
        });

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            startingLocation: {q: 0, r: 8},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.endTurn(expectedInstruction);

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0"
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toBeUndefined();
    });

    it('will move towards closest squaddie of a given affiliation', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });

        missionMap.addSquaddie(targetSquaddieTemplate.squaddieId.templateId, "target_squaddie_0", {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(ignoredSquaddieStatic.squaddieId.templateId, "ignored_squaddie_0", {
            q: 0,
            r: 8
        });
        missionMap.addSquaddie(searchingSquaddieTemplate.squaddieId.templateId, "searching_squaddie_0", {
            q: 0,
            r: 2
        });

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            startingLocation: {q: 0, r: 2},
            actions: [],
        };

        SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
            type: SquaddieActionType.MOVEMENT,
            destination: {q: 0, r: 1},
            numberOfActionPointsSpent: 1,
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredAffiliation: SquaddieAffiliation.PLAYER
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will find an alternate destination if a squaddie is blocking its first space', () => {
        const {
            squaddieTemplate: playerSquaddieStatic,
            battleSquaddie: playerSquaddieDynamic
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "player_squaddie",
            battleId: "player_squaddie_1",
            name: "Player",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
            attributes: {
                ...DefaultArmyAttributes(),
                ...{
                    movement: CreateNewSquaddieMovementWithTraits({
                        movementPerAction: 1,
                        traits: TraitStatusStorageHelper.newUsingTraitValues(),
                    })
                }
            }
        });

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 ",
                    " 1 1 1 "
                ]
            })
        });

        missionMap.addSquaddie(targetSquaddieTemplate.squaddieId.templateId, "target_squaddie_0", {
            q: 0,
            r: 2
        });
        missionMap.addSquaddie(ignoredSquaddieStatic.squaddieId.templateId, "player_squaddie_1", {
            q: 0,
            r: 1
        });
        missionMap.addSquaddie(searchingSquaddieTemplate.squaddieId.templateId, "searching_squaddie_0", {
            q: 0,
            r: 0
        });

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.addAction(expectedInstruction, {
            type: SquaddieActionType.MOVEMENT,
            destination: {q: 1, r: 1},
            numberOfActionPointsSpent: 2,
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('will not follow dead squaddies', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });

        missionMap.addSquaddie(targetSquaddieTemplate.squaddieId.templateId, "target_squaddie_0", {
            q: 0,
            r: 0
        });
        missionMap.addSquaddie(searchingSquaddieTemplate.squaddieId.templateId, "searching_squaddie_0", {
            q: 0,
            r: 3
        });
        SquaddieService.dealDamageToTheSquaddie({
            squaddieTemplate: targetSquaddieTemplate,
            battleSquaddie: targetBattleSquaddie,
            damage: 9001,
            damageType: DamageType.UNKNOWN
        })

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredAffiliation: SquaddieAffiliation.PLAYER
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);

        expect(actualInstruction).toBeUndefined();
        expect(state.instruction).toBeUndefined();
    });
});
