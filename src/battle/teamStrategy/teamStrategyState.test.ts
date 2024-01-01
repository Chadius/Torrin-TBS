import {TeamStrategyState} from "./teamStrategyState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {ObjectRepositoryHelper} from "../objectRepository";

describe('Team Strategy State', () => {
    const createDummyState = (instruction?: SquaddieActionsForThisRound): TeamStrategyState => {
        return new TeamStrategyState({
            squaddieRepository: ObjectRepositoryHelper.new(),
            missionMap: new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "]
                })
            }),
            team: {
                id: "playerTeamId",
                name: "awesome test team",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: [],
                iconResourceKey: ","
            },
            instruction,
        });
    }

    it('can reset state to clear the instruction', () => {
        const newInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };

        const state: TeamStrategyState = createDummyState(newInstruction);
        expect(state.instruction).toStrictEqual(newInstruction);

        state.reset();
        expect(state.instruction).toBeUndefined();
    });

    it('can set the instruction afterward', () => {
        const state: TeamStrategyState = createDummyState();
        expect(state.instruction).toBeUndefined();

        const newInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        state.setInstruction(newInstruction);

        expect(state.instruction).toStrictEqual(newInstruction);

    });
});
