import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurn} from "../../squaddie/turn";
import {AdvanceToNextPhase, BattlePhase} from "./battlePhaseTracker";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieResource} from "../../squaddie/resource";
import {BattlePhaseState} from "./battlePhaseController";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

describe('battlePhaseTracker', () => {
    let playerSquaddieTeam: BattleSquaddieTeam;
    let enemySquaddieTeam: BattleSquaddieTeam;
    let allySquaddieTeam: BattleSquaddieTeam;
    let noneSquaddieTeam: BattleSquaddieTeam;
    let squaddieRepo: BattleSquaddieRepository;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();

        squaddieRepo.addSquaddietemplate(
            new SquaddieTemplate({
                squaddieId: new SquaddieId({
                    staticId: "player_squaddie",
                    name: "Player",
                    resources: new SquaddieResource({}),
                    traits: new TraitStatusStorage(),
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                actions: [],
            })
        );
        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddie({
                dynamicSquaddieId: "player_squaddie_0",
                squaddieTemplateId: "player_squaddie",
                squaddieTurn: new SquaddieTurn()
            })
        );

        squaddieRepo.addSquaddietemplate(
            new SquaddieTemplate({
                squaddieId: new SquaddieId({
                    staticId: "enemy_squaddie",
                    name: "Enemy",
                    resources: new SquaddieResource({}),
                    traits: new TraitStatusStorage(),
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
                actions: [],
            })
        );
        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddie({
                dynamicSquaddieId: "enemy_squaddie_0",
                squaddieTemplateId: "enemy_squaddie",
                squaddieTurn: new SquaddieTurn()
            })
        );

        squaddieRepo.addSquaddietemplate(
            new SquaddieTemplate({
                squaddieId: new SquaddieId({
                    staticId: "ally_squaddie",
                    name: "Ally",
                    resources: new SquaddieResource({}),
                    traits: new TraitStatusStorage(),
                    affiliation: SquaddieAffiliation.ALLY,
                }),
                actions: [],
            })
        );
        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddie({
                dynamicSquaddieId: "ally_squaddie_0",
                squaddieTemplateId: "ally_squaddie",
                squaddieTurn: new SquaddieTurn()
            })
        );

        squaddieRepo.addSquaddietemplate(
            new SquaddieTemplate({
                squaddieId: new SquaddieId({
                    staticId: "none_squaddie",
                    name: "None",
                    resources: new SquaddieResource({}),
                    traits: new TraitStatusStorage(),
                    affiliation: SquaddieAffiliation.NONE,
                }),
                actions: [],
            })
        );
        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddie({
                dynamicSquaddieId: "none_squaddie_0",
                squaddieTemplateId: "none_squaddie",
                squaddieTurn: new SquaddieTurn()
            })
        );

        playerSquaddieTeam = new BattleSquaddieTeam({
            name: "Player Team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo,
            dynamicSquaddieIds: ["player_squaddie"]
        });
        enemySquaddieTeam = new BattleSquaddieTeam({
            name: "Enemy Team",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepo,
            dynamicSquaddieIds: ["enemy_squaddie"]
        });
        allySquaddieTeam = new BattleSquaddieTeam({
            name: "Ally Team",
            affiliation: SquaddieAffiliation.ALLY,
            squaddieRepo,
            dynamicSquaddieIds: ["ally_squaddie"]
        });
        noneSquaddieTeam = new BattleSquaddieTeam({
            name: "None Team",
            affiliation: SquaddieAffiliation.NONE,
            squaddieRepo,
            dynamicSquaddieIds: ["none_squaddie"]
        });
    });


    it('defaults to the first added team', () => {
        const teamsByAffiliation = {
            [SquaddieAffiliation.PLAYER]: playerSquaddieTeam,
        }

        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        AdvanceToNextPhase(battlePhaseState, teamsByAffiliation);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
    })

    it('defaults to the player team when multiple teams are added', () => {
        const teamsByAffiliation = {
            [SquaddieAffiliation.PLAYER]: playerSquaddieTeam,
            [SquaddieAffiliation.ENEMY]: enemySquaddieTeam,
        }

        const battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };
        AdvanceToNextPhase(battlePhaseState, teamsByAffiliation);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
    })

    it('will rotate between teams', () => {
        const teamsByAffiliation = {
            [SquaddieAffiliation.PLAYER]: playerSquaddieTeam,
            [SquaddieAffiliation.ENEMY]: enemySquaddieTeam,
            [SquaddieAffiliation.ALLY]: allySquaddieTeam,
            [SquaddieAffiliation.NONE]: noneSquaddieTeam,
        }

        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }
        AdvanceToNextPhase(battlePhaseState, teamsByAffiliation);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(battlePhaseState.turnCount).toBe(1);

        AdvanceToNextPhase(battlePhaseState, teamsByAffiliation);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.ENEMY);
        expect(battlePhaseState.turnCount).toBe(1);

        AdvanceToNextPhase(battlePhaseState, teamsByAffiliation);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.ALLY);
        expect(battlePhaseState.turnCount).toBe(1);

        AdvanceToNextPhase(battlePhaseState, teamsByAffiliation);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.NONE);
        expect(battlePhaseState.turnCount).toBe(1);

        AdvanceToNextPhase(battlePhaseState, teamsByAffiliation);
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(battlePhaseState.turnCount).toBe(2);
    });


    it('throws an error if there are no available teams', () => {
        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        const shouldThrowError = () => {
            AdvanceToNextPhase(battlePhaseState, {});
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("No teams are available");
    });
});
