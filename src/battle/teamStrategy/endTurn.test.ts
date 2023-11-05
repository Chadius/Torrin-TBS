import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {TeamStrategyState} from "./teamStrategyState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurnHandler} from "../../squaddie/turn";
import {BattleSquaddieTeam, BattleSquaddieTeamHelper} from "../battleSquaddieTeam";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {EndTurnTeamStrategy} from "./endTurn";
import * as mocks from "../../utils/test/mocks";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieResource} from "../../squaddie/resource";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

describe('end turn team strategy', () => {
    let playerSquaddieTemplate: SquaddieTemplate;
    let playerBattleSquaddie: BattleSquaddie;
    let squaddieRepository: BattleSquaddieRepository;
    let squaddieTeam: BattleSquaddieTeam;
    let missionMap: MissionMap;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
        playerSquaddieTemplate = new SquaddieTemplate({
            squaddieId: new SquaddieId({
                templateId: "new_static_squaddie",
                name: "Torrin",
                resources: new SquaddieResource({}),
                traits: new TraitStatusStorage({}),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            actions: [],
        });

        squaddieRepository.addSquaddieTemplate(
            playerSquaddieTemplate
        );

        playerBattleSquaddie =
            new BattleSquaddie({
                battleSquaddieId: "new_dynamic_squaddie",
                squaddieTemplateId: "new_static_squaddie",
                squaddieTurn: SquaddieTurnHandler.new(),
                mapIcon: mocks.mockImageUI(),
            });

        squaddieRepository.addBattleSquaddie(
            playerBattleSquaddie
        );

        squaddieTeam = {
            name: "team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
        };
        BattleSquaddieTeamHelper.addBattleSquaddieIds(squaddieTeam, ["new_dynamic_squaddie"]);

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
        missionMap.addSquaddie("new_static_squaddie", "new_dynamic_squaddie", {q: 0, r: 0});

        const expectedInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "new_static_squaddie",
            battleSquaddieId: "new_dynamic_squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.endTurn(expectedInstruction);

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy({});
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('is undefined when there are no squaddies', () => {
        const noSquaddieTeam: BattleSquaddieTeam = {
            name: "no squaddies team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
        };
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: noSquaddieTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy({});
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toBeUndefined();
    });

    it('is undefined when squaddies have no actions', () => {
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: squaddieTeam,
            squaddieRepository: squaddieRepository,
        });

        playerBattleSquaddie.endTurn();

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy({});
        const actualInstruction: SquaddieActionsForThisRound = strategy.DetermineNextInstruction(state, squaddieRepository);

        expect(actualInstruction).toBeUndefined();
    });
});
