import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {SquaddieId} from "../squaddie/id";
import {NullSquaddieResource} from "../squaddie/resource";
import {NullTraitStatusStorage} from "../trait/traitStatusStorage";
import {NullSquaddieMovement} from "../squaddie/movement";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieTurn} from "../squaddie/turn";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {BattleSquaddieTeam} from "./battleSquaddieTeam";

describe('Battle Squaddie Team', () => {
    it('knows at least 1 squaddie can act', () => {
        const squaddieRepo = new BattleSquaddieRepository();
        const team: BattleSquaddieTeam = new BattleSquaddieTeam({
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo: squaddieRepo,
        });

        const staticSquaddieBase = new BattleSquaddieStatic({
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
            staticSquaddieBase
        );

        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            new BattleSquaddieDynamic({
                staticSquaddieId: "player_young_torrin",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_1",
            new BattleSquaddieDynamic({
                staticSquaddieId: "player_young_torrin",
                mapLocation: {q: 1, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        team.addDynamicSquaddieIds(["player_young_torrin_0", "player_young_torrin_1"])

        expect(team.hasAnActingSquaddie()).toBeTruthy();

        const {dynamicSquaddie: dynamicSquaddie0} = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicID("player_young_torrin_0"));
        dynamicSquaddie0.endTurn();
        expect(team.hasAnActingSquaddie()).toBeTruthy();

        const {dynamicSquaddie: dynamicSquaddie1} = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicID("player_young_torrin_1"));
        dynamicSquaddie1.endTurn();
        expect(team.hasAnActingSquaddie()).toBeFalsy();
    });
});