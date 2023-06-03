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

describe('move towards closest squaddie in range', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let missionMap: MissionMap;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
    });

    it('will move towards squaddie with given dynamic Id', () => {
        const {
            staticSquaddie: targetSquaddieStatic,
            dynamicSquaddie: targetSquaddieDynamic
        } = addSquaddieToSquaddieRepository(
            "target_squaddie",
            "target_squaddie_0",
            "Target",
            SquaddieAffiliation.PLAYER,
            {q: 0, r: 0},
            squaddieRepository,
        );

        const {
            staticSquaddie: ignoredSquaddieStatic,
            dynamicSquaddie: ignoredSquaddieDynamic
        } = addSquaddieToSquaddieRepository(
            "ignored_squaddie",
            "ignored_squaddie_0",
            "Ignored",
            SquaddieAffiliation.PLAYER,
            {q: 0, r: 3},
            squaddieRepository,
        );

        const {
            staticSquaddie: searchingSquaddieStatic,
            dynamicSquaddie: searchingSquaddieDynamic
        } = addSquaddieToSquaddieRepository(
            "searching_squaddie",
            "searching_squaddie_0",
            "Searching",
            SquaddieAffiliation.ALLY,
            {q: 0, r: 2},
            squaddieRepository,
        );
        searchingSquaddieStatic.movement = new SquaddieMovement({
            movementPerAction: 1,
            traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT)
        });

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 1 1 1 1 1 1 1 1 "]})
        });
        missionMap.addSquaddie(targetSquaddieStatic.squaddieId, targetSquaddieDynamic.mapLocation);
        missionMap.addSquaddie(ignoredSquaddieStatic.squaddieId, ignoredSquaddieDynamic.mapLocation);
        missionMap.addSquaddie(searchingSquaddieStatic.squaddieId, searchingSquaddieDynamic.mapLocation);

        const squaddieTeam = new BattleSquaddieTeam({
            name: "team",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepo: squaddieRepository,
        });
        squaddieTeam.addDynamicSquaddieIds(["searching_squaddie_0"]);

        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: squaddieTeam,
            squaddieRepository: squaddieRepository,
        });

        const expectedInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: searchingSquaddieStatic.squaddieId.id,
            dynamicSquaddieId: "searching_squaddie_0",
            startingLocation: {q: 0, r: 2},
        });
        expectedInstruction.addMovement(new SquaddieMovementActivity({
            destination: {q: 0, r: 1},
            numberOfActionsSpent: 1,
        }))

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredDynamicSquaddieId: "target_squaddie_0"
        });
        const actualInstruction: SquaddieInstruction = strategy.DetermineNextInstruction(state);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.getInstruction()).toStrictEqual(expectedInstruction);
    });

    // it('will raise an error if there is no target', () => {});
    // it('will end its turn if no targets are in range', () => {});
    // it('will move towards closest squaddie of a given affiliation' () => {});
});
