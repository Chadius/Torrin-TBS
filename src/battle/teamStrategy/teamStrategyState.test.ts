import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";

describe('Team Strategy State', () => {
    const createDummyState = (instruction?: SquaddieInstruction): TeamStrategyState => {
        return new TeamStrategyState({
            squaddieRepository: new BattleSquaddieRepository(),
            missionMap: new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                })
            }),
            team: new BattleSquaddieTeam({
                name: "awesome test team",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepo: new BattleSquaddieRepository(),
            }),
            instruction,
        });
    }

    it('can reset state to clear the instruction', () => {
        const newInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });

        const state: TeamStrategyState = createDummyState(newInstruction);
        expect(state.instruction).toStrictEqual(newInstruction);

        state.reset();
        expect(state.instruction).toBeUndefined();
    });

    it('can set the instruction afterward', () => {
        const state: TeamStrategyState = createDummyState();
        expect(state.instruction).toBeUndefined();

        const newInstruction = new SquaddieInstruction({
            staticSquaddieId: "new static squaddie",
            dynamicSquaddieId: "new dynamic squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        state.setInstruction(newInstruction);

        expect(state.instruction).toStrictEqual(newInstruction);

    });
});
