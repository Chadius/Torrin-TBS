import {TODODELTEMETeamStrategyState} from "./TODODELTEMETeamStrategyState";
import {
    TODODELETEMESquaddieActionsForThisRoundService,
    TODODELETEMESquaddieDecisionsDuringThisPhase
} from "../history/TODODELETEMESquaddieDecisionsDuringThisPhase";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {ObjectRepositoryService} from "../objectRepository";

describe('Team Strategy State', () => {
    const createDummyState = (instruction?: TODODELETEMESquaddieDecisionsDuringThisPhase): TODODELTEMETeamStrategyState => {
        return new TODODELTEMETeamStrategyState({
            squaddieRepository: ObjectRepositoryService.new(),
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
        const newInstruction: TODODELETEMESquaddieDecisionsDuringThisPhase = TODODELETEMESquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
        });

        const state: TODODELTEMETeamStrategyState = createDummyState(newInstruction);
        expect(state.instruction).toStrictEqual(newInstruction);

        state.reset();
        expect(state.instruction).toBeUndefined();
    });

    it('can set the instruction afterward', () => {
        const state: TODODELTEMETeamStrategyState = createDummyState();
        expect(state.instruction).toBeUndefined();

        const newInstruction: TODODELETEMESquaddieDecisionsDuringThisPhase = TODODELETEMESquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
        });
        state.setInstruction(newInstruction);

        expect(state.instruction).toStrictEqual(newInstruction);

    });
});
