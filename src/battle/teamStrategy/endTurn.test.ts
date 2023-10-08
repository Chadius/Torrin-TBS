import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {TeamStrategyState} from "./teamStrategyState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurn} from "../../squaddie/turn";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {EndTurnTeamStrategy} from "./endTurn";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import * as mocks from "../../utils/test/mocks";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieResource} from "../../squaddie/resource";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

describe('end turn team strategy', () => {
    let playerSquaddietemplate: SquaddieTemplate;
    let playerDynamicSquaddie: BattleSquaddie;
    let squaddieRepository: BattleSquaddieRepository;
    let squaddieTeam: BattleSquaddieTeam;
    let missionMap: MissionMap;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
        playerSquaddietemplate = new SquaddieTemplate({
            squaddieId: new SquaddieId({
                staticId: "new_static_squaddie",
                name: "Torrin",
                resources: new SquaddieResource({}),
                traits: new TraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            actions: [],
        });

        squaddieRepository.addSquaddietemplate(
            playerSquaddietemplate
        );

        playerDynamicSquaddie =
            new BattleSquaddie({
                dynamicSquaddieId: "new_dynamic_squaddie",
                squaddieTemplateId: "new_static_squaddie",
                squaddieTurn: new SquaddieTurn(),
                mapIcon: mocks.mockImageUI(),
            });

        squaddieRepository.addDynamicSquaddie(
            playerDynamicSquaddie
        );

        squaddieTeam = new BattleSquaddieTeam({
            name: "team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo: squaddieRepository,
        });
        squaddieTeam.addDynamicSquaddieIds(["new_dynamic_squaddie"]);

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 "]})
        });
    });

    it('determines it should end its turn', () => {
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: squaddieTeam,
            squaddieRepository: squaddieRepository,
        });
        missionMap.addSquaddie("new_static_squaddie", "new_dynamic_squaddie", new HexCoordinate({q: 0, r: 0}));

        const expectedInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            squaddietemplateId: "new_static_squaddie",
            dynamicSquaddieId: "new_dynamic_squaddie",
            startingLocation: new HexCoordinate({q: 0, r: 0}),
        });
        expectedInstruction.endTurn();

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy();
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('is undefined when there are no squaddies', () => {
        const noSquaddieTeam: BattleSquaddieTeam = new BattleSquaddieTeam({
            name: "no squaddies team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo: squaddieRepository,
        });
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: noSquaddieTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy();
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);
        expect(actualInstruction).toBeUndefined();
    });

    it('is undefined when squaddies have no actions', () => {
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: squaddieTeam,
            squaddieRepository: squaddieRepository,
        });

        playerDynamicSquaddie.endTurn();

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy();
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state);

        expect(actualInstruction).toBeUndefined();
    });
});
