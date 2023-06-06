import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {NullSquaddieResource} from "../../squaddie/resource";
import {NullTraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {NullSquaddieMovement} from "../../squaddie/movement";
import {SquaddieTurn} from "../../squaddie/turn";
import {BattlePhase, BattlePhaseTracker} from "./battlePhaseTracker";

describe('battlePhaseTracker', () => {
    let phaseTracker: BattlePhaseTracker;
    let playerSquaddieTeam: BattleSquaddieTeam;
    let enemySquaddieTeam: BattleSquaddieTeam;
    let allySquaddieTeam: BattleSquaddieTeam;
    let noneSquaddieTeam: BattleSquaddieTeam;
    let squaddieRepo: BattleSquaddieRepository;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    staticId: "player_squaddie",
                    name: "Player",
                    resources: NullSquaddieResource(),
                    traits: NullTraitStatusStorage(),
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                movement: NullSquaddieMovement(),
                activities: [],
            })
        );
        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "player_squaddie_0",
                staticSquaddieId: "player_squaddie",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    staticId: "enemy_squaddie",
                    name: "Enemy",
                    resources: NullSquaddieResource(),
                    traits: NullTraitStatusStorage(),
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
                movement: NullSquaddieMovement(),
                activities: [],
            })
        );
        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "enemy_squaddie_0",
                staticSquaddieId: "enemy_squaddie",
                mapLocation: {q: 1, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    staticId: "ally_squaddie",
                    name: "Ally",
                    resources: NullSquaddieResource(),
                    traits: NullTraitStatusStorage(),
                    affiliation: SquaddieAffiliation.ALLY,
                }),
                movement: NullSquaddieMovement(),
                activities: [],
            })
        );
        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "ally_squaddie_0",
                staticSquaddieId: "ally_squaddie",
                mapLocation: {q: 2, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    staticId: "none_squaddie",
                    name: "None",
                    resources: NullSquaddieResource(),
                    traits: NullTraitStatusStorage(),
                    affiliation: SquaddieAffiliation.NONE,
                }),
                movement: NullSquaddieMovement(),
                activities: [],
            })
        );
        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "none_squaddie_0",
                staticSquaddieId: "none_squaddie",
                mapLocation: {q: 3, r: 0},
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

        phaseTracker = new BattlePhaseTracker();
    });

    it('defaults to unknown phase', () => {
        expect(phaseTracker.getCurrentPhase()).toBe(BattlePhase.UNKNOWN);
        expect(phaseTracker.getCurrentTeam()).toBeUndefined();
    })

    it('defaults to the first added team', () => {
        phaseTracker.addTeam(playerSquaddieTeam);
        expect(phaseTracker.getCurrentPhase()).toBe(BattlePhase.UNKNOWN);
        expect(phaseTracker.getCurrentTeam()).toBeUndefined();

        phaseTracker.advanceToNextPhase();
        expect(phaseTracker.getCurrentTeam()).toBe(playerSquaddieTeam);
        expect(phaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);
    })

    it('defaults to the player team when multiple teams are added', () => {
        phaseTracker.addTeam(playerSquaddieTeam);
        phaseTracker.addTeam(enemySquaddieTeam);
        phaseTracker.advanceToNextPhase();
        expect(phaseTracker.getCurrentTeam()).toBe(playerSquaddieTeam);
        expect(phaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);
    })

    it('will rotate between teams', () => {
        phaseTracker.addTeam(playerSquaddieTeam);
        phaseTracker.addTeam(enemySquaddieTeam);
        phaseTracker.addTeam(allySquaddieTeam);
        phaseTracker.addTeam(noneSquaddieTeam);
        phaseTracker.advanceToNextPhase();
        expect(phaseTracker.getCurrentTeam()).toBe(playerSquaddieTeam);
        expect(phaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);

        phaseTracker.advanceToNextPhase();
        expect(phaseTracker.getCurrentTeam()).toBe(enemySquaddieTeam);
        expect(phaseTracker.getCurrentPhase()).toBe(BattlePhase.ENEMY);

        phaseTracker.advanceToNextPhase();
        expect(phaseTracker.getCurrentTeam()).toBe(allySquaddieTeam);
        expect(phaseTracker.getCurrentPhase()).toBe(BattlePhase.ALLY);

        phaseTracker.advanceToNextPhase();
        expect(phaseTracker.getCurrentTeam()).toBe(noneSquaddieTeam);
        expect(phaseTracker.getCurrentPhase()).toBe(BattlePhase.NONE);

        phaseTracker.advanceToNextPhase();
        expect(phaseTracker.getCurrentTeam()).toBe(playerSquaddieTeam);
        expect(phaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);
    });
});
