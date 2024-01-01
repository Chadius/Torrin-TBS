import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {BattleSquaddieHelper} from "../battleSquaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurnHandler} from "../../squaddie/turn";
import {AdvanceToNextPhase, BattlePhase} from "./battlePhaseTracker";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {BattlePhaseState} from "./battlePhaseController";
import {DefaultArmyAttributes} from "../../squaddie/armyAttributes";

describe('battlePhaseTracker', () => {
    let playerSquaddieTeam: BattleSquaddieTeam;
    let enemySquaddieTeam: BattleSquaddieTeam;
    let allySquaddieTeam: BattleSquaddieTeam;
    let noneSquaddieTeam: BattleSquaddieTeam;
    let squaddieRepo: ObjectRepository;

    beforeEach(() => {
        squaddieRepo = ObjectRepositoryHelper.new();

        ObjectRepositoryHelper.addSquaddieTemplate(squaddieRepo,
            {
                squaddieId: {
                    templateId: "player_squaddie",
                    name: "Player",
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                    traits: TraitStatusStorageHelper.newUsingTraitValues(),
                    affiliation: SquaddieAffiliation.PLAYER,
                },
                actions: [],
                attributes: DefaultArmyAttributes(),
            }
        );
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId: "player_squaddie_0",
                squaddieTemplateId: "player_squaddie",
                squaddieTurn: SquaddieTurnHandler.new()
            })
        );
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId: "player_squaddie_1",
                squaddieTemplateId: "player_squaddie",
                squaddieTurn: SquaddieTurnHandler.new()
            })
        );

        ObjectRepositoryHelper.addSquaddieTemplate(squaddieRepo,
            {
                squaddieId: {
                    templateId: "enemy_squaddie",
                    name: "Enemy",
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                    traits: TraitStatusStorageHelper.newUsingTraitValues(),
                    affiliation: SquaddieAffiliation.ENEMY,
                },
                actions: [],
                attributes: DefaultArmyAttributes(),
            }
        );
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId: "enemy_squaddie_0",
                squaddieTemplateId: "enemy_squaddie",
                squaddieTurn: SquaddieTurnHandler.new()
            })
        );

        ObjectRepositoryHelper.addSquaddieTemplate(squaddieRepo,
            {
                squaddieId: {
                    templateId: "ally_squaddie",
                    name: "Ally",
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                    traits: TraitStatusStorageHelper.newUsingTraitValues(),
                    affiliation: SquaddieAffiliation.ALLY,
                },
                actions: [],
                attributes: DefaultArmyAttributes(),
            }
        );
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId: "ally_squaddie_0",
                squaddieTemplateId: "ally_squaddie",
                squaddieTurn: SquaddieTurnHandler.new()
            })
        );

        ObjectRepositoryHelper.addSquaddieTemplate(squaddieRepo,
            {
                squaddieId: {
                    templateId: "none_squaddie",
                    name: "None",
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                    traits: TraitStatusStorageHelper.newUsingTraitValues(),
                    affiliation: SquaddieAffiliation.NONE,
                },
                actions: [],
                attributes: DefaultArmyAttributes(),
            }
        );
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId: "none_squaddie_0",
                squaddieTemplateId: "none_squaddie",
                squaddieTurn: SquaddieTurnHandler.new()
            })
        );

        playerSquaddieTeam = {
            id: "playerTeamId",
            name: "Player Team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: ["player_squaddie_0"],
            iconResourceKey: "icon_player_team",
        };
        enemySquaddieTeam = {
            id: "enemyTeamId",
            name: "Enemy Team",
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: ["enemy_squaddie_0"],
            iconResourceKey: "icon_enemy_team",
        };
        allySquaddieTeam = {
            id: "allyTeamId",
            name: "Ally Team",
            affiliation: SquaddieAffiliation.ALLY,
            battleSquaddieIds: ["ally_squaddie_0"],
            iconResourceKey: "icon_ally_team",
        };
        noneSquaddieTeam = {
            id: "noAffiliationTeamId",
            name: "None Team",
            affiliation: SquaddieAffiliation.NONE,
            battleSquaddieIds: ["none_squaddie_0"],
            iconResourceKey: "icon_none_team",
        };
    });


    it('defaults to the first added team', () => {
        const teams = [playerSquaddieTeam];

        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        AdvanceToNextPhase(battlePhaseState, teams);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
    })

    it('defaults to the first player team when multiple teams are added', () => {
        const teams = [playerSquaddieTeam, enemySquaddieTeam];

        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };
        AdvanceToNextPhase(battlePhaseState, teams);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
    })

    it('will rotate between phases when advance is called', () => {
        const teams: BattleSquaddieTeam[] = [playerSquaddieTeam, enemySquaddieTeam, allySquaddieTeam, noneSquaddieTeam];

        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        AdvanceToNextPhase(battlePhaseState, teams);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(battlePhaseState.turnCount).toBe(1);

        AdvanceToNextPhase(battlePhaseState, teams);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.ENEMY);
        expect(battlePhaseState.turnCount).toBe(1);

        AdvanceToNextPhase(battlePhaseState, teams);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.ALLY);
        expect(battlePhaseState.turnCount).toBe(1);

        AdvanceToNextPhase(battlePhaseState, teams);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.NONE);
        expect(battlePhaseState.turnCount).toBe(1);

        AdvanceToNextPhase(battlePhaseState, teams);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(battlePhaseState.turnCount).toBe(2);
    });

    it('throws an error if no teams are added', () => {
        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        const shouldThrowError = () => {
            AdvanceToNextPhase(battlePhaseState, []);
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("No teams are available");
    });
});
