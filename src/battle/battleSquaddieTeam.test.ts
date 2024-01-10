import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ObjectRepository, ObjectRepositoryService} from "./objectRepository";
import {BattleSquaddie, BattleSquaddieService} from "./battleSquaddie";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "./BattleSquaddieTeam";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {DefaultArmyAttributes} from "../squaddie/armyAttributes";

describe('Battle Squaddie Team', () => {
    let squaddieRepository: ObjectRepository;
    let twoPlayerTeam: BattleSquaddieTeam;
    let playerSquaddieTemplateBase: SquaddieTemplate;
    let playerBattleSquaddie0: BattleSquaddie;
    let playerBattleSquaddie1: BattleSquaddie;

    let twoEnemyTeam: BattleSquaddieTeam;
    let enemySquaddieTemplateBase: SquaddieTemplate;
    let enemyBattleSquaddie0: BattleSquaddie;
    let enemyBattleSquaddie1: BattleSquaddie;

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryService.new();
        twoPlayerTeam = {
            id: "teamId",
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
            iconResourceKey: "",
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

        ObjectRepositoryService.addSquaddieTemplate(squaddieRepository,
            playerSquaddieTemplateBase
        );

        playerBattleSquaddie0 =
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "player_young_torrin_0",
                squaddieTemplateId: "player_young_torrin",
                squaddieTurn: {remainingActionPoints: 3},
            });

        ObjectRepositoryService.addBattleSquaddie(squaddieRepository,
            playerBattleSquaddie0
        );

        playerBattleSquaddie1 = BattleSquaddieService.newBattleSquaddie({
            battleSquaddieId: "player_young_torrin_1",
            squaddieTemplateId: "player_young_torrin",
            squaddieTurn: {remainingActionPoints: 3},
        });
        ObjectRepositoryService.addBattleSquaddie(squaddieRepository,
            playerBattleSquaddie1
        );
        BattleSquaddieTeamService.addBattleSquaddieIds(twoPlayerTeam, ["player_young_torrin_0", "player_young_torrin_1"]);

        twoEnemyTeam = {
            id: "teamId",
            name: "awesome test team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
            iconResourceKey: "",
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

        ObjectRepositoryService.addSquaddieTemplate(squaddieRepository,
            enemySquaddieTemplateBase
        );

        enemyBattleSquaddie0 =
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "enemy_slither_demon_0",
                squaddieTemplateId: "enemy_slither_demon",
                squaddieTurn: {remainingActionPoints: 3},
            });

        ObjectRepositoryService.addBattleSquaddie(squaddieRepository,
            enemyBattleSquaddie0
        );

        enemyBattleSquaddie1 = BattleSquaddieService.newBattleSquaddie({
            battleSquaddieId: "enemy_slither_demon_1",
            squaddieTemplateId: "enemy_slither_demon",
            squaddieTurn: {remainingActionPoints: 3},
        });
        ObjectRepositoryService.addBattleSquaddie(squaddieRepository,
            enemyBattleSquaddie1
        );
        BattleSquaddieTeamService.addBattleSquaddieIds(twoEnemyTeam, ["enemy_slither_demon_0", "enemy_slither_demon_1"])
    });
    it('knows at least 1 squaddie can act', () => {
        expect(BattleSquaddieTeamService.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        BattleSquaddieService.endTurn(playerBattleSquaddie0);
        expect(BattleSquaddieTeamService.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        BattleSquaddieService.endTurn(playerBattleSquaddie1);
        expect(BattleSquaddieTeamService.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeFalsy();
    });
    it('knows if the player can control at least 1 squaddie', () => {
        expect(BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        BattleSquaddieService.endTurn(playerBattleSquaddie0);
        expect(BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(twoPlayerTeam, squaddieRepository)).toBeTruthy();

        BattleSquaddieService.endTurn(playerBattleSquaddie1);
        expect(BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(twoPlayerTeam, squaddieRepository)).toBeFalsy();
    });
    it('can get a squaddie who can act this round', () => {
        expect(BattleSquaddieTeamService.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();
        expect(BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(twoPlayerTeam, squaddieRepository)).toStrictEqual(["player_young_torrin_0", "player_young_torrin_1"]);
        BattleSquaddieService.endTurn(playerBattleSquaddie0);

        expect(BattleSquaddieTeamService.getBattleSquaddiesThatCanAct(twoPlayerTeam, squaddieRepository)).toStrictEqual(["player_young_torrin_1"]);
    });
    it('can get a squaddie who can act this round but is not controlled by the player', () => {
        expect(BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(twoEnemyTeam, squaddieRepository)).toBeFalsy();

        BattleSquaddieService.endTurn(enemyBattleSquaddie0);

        expect(BattleSquaddieTeamService.getBattleSquaddieIdThatCanActButNotPlayerControlled(twoEnemyTeam, squaddieRepository)).toBe("enemy_slither_demon_1");
    });
    describe('begin new round', () => {
        it('can restore action points to the team upon beginning a round', () => {
            BattleSquaddieService.endTurn(playerBattleSquaddie0);
            BattleSquaddieService.endTurn(playerBattleSquaddie1);
            expect(BattleSquaddieTeamService.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeFalsy();

            BattleSquaddieTeamService.beginNewRound(twoPlayerTeam, squaddieRepository);
            expect(BattleSquaddieTeamService.hasAnActingSquaddie(twoPlayerTeam, squaddieRepository)).toBeTruthy();
            expect(BattleSquaddieService.canStillActThisRound(playerBattleSquaddie0)).toBeTruthy();
            expect(BattleSquaddieService.canStillActThisRound(playerBattleSquaddie1)).toBeTruthy();
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
                iconResourceKey: undefined,
            };
        });

        it('sanitizes to fill in missing values', () => {
            const teamWithMissingFields: BattleSquaddieTeam = {
                id: "teamId",
                name: "team name",
                affiliation: null,
                battleSquaddieIds: undefined,
                iconResourceKey: undefined,
            };

            BattleSquaddieTeamService.sanitize(teamWithMissingFields);
            expect(teamWithMissingFields.name).toEqual("team name");
            expect(teamWithMissingFields.affiliation).toEqual(SquaddieAffiliation.UNKNOWN);
            expect(teamWithMissingFields.battleSquaddieIds).toHaveLength(0);
            expect(teamWithMissingFields.iconResourceKey).toEqual("");
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
                BattleSquaddieTeamService.sanitize(invalidTeam);
            };

            expect(throwErrorBecauseInvalid).toThrowError('cannot sanitize');
        });
    });
});
