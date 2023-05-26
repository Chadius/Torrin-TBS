import {SquaddieInstruction} from "../history/squaddieInstruction";
import {TeamStrategyState} from "./teamStrategyState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {NullSquaddieResource} from "../../squaddie/resource";
import {NullTraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {NullSquaddieMovement} from "../../squaddie/movement";
import {SquaddieTurn} from "../../squaddie/turn";
import {ImageUI} from "../../ui/imageUI";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {EndTurnTeamStrategy} from "./endTurn";

describe('end turn team strategy', () => {
    let playerStaticSquaddie: BattleSquaddieStatic;
    let playerDynamicSquaddie: BattleSquaddieDynamic;
    let squaddieRepository: BattleSquaddieRepository;
    let squaddieTeam: BattleSquaddieTeam;
    let missionMap: MissionMap;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
        playerStaticSquaddie = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                id: "new_static_squaddie",
                name: "Torrin",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            movement: NullSquaddieMovement(),
            activities: [],
        });

        squaddieRepository.addStaticSquaddie(
            playerStaticSquaddie
        );

        playerDynamicSquaddie =
            new BattleSquaddieDynamic({
                staticSquaddieId: "new_static_squaddie",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn(),
                mapIcon: new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>,
            });

        squaddieRepository.addDynamicSquaddie(
            "new_dynamic_squaddie",
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

        const expectedInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "new_static_squaddie",
            dynamicSquaddieId: "new_dynamic_squaddie",
            startingLocation: {q: 0, r: 0},
        });
        expectedInstruction.endTurn();

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy();
        const actualInstruction: SquaddieInstruction = strategy.DetermineNextInstruction(state);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.getInstruction()).toStrictEqual(expectedInstruction);
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
        const actualInstruction: SquaddieInstruction = strategy.DetermineNextInstruction(state);
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
        const actualInstruction: SquaddieInstruction = strategy.DetermineNextInstruction(state);

        expect(actualInstruction).toBeUndefined();
    });
});
