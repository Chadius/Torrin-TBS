import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {SquaddieId} from "../squaddie/id";
import {NullSquaddieResource} from "../squaddie/resource";
import {NullTraitStatusStorage} from "../trait/traitStatusStorage";
import {NullSquaddieMovement} from "../squaddie/movement";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieTurn} from "../squaddie/turn";
import {BattleSquaddieTeam} from "./battleSquaddieTeam";

describe('Battle Squaddie Team', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let twoPlayerTeam: BattleSquaddieTeam;
    let playerStaticSquaddieBase: BattleSquaddieStatic;
    let dynamicSquaddie0: BattleSquaddieDynamic;
    let dynamicSquaddie1: BattleSquaddieDynamic;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();
        twoPlayerTeam = new BattleSquaddieTeam({
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo: squaddieRepo,
        });
        playerStaticSquaddieBase = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                id: "player_young_torrin",
                name: "Torrin",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            movement: NullSquaddieMovement(),
            activities: [],
        });

        squaddieRepo.addStaticSquaddie(
            playerStaticSquaddieBase
        );

        dynamicSquaddie0 =
            new BattleSquaddieDynamic({
                staticSquaddieId: "player_young_torrin",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            });

        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            dynamicSquaddie0
        );

        dynamicSquaddie1 = new BattleSquaddieDynamic({
            staticSquaddieId: "player_young_torrin",
            mapLocation: {q: 1, r: 0},
            squaddieTurn: new SquaddieTurn()
        });
        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_1",
            dynamicSquaddie1
        );
        twoPlayerTeam.addDynamicSquaddieIds(["player_young_torrin_0", "player_young_torrin_1"])
    });
    it('knows at least 1 squaddie can act', () => {
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeTruthy();

        dynamicSquaddie0.endTurn();
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeTruthy();

        dynamicSquaddie1.endTurn();
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeFalsy();
    });
    it('knows if the player can control at least 1 squaddie', () => {
        expect(twoPlayerTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeTruthy();

        dynamicSquaddie0.endTurn();
        expect(twoPlayerTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeTruthy();

        dynamicSquaddie1.endTurn();
        expect(twoPlayerTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeFalsy();
    });
});