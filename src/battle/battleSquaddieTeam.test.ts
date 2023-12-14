import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {BattleSquaddie, BattleSquaddieHelper} from "./battleSquaddie";
import {BattleSquaddieTeam, BattleSquaddieTeamHelper} from "./BattleSquaddieTeam";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {DefaultArmyAttributes} from "../squaddie/armyAttributes";

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
            id: "teamId",
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
        };
        playerSquaddieTemplateBase = {
            squaddieId: {
                templateId: "player_young_torrin",
                name: "Torrin",
                resources: {
                    mapIconResourceKey: "",
                    actionSpritesByEmotion: {},
                },
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            attributes: DefaultArmyAttributes(),
            actions: [],
        };

        squaddieRepository.addSquaddieTemplate(
            playerSquaddieTemplateBase
        );

        playerBattleSquaddie0 =
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId: "player_young_torrin_0",
                squaddieTemplateId: "player_young_torrin",
                squaddieTurn: {remainingActionPoints: 3},
            });

        squaddieRepository.addBattleSquaddie(
            playerBattleSquaddie0
        );

        playerBattleSquaddie1 = BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "player_young_torrin_1",
            squaddieTemplateId: "player_young_torrin",
            squaddieTurn: {remainingActionPoints: 3},
        });
        squaddieRepository.addBattleSquaddie(
            playerBattleSquaddie1
        );
        BattleSquaddieTeamHelper.addBattleSquaddieIds(twoPlayerTeam, ["player_young_torrin_0", "player_young_torrin_1"]);

        twoEnemyTeam = {
            id: "teamId",
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
        };
        enemySquaddieTemplateBase = {
            squaddieId: {
                templateId: "enemy_slither_demon",
                name: "Slither",
                resources: {
                    mapIconResourceKey: "",
                    actionSpritesByEmotion: {},
                },
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                affiliation: SquaddieAffiliation.ENEMY,
            },
            actions: [],
            attributes: DefaultArmyAttributes(),
        };

        squaddieRepository.addSquaddieTemplate(
            enemySquaddieTemplateBase
        );

        enemyBattleSquaddie0 =
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId: "enemy_slither_demon_0",
                squaddieTemplateId: "enemy_slither_demon",
                squaddieTurn: {remainingActionPoints: 3},
            });

        squaddieRepository.addBattleSquaddie(
            enemyBattleSquaddie0
        );

        enemyBattleSquaddie1 = BattleSquaddieHelper.newBattleSquaddie({
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

        BattleSquaddieHelper.endTurn(playerBattleSquaddie0);
        expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        BattleSquaddieHelper.endTurn(playerBattleSquaddie1);
        expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeFalsy();
    });
    it('knows if the player can control at least 1 squaddie', () => {
        expect(BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        BattleSquaddieHelper.endTurn(playerBattleSquaddie0);
        expect(BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        BattleSquaddieHelper.endTurn(playerBattleSquaddie1);
        expect(BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(twoPlayerTeam, squaddieRepository)).toBeFalsy();
    });
    it('can get a squaddie who can act this round', () => {
        expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();
        expect(BattleSquaddieTeamHelper.getBattleSquaddiesThatCanAct(twoPlayerTeam, squaddieRepository)).toStrictEqual(["player_young_torrin_0", "player_young_torrin_1"]);
        BattleSquaddieHelper.endTurn(playerBattleSquaddie0);

        expect(BattleSquaddieTeamHelper.getBattleSquaddiesThatCanAct(twoPlayerTeam, squaddieRepository)).toStrictEqual(["player_young_torrin_1"]);
    });
    it('can get a squaddie who can act this round but is not controlled by the player', () => {
        expect(BattleSquaddieTeamHelper.canPlayerControlAnySquaddieOnThisTeamRightNow(twoEnemyTeam, squaddieRepository)).toBeFalsy();

        BattleSquaddieHelper.endTurn(enemyBattleSquaddie0);

        expect(BattleSquaddieTeamHelper.getBattleSquaddieIdThatCanActButNotPlayerControlled(twoEnemyTeam, squaddieRepository)).toBe("enemy_slither_demon_1");
    });
    describe('begin new round', () => {
        it('can restore action points to the team upon beginning a round', () => {
            BattleSquaddieHelper.endTurn(playerBattleSquaddie0);
            BattleSquaddieHelper.endTurn(playerBattleSquaddie1);
            expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeFalsy();

            BattleSquaddieTeamHelper.beginNewRound(twoPlayerTeam, squaddieRepository);
            expect(BattleSquaddieTeamHelper.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();
            expect(BattleSquaddieHelper.canStillActThisRound(playerBattleSquaddie0)).toBeTruthy();
            expect(BattleSquaddieHelper.canStillActThisRound(playerBattleSquaddie1)).toBeTruthy();
        });
    });
    describe('sanitization', () => {
        let invalidTeamBase: BattleSquaddieTeam;

        beforeEach(() => {
            invalidTeamBase = {
                id: "teamId",
                name: "team name",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: [],
            };
        });

        it('sanitizes to fill in missing values', () => {
            const teamWithMissingFields: BattleSquaddieTeam = {
                id: "teamId",
                name: "team name",
                affiliation: null,
                battleSquaddieIds: undefined,
            };

            BattleSquaddieTeamHelper.sanitize(teamWithMissingFields);
            expect(teamWithMissingFields.name).toEqual("team name");
            expect(teamWithMissingFields.affiliation).toEqual(SquaddieAffiliation.UNKNOWN);
            expect(teamWithMissingFields.battleSquaddieIds).toHaveLength(0);
        });

        const tests: { field: string, value: any }[] = [
            {
                field: "name",
                value: "",
            },
            {
                field: "name",
                value: undefined,
            },
            {
                field: "name",
                value: null,
            },
            {
                field: "id",
                value: "",
            },
            {
                field: "id",
                value: undefined,
            },
            {
                field: "id",
                value: null,
            }
        ];

        it.each(tests)(`$field: $value will throw an error for being invalid`, ({
                                                                                    field,
                                                                                    value
                                                                                }) => {
            const invalidTeam = {
                ...invalidTeamBase,
                [field]: value,
            }
            const throwErrorBecauseInvalid = () => {
                BattleSquaddieTeamHelper.sanitize(invalidTeam);
            };

            expect(throwErrorBecauseInvalid).toThrowError('cannot sanitize');
        });
    });
});
