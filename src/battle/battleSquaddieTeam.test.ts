import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {SquaddieId} from "../squaddie/id";
import {BattleSquaddie} from "./battleSquaddie";
import {SquaddieTurn} from "../squaddie/turn";
import {BattleSquaddieTeam} from "./battleSquaddieTeam";
import * as mocks from "../utils/test/mocks";
import {TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieResource} from "../squaddie/resource";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

describe('Battle Squaddie Team', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let twoPlayerTeam: BattleSquaddieTeam;
    let playerSquaddieTemplateBase: SquaddieTemplate;
    let playerBattleSquaddie0: BattleSquaddie;
    let playerBattleSquaddie1: BattleSquaddie;

    let twoEnemyTeam: BattleSquaddieTeam;
    let enemySquaddieTemplateBase: SquaddieTemplate;
    let enemyBattleSquaddie0: BattleSquaddie;
    let enemyBattleSquaddie1: BattleSquaddie;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();
        twoPlayerTeam = new BattleSquaddieTeam({
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo: squaddieRepo,
        });
        playerSquaddieTemplateBase = new SquaddieTemplate({
            squaddieId: new SquaddieId({
                templateId: "player_young_torrin",
                name: "Torrin",
                resources: new SquaddieResource({}),
                traits: new TraitStatusStorage({}),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            actions: [],
        });

        squaddieRepo.addSquaddieTemplate(
            playerSquaddieTemplateBase
        );

        playerBattleSquaddie0 =
            new BattleSquaddie({
                battleSquaddieId: "player_young_torrin_0",
                squaddieTemplateId: "player_young_torrin",
                squaddieTurn: new SquaddieTurn(),
                mapIcon: mocks.mockImageUI(),
            });

        squaddieRepo.addBattleSquaddie(
            playerBattleSquaddie0
        );

        playerBattleSquaddie1 = new BattleSquaddie({
            battleSquaddieId: "player_young_torrin_1",
            squaddieTemplateId: "player_young_torrin",
            squaddieTurn: new SquaddieTurn(),
            mapIcon: mocks.mockImageUI(),
        });
        squaddieRepo.addBattleSquaddie(
            playerBattleSquaddie1
        );
        twoPlayerTeam.addBattleSquaddieIds(["player_young_torrin_0", "player_young_torrin_1"])

        twoEnemyTeam = new BattleSquaddieTeam({
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo: squaddieRepo,
        });
        enemySquaddieTemplateBase = new SquaddieTemplate({
            squaddieId: new SquaddieId({
                templateId: "enemy_slither_demon",
                name: "Slither",
                resources: new SquaddieResource({}),
                traits: new TraitStatusStorage({}),
                affiliation: SquaddieAffiliation.ENEMY,
            }),
            actions: [],
        });

        squaddieRepo.addSquaddieTemplate(
            enemySquaddieTemplateBase
        );

        enemyBattleSquaddie0 =
            new BattleSquaddie({
                battleSquaddieId: "enemy_slither_demon_0",
                squaddieTemplateId: "enemy_slither_demon",
                squaddieTurn: new SquaddieTurn()
            });

        squaddieRepo.addBattleSquaddie(
            enemyBattleSquaddie0
        );

        enemyBattleSquaddie1 = new BattleSquaddie({
            battleSquaddieId: "enemy_slither_demon_1",
            squaddieTemplateId: "enemy_slither_demon",
            squaddieTurn: new SquaddieTurn()
        });
        squaddieRepo.addBattleSquaddie(
            enemyBattleSquaddie1
        );
        twoEnemyTeam.addBattleSquaddieIds(["enemy_slither_demon_0", "enemy_slither_demon_1"])
    });
    it('knows at least 1 squaddie can act', () => {
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeTruthy();

        playerBattleSquaddie0.endTurn();
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeTruthy();

        playerBattleSquaddie1.endTurn();
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeFalsy();
    });
    it('knows if the player can control at least 1 squaddie', () => {
        expect(twoPlayerTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeTruthy();

        playerBattleSquaddie0.endTurn();
        expect(twoPlayerTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeTruthy();

        playerBattleSquaddie1.endTurn();
        expect(twoPlayerTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeFalsy();
    });
    it('can get a squaddie who can act this round', () => {
        expect(twoPlayerTeam.hasAnActingSquaddie()).toBeTruthy();
        expect(twoPlayerTeam.getBattleSquaddiesThatCanAct()).toStrictEqual(["player_young_torrin_0", "player_young_torrin_1"]);
        playerBattleSquaddie0.endTurn();

        expect(twoPlayerTeam.getBattleSquaddiesThatCanAct()).toStrictEqual(["player_young_torrin_1"]);
    });
    it('can get a squaddie who can act this round but is not controlled by the player', () => {
        expect(twoEnemyTeam.canPlayerControlAnySquaddieOnThisTeamRightNow()).toBeFalsy();

        enemyBattleSquaddie0.endTurn();

        expect(twoEnemyTeam.getBattleSquaddieIdThatCanActButNotPlayerControlled()).toBe("enemy_slither_demon_1");
    });
    describe('begin new round', () => {
        it('can restore action points to the team upon beginning a round', () => {
            playerBattleSquaddie0.endTurn();
            playerBattleSquaddie1.endTurn();
            expect(twoPlayerTeam.hasAnActingSquaddie()).toBeFalsy();

            twoPlayerTeam.beginNewRound();
            expect(twoPlayerTeam.hasAnActingSquaddie()).toBeTruthy();
            expect(playerBattleSquaddie0.canStillActThisRound()).toBeTruthy();
            expect(playerBattleSquaddie1.canStillActThisRound()).toBeTruthy();
        });
    });
});
