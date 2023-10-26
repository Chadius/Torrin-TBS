import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {MoveCloserToSquaddie} from "./moveCloserToSquaddie";
import {BattleSquaddie} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SquaddieActionType} from "../history/anySquaddieAction";

describe('move towards closest squaddie in range', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let targetSquaddieStatic: SquaddieTemplate;
    let targetSquaddieDynamic: BattleSquaddie;
    let ignoredSquaddieStatic: SquaddieTemplate;
    let ignoredSquaddieDynamic: BattleSquaddie;
    let searchingSquaddieStatic: SquaddieTemplate;
    let searchingSquaddieDynamic: BattleSquaddie;
    let allyTeam: BattleSquaddieTeam;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();

        ({
            squaddieTemplate: targetSquaddieStatic,
            battleSquaddie: targetSquaddieDynamic
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
            squaddieTemplate: searchingSquaddieStatic,
            battleSquaddie: searchingSquaddieDynamic
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "searching_squaddie",
            battleId: "searching_squaddie_0",
            name: "Searching",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository,
            attributes: new ArmyAttributes({
                movement: new SquaddieMovement({
                    movementPerAction: 1,
                    traits: new TraitStatusStorage({}).filterCategory(TraitCategory.MOVEMENT)
                })
            })
        }));

        allyTeam = new BattleSquaddieTeam({
            name: "team",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepo: squaddieRepository,
        });
        allyTeam.addBattleSquaddieIds(["searching_squaddie_0"]);
    });

    it('will move towards squaddie with given dynamic Id', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });
        missionMap.addSquaddie(targetSquaddieStatic.squaddieId.templateId, "target_squaddie_0", new HexCoordinate({
            q: 0,
            r: 0
        }));
        missionMap.addSquaddie(ignoredSquaddieStatic.squaddieId.templateId, "ignored_squaddie_0", new HexCoordinate({
            q: 0,
            r: 3
        }));
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId.templateId, "searching_squaddie_0", new HexCoordinate({
            q: 0,
            r: 2
        }));

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: searchingSquaddieStatic.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            startingLocation: new HexCoordinate({q: 0, r: 2}),
        });
        expectedInstruction.addAction({
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: new HexCoordinate({q: 0, r: 1}),
                numberOfActionPointsSpent: 1,
            }
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);

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
            attributes: new ArmyAttributes({
                movement: new SquaddieMovement({
                    movementPerAction: 10,
                    traits: new TraitStatusStorage({}).filterCategory(TraitCategory.MOVEMENT)
                })
            })
        });
        allyTeam.addBattleSquaddieIds([searchingSquaddieDynamic2.battleSquaddieId]);

        missionMap.addSquaddie(targetSquaddieStatic.squaddieId.templateId, "target_squaddie_0", new HexCoordinate({
            q: 0,
            r: 0
        }));
        missionMap.addSquaddie(searchingSquaddieStatic2.squaddieId.templateId, searchingSquaddieDynamic2.battleSquaddieId, new HexCoordinate({
            q: 0,
            r: 3
        }));
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId.templateId, "searching_squaddie_0", new HexCoordinate({
            q: 0,
            r: 2
        }));

        const startingInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: searchingSquaddieStatic2.templateId,
            battleSquaddieId: searchingSquaddieDynamic2.battleSquaddieId,
            startingLocation: new HexCoordinate({coordinates: [0, 5]})
        });
        startingInstruction.addAction({
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: {q: 0, r: 3},
                numberOfActionPointsSpent: 1,
            }
        });

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
            instruction: startingInstruction,
        });

        const expectedInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: searchingSquaddieStatic2.squaddieId.templateId,
            battleSquaddieId: searchingSquaddieDynamic2.battleSquaddieId,
            startingLocation: new HexCoordinate({q: 0, r: 3}),
        });
        expectedInstruction.addAction({
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: new HexCoordinate({q: 0, r: 1}),
                numberOfActionPointsSpent: 1,
            }
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);

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
            strategy.DetermineNextInstruction(state);
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

        missionMap.addSquaddie(targetSquaddieStatic.squaddieId.templateId, "target_squaddie_0", new HexCoordinate({
            q: 0,
            r: 0
        }));
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId.templateId, "searching_squaddie_0", new HexCoordinate({
            q: 0,
            r: 1
        }));

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0"
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('will give no instruction if no targets are in range', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });

        missionMap.addSquaddie(targetSquaddieStatic.squaddieId.templateId, "target_squaddie_0", new HexCoordinate({
            q: 0,
            r: 0
        }));
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId.templateId, "searching_squaddie_0", new HexCoordinate({
            q: 0,
            r: 8
        }));

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: searchingSquaddieStatic.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            startingLocation: new HexCoordinate({q: 0, r: 8}),
        });
        expectedInstruction.endTurn();

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0"
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('will move towards closest squaddie of a given affiliation', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });

        missionMap.addSquaddie(targetSquaddieStatic.squaddieId.templateId, "target_squaddie_0", new HexCoordinate({
            q: 0,
            r: 0
        }));
        missionMap.addSquaddie(ignoredSquaddieStatic.squaddieId.templateId, "ignored_squaddie_0", new HexCoordinate({
            q: 0,
            r: 8
        }));
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId.templateId, "searching_squaddie_0", new HexCoordinate({
            q: 0,
            r: 2
        }));

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddieTemplateId: searchingSquaddieStatic.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            startingLocation: new HexCoordinate({q: 0, r: 2}),
        });

        expectedInstruction.addAction({
            type: SquaddieActionType.MOVEMENT,
            data: {
                destination: new HexCoordinate({q: 0, r: 1}),
                numberOfActionPointsSpent: 1,
            }
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredAffiliation: SquaddieAffiliation.PLAYER
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });
});
