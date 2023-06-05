import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {SquaddieId} from "../squaddie/id";
import {NullSquaddieResource} from "../squaddie/resource";
import {NullTraitStatusStorage} from "../trait/traitStatusStorage";
import {NullSquaddieMovement} from "../squaddie/movement";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieTurn} from "../squaddie/turn";
import {BattleSquaddieTeam} from "./battleSquaddieTeam";
import {ImageUI} from "../ui/imageUI";

describe('Battle Squaddie Team', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let twoPlayerTeam: BattleSquaddieTeam;
    let playerStaticSquaddieBase: BattleSquaddieStatic;
    let playerDynamicSquaddie0: BattleSquaddieDynamic;
    let playerDynamicSquaddie1: BattleSquaddieDynamic;

    let twoEnemyTeam: BattleSquaddieTeam;
    let enemyStaticSquaddieBase: BattleSquaddieStatic;
    let enemyDynamicSquaddie0: BattleSquaddieDynamic;
    let enemyDynamicSquaddie1: BattleSquaddieDynamic;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();
        twoPlayerTeam = new BattleSquaddieTeam({
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo: squaddieRepo,
        });
        playerStaticSquaddieBase = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                staticId: "player_young_torrin",
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

        playerDynamicSquaddie0 =
            new BattleSquaddieDynamic({
                staticSquaddieId: "player_young_torrin",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn(),
                mapIcon: new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>,
            });

        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            playerDynamicSquaddie0
        );

        playerDynamicSquaddie1 = new BattleSquaddieDynamic({
            staticSquaddieId: "player_young_torrin",
            mapLocation: {q: 1, r: 0},
            squaddieTurn: new SquaddieTurn(),
            mapIcon: new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>,
        });
        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_1",
            playerDynamicSquaddie1
        );
        twoPlayerTeam.addDynamicSquaddieIds(["player_young_torrin_0", "player_young_torrin_1"])

        twoEnemyTeam = new BattleSquaddieTeam({
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo: squaddieRepo,
        });
        enemyStaticSquaddieBase = new BattleSquaddieStatic({
            squaddieId: new SquaddieId({
                staticId: "enemy_slither_demon",
                name: "Slither",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.ENEMY,
            }),
            movement: NullSquaddieMovement(),
            activities: [],
        });

        squaddieRepo.addStaticSquaddie(
            enemyStaticSquaddieBase
        );

        enemyDynamicSquaddie0 =
            new BattleSquaddieDynamic({
                staticSquaddieId: "enemy_slither_demon",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            });

        squaddieRepo.addDynamicSquaddie(
            "enemy_slither_demon_0",
            enemyDynamicSquaddie0
        );

        enemyDynamicSquaddie1 = new BattleSquaddieDynamic({
            staticSquaddieId: "enemy_slither_demon",
            mapLocation: {q: 1, r: 0},
            squaddieTurn: new SquaddieTurn()
        });
        squaddieRepo.addDynamicSquaddie(
            "enemy_slither_demon_1",
            enemyDynamicSquaddie1
        );
        twoEnemyTeam.addDynamicSquaddieIds(["enemy_slither_demon_0", "enemy_slither_demon_1"])
    });
    it('knows at least 1 squaddie can act', () => {
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeTruthy();

        playerDynamicSquaddie0.endTurn();
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeTruthy();

        playerDynamicSquaddie1.endTurn();
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeFalsy();
    });
    it('knows if the player can control at least 1 squaddie', () => {
        expect(twoPlayerTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeTruthy();

        playerDynamicSquaddie0.endTurn();
        expect(twoPlayerTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeTruthy();

        playerDynamicSquaddie1.endTurn();
        expect(twoPlayerTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeFalsy();
    });
    it('can get a squaddie who can act this round', () => {
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeTruthy();
        expect(twoPlayerTeam.getDynamicSquaddiesThatCanAct()).toStrictEqual(["player_young_torrin_0", "player_young_torrin_1"]);
        playerDynamicSquaddie0.endTurn();

        expect(twoPlayerTeam.getDynamicSquaddiesThatCanAct()).toStrictEqual(["player_young_torrin_1"]);
    });
    it('can get a squaddie who can act this round but is not controlled by the player', () => {
        expect(twoEnemyTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeFalsy();

        enemyDynamicSquaddie0.endTurn();

        expect(twoEnemyTeam.getDynamicSquaddieIdThatCanActButNotPlayerControlled()).toBe("enemy_slither_demon_1");
    });
    describe('begin new round', () => {
        it('can restore actions to the team upon beginning a round', () => {
            playerDynamicSquaddie0.endTurn();
            playerDynamicSquaddie1.endTurn();
            expect(twoPlayerTeam.hasAnActingSquaddie()).toBeFalsy();

            twoPlayerTeam.beginNewRound();
            expect(twoPlayerTeam.hasAnActingSquaddie()).toBeTruthy();
            expect(playerDynamicSquaddie0.canStillActThisRound()).toBeTruthy();
            expect(playerDynamicSquaddie1.canStillActThisRound()).toBeTruthy();
        });
    });
});
