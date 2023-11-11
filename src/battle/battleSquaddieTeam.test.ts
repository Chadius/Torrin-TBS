import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {SquaddieId} from "../squaddie/id";
import {BattleSquaddie} from "./battleSquaddie";
import {BattleSquaddieTeam, BattleSquaddieTeamHelper} from "./BattleSquaddieTeam";
import * as mocks from "../utils/test/mocks";
import {SquaddieResource} from "../squaddie/resource";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {TraitStatusStorageHelper} from "../trait/traitStatusStorage";

describe('Battle Squaddie Team', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let twoPlayerTeam: BattleSquaddieTeam;
    let playerSquaddieTemplateBase: SquaddieTemplate;
    let playerBattleSquaddie0: BattleSquaddie;
    let playerBattleSquaddie1: BattleSquaddie;

    let twoEnemyTeam: BattleSquaddieTeam;
    let enemySquaddieTemplateBase: SquaddieTemplate;
    let enemyBattleSquaddie0: BattleSquaddie;
    let enemyBattleSquaddie1: BattleSquaddie;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
        twoPlayerTeam = {
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
        };
        playerSquaddieTemplateBase = new SquaddieTemplate({
            squaddieId: new SquaddieId({
                templateId: "player_young_torrin",
                name: "Torrin",
                resources: new SquaddieResource({}),
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            actions: [],
        });

        squaddieRepository.addSquaddieTemplate(
            playerSquaddieTemplateBase
        );

        playerBattleSquaddie0 =
            new BattleSquaddie({
                battleSquaddieId: "player_young_torrin_0",
                squaddieTemplateId: "player_young_torrin",
                squaddieTurn: {remainingActionPoints: 3},
                mapIcon: mocks.mockImageUI(),
            });

        squaddieRepository.addBattleSquaddie(
            playerBattleSquaddie0
        );

        playerBattleSquaddie1 = new BattleSquaddie({
            battleSquaddieId: "player_young_torrin_1",
            squaddieTemplateId: "player_young_torrin",
            squaddieTurn: {remainingActionPoints: 3},
            mapIcon: mocks.mockImageUI(),
        });
        squaddieRepository.addBattleSquaddie(
            playerBattleSquaddie1
        );
        BattleSquaddieTeamHelper.addBattleSquaddieIds(twoPlayerTeam, ["player_young_torrin_0", "player_young_torrin_1"]);

        twoEnemyTeam = {
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
        };
        enemySquaddieTemplateBase = new SquaddieTemplate({
            squaddieId: new SquaddieId({
                templateId: "enemy_slither_demon",
                name: "Slither",
                resources: new SquaddieResource({}),
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                affiliation: SquaddieAffiliation.ENEMY,
            }),
            actions: [],
        });

        squaddieRepository.addSquaddieTemplate(
            enemySquaddieTemplateBase
        );

        enemyBattleSquaddie0 =
            new BattleSquaddie({
                battleSquaddieId: "enemy_slither_demon_0",
                squaddieTemplateId: "enemy_slither_demon",
                squaddieTurn: {remainingActionPoints: 3},
            });

        squaddieRepository.addBattleSquaddie(
            enemyBattleSquaddie0
        );

        enemyBattleSquaddie1 = new BattleSquaddie({
            battleSquaddieId: "enemy_slither_demon_1",
            squaddieTemplateId: "enemy_slither_demon",
            squaddieTurn: {remainingActionPoints: 3},
        });
        squaddieRepository.addBattleSquaddie(
            enemyBattleSquaddie1
        );
        BattleSquaddieTeamHelper.addBattleSquaddieIds(twoEnemyTeam, ["enemy_slither_demon_0", "enemy_slither_demon_1"])
    });
    it('knows at least 1 squaddie can act', () => {
        expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        playerBattleSquaddie0.endTurn();
        expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        playerBattleSquaddie1.endTurn();
        expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeFalsy();
    });
    it('knows if the player can control at least 1 squaddie', () => {
        expect(BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        playerBattleSquaddie0.endTurn();
        expect(BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        playerBattleSquaddie1.endTurn();
        expect(BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(twoPlayerTeam, squaddieRepository)).toBeFalsy();
    });
    it('can get a squaddie who can act this round', () => {
        expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();
        expect(BattleSquaddieTeamHelper.getBattleSquaddiesThatCanAct(twoPlayerTeam, squaddieRepository)).toStrictEqual(["player_young_torrin_0", "player_young_torrin_1"]);
        playerBattleSquaddie0.endTurn();

        expect(BattleSquaddieTeamHelper.getBattleSquaddiesThatCanAct(twoPlayerTeam, squaddieRepository)).toStrictEqual(["player_young_torrin_1"]);
    });
    it('can get a squaddie who can act this round but is not controlled by the player', () => {
        expect(BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(twoEnemyTeam, squaddieRepository)).toBeFalsy();

        enemyBattleSquaddie0.endTurn();

        expect(BattleSquaddieTeamHelper.getBattleSquaddieIdThatCanActButNotPlayerControlled(twoEnemyTeam, squaddieRepository)).toBe("enemy_slither_demon_1");
    });
    describe('begin new round', () => {
        it('can restore action points to the team upon beginning a round', () => {
            playerBattleSquaddie0.endTurn();
            playerBattleSquaddie1.endTurn();
            expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeFalsy();

            BattleSquaddieTeamHelper.beginNewRound(twoPlayerTeam, squaddieRepository);
            expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();
            expect(playerBattleSquaddie0.canStillActThisRound()).toBeTruthy();
            expect(playerBattleSquaddie1.canStillActThisRound()).toBeTruthy();
        });
    });
});
