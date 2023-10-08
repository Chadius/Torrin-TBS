import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {SquaddieMovementAction} from "../history/squaddieMovementAction";
import {MoveCloserToSquaddie} from "./moveCloserToSquaddie";
import {BattleSquaddie} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

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
            squaddietemplate: targetSquaddieStatic,
            dynamicSquaddie: targetSquaddieDynamic
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "target_squaddie",
            dynamicId: "target_squaddie_0",
            name: "Target",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        }));

        ({
            squaddietemplate: ignoredSquaddieStatic,
            dynamicSquaddie: ignoredSquaddieDynamic
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "ignored_squaddie",
            dynamicId: "ignored_squaddie_0",
            name: "Ignored",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        }));

        ({
            squaddietemplate: searchingSquaddieStatic,
            dynamicSquaddie: searchingSquaddieDynamic
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "searching_squaddie",
            dynamicId: "searching_squaddie_0",
            name: "Searching",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository,
            attributes: new ArmyAttributes({
                movement: new SquaddieMovement({
                    movementPerAction: 1,
                    traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
                })
            })
        }));

        allyTeam = new BattleSquaddieTeam({
            name: "team",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepo: squaddieRepository,
        });
        allyTeam.addDynamicSquaddieIds(["searching_squaddie_0"]);
    });

    it('will move towards squaddie with given dynamic Id', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });
        missionMap.addSquaddie(targetSquaddieStatic.squaddieId.staticId, "target_squaddie_0", new HexCoordinate({
            q: 0,
            r: 0
        }));
        missionMap.addSquaddie(ignoredSquaddieStatic.squaddieId.staticId, "ignored_squaddie_0", new HexCoordinate({
            q: 0,
            r: 3
        }));
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId.staticId, "searching_squaddie_0", new HexCoordinate({
            q: 0,
            r: 2
        }));

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddietemplateId: searchingSquaddieStatic.squaddieId.staticId,
            dynamicSquaddieId: "searching_squaddie_0",
            startingLocation: new HexCoordinate({q: 0, r: 2}),
        });
        expectedInstruction.addAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionPointsSpent: 1,
        }))

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredDynamicSquaddieId: "target_squaddie_0",
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
            squaddietemplate: searchingSquaddieStatic2,
            dynamicSquaddie: searchingSquaddieDynamic2
        } = CreateNewSquaddieAndAddToRepository({
            staticId: "searching_squaddie_2",
            dynamicId: "searching_squaddie_2",
            name: "Searching",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepository,
            attributes: new ArmyAttributes({
                movement: new SquaddieMovement({
                    movementPerAction: 10,
                    traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
                })
            })
        });
        allyTeam.addDynamicSquaddieIds([searchingSquaddieDynamic2.dynamicSquaddieId]);

        missionMap.addSquaddie(targetSquaddieStatic.squaddieId.staticId, "target_squaddie_0", new HexCoordinate({
            q: 0,
            r: 0
        }));
        missionMap.addSquaddie(searchingSquaddieStatic2.squaddieId.staticId, searchingSquaddieDynamic2.dynamicSquaddieId, new HexCoordinate({
            q: 0,
            r: 3
        }));
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId.staticId, "searching_squaddie_0", new HexCoordinate({
            q: 0,
            r: 2
        }));

        const startingInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddietemplateId: searchingSquaddieStatic2.staticId,
            dynamicSquaddieId: searchingSquaddieDynamic2.dynamicSquaddieId,
            startingLocation: new HexCoordinate({coordinates: [0, 5]})
        });
        const searchingSquaddie2Moves = new SquaddieMovementAction({
            destination: new HexCoordinate({coordinates: [0, 3]}),
            numberOfActionPointsSpent: 1,
        });
        startingInstruction.addAction(searchingSquaddie2Moves);

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
            instruction: startingInstruction,
        });

        const expectedInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddietemplateId: searchingSquaddieStatic2.squaddieId.staticId,
            dynamicSquaddieId: searchingSquaddieDynamic2.dynamicSquaddieId,
            startingLocation: new HexCoordinate({q: 0, r: 3}),
        });
        expectedInstruction.addAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionPointsSpent: 1,
        }))

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredDynamicSquaddieId: "target_squaddie_0",
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

        missionMap.addSquaddie(targetSquaddieStatic.squaddieId.staticId, "target_squaddie_0", new HexCoordinate({
            q: 0,
            r: 0
        }));
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId.staticId, "searching_squaddie_0", new HexCoordinate({
            q: 0,
            r: 1
        }));

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredDynamicSquaddieId: "target_squaddie_0"
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('will give no instruction if no targets are in range', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });

        missionMap.addSquaddie(targetSquaddieStatic.squaddieId.staticId, "target_squaddie_0", new HexCoordinate({
            q: 0,
            r: 0
        }));
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId.staticId, "searching_squaddie_0", new HexCoordinate({
            q: 0,
            r: 8
        }));

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddietemplateId: searchingSquaddieStatic.squaddieId.staticId,
            dynamicSquaddieId: "searching_squaddie_0",
            startingLocation: new HexCoordinate({q: 0, r: 8}),
        });
        expectedInstruction.endTurn();

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredDynamicSquaddieId: "target_squaddie_0"
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('will move towards closest squaddie of a given affiliation', () => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });

        missionMap.addSquaddie(targetSquaddieStatic.squaddieId.staticId, "target_squaddie_0", new HexCoordinate({
            q: 0,
            r: 0
        }));
        missionMap.addSquaddie(ignoredSquaddieStatic.squaddieId.staticId, "ignored_squaddie_0", new HexCoordinate({
            q: 0,
            r: 8
        }));
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId.staticId, "searching_squaddie_0", new HexCoordinate({
            q: 0,
            r: 2
        }));

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: allyTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddietemplateId: searchingSquaddieStatic.squaddieId.staticId,
            dynamicSquaddieId: "searching_squaddie_0",
            startingLocation: new HexCoordinate({q: 0, r: 2}),
        });
        expectedInstruction.addAction(new SquaddieMovementAction({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionPointsSpent: 1,
        }))

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredAffiliation: SquaddieAffiliation.PLAYER
        });
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });
});
