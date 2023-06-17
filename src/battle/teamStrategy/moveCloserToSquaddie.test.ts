import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {addSquaddieToSquaddieRepository} from "../../utils/test/squaddieRepository";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {MoveCloserToSquaddie} from "./moveCloserToSquaddie";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";

describe('move towards closest squaddie in range', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;
    let targetSquaddieStatic: BattleSquaddieStatic;
    let targetSquaddieDynamic: BattleSquaddieDynamic;
    let ignoredSquaddieStatic: BattleSquaddieStatic;
    let ignoredSquaddieDynamic: BattleSquaddieDynamic;
    let searchingSquaddieStatic: BattleSquaddieStatic;
    let searchingSquaddieDynamic: BattleSquaddieDynamic;
    let allyTeam: BattleSquaddieTeam;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();

        ({
            staticSquaddie: targetSquaddieStatic,
            dynamicSquaddie: targetSquaddieDynamic
        } = addSquaddieToSquaddieRepository(
            "target_squaddie",
            "target_squaddie_0",
            "Target",
            SquaddieAffiliation.PLAYER,
            squaddieRepository,
        ));

        ({
            staticSquaddie: ignoredSquaddieStatic,
            dynamicSquaddie: ignoredSquaddieDynamic
        } = addSquaddieToSquaddieRepository(
            "ignored_squaddie",
            "ignored_squaddie_0",
            "Ignored",
            SquaddieAffiliation.PLAYER,
            squaddieRepository,
        ));

        ({
            staticSquaddie: searchingSquaddieStatic,
            dynamicSquaddie: searchingSquaddieDynamic
        } = addSquaddieToSquaddieRepository(
            "searching_squaddie",
            "searching_squaddie_0",
            "Searching",
            SquaddieAffiliation.ALLY,
            squaddieRepository,
            new SquaddieMovement({
                movementPerAction: 1,
                traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
            })
        ));

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

        const expectedInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: searchingSquaddieStatic.squaddieId.staticId,
            dynamicSquaddieId: "searching_squaddie_0",
            startingLocation: new HexCoordinate({q: 0, r: 2}),
        });
        expectedInstruction.addMovement(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionsSpent: 1,
        }))

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredDynamicSquaddieId: "target_squaddie_0",
        });
        const actualInstruction: SquaddieInstruction = strategy.DetermineNextInstruction(state);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.getInstruction()).toStrictEqual(expectedInstruction);
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
        const actualInstruction: SquaddieInstruction = strategy.DetermineNextInstruction(state);
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

        const expectedInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: searchingSquaddieStatic.squaddieId.staticId,
            dynamicSquaddieId: "searching_squaddie_0",
            startingLocation: new HexCoordinate({q: 0, r: 8}),
        });
        expectedInstruction.endTurn();

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredDynamicSquaddieId: "target_squaddie_0"
        });
        const actualInstruction: SquaddieInstruction = strategy.DetermineNextInstruction(state);
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

        const expectedInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: searchingSquaddieStatic.squaddieId.staticId,
            dynamicSquaddieId: "searching_squaddie_0",
            startingLocation: new HexCoordinate({q: 0, r: 2}),
        });
        expectedInstruction.addMovement(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionsSpent: 1,
        }))

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredAffiliation: SquaddieAffiliation.PLAYER
        });
        const actualInstruction: SquaddieInstruction = strategy.DetermineNextInstruction(state);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.getInstruction()).toStrictEqual(expectedInstruction);
    });
});
