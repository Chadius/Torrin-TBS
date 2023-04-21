import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattlePhase, BattlePhaseTracker} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {NullSquaddieResource} from "../../squaddie/resource";
import {NullTraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {NullSquaddieMovement} from "../../squaddie/movement";
import {SquaddieTurn} from "../../squaddie/turn";
import {BANNER_ANIMATION_TIME, BattlePhaseController} from "./battlePhaseController";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ImageUI} from "../../ui/imageUI";

describe('BattlePhaseController', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let battlePhaseTracker: BattlePhaseTracker;
    let battlePhaseController: BattlePhaseController;
    let playerSquaddieTeam: BattleSquaddieTeam;
    let enemySquaddieTeam: BattleSquaddieTeam;
    let startTime: number;
    let diffTime: number;
    let state: OrchestratorState;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    id: "player_squaddie",
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
            "player_squaddie_0",
            new BattleSquaddieDynamic({
                staticSquaddieId: "player_squaddie",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    id: "enemy_squaddie",
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
            "enemy_squaddie_0",
            new BattleSquaddieDynamic({
                staticSquaddieId: "enemy_squaddie",
                mapLocation: {q: 1, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        playerSquaddieTeam = new BattleSquaddieTeam({
            name: "Player Team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo,
            dynamicSquaddieIds: ["player_squaddie_0"]
        });
        enemySquaddieTeam = new BattleSquaddieTeam({
            name: "Enemy Team",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepo,
            dynamicSquaddieIds: ["enemy_squaddie_0"]
        });

        battlePhaseTracker = new BattlePhaseTracker();
        battlePhaseTracker.addTeam(playerSquaddieTeam);
        battlePhaseTracker.addTeam(enemySquaddieTeam);
        battlePhaseTracker.advanceToNextPhase();

        startTime = 100;
        diffTime = 100;

        state = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
            battlePhaseState: {
                bannerDisplayAnimationStartTime: startTime,
                bannerPhaseToShow: BattlePhase.UNKNOWN,
            }
        });

        battlePhaseController = new BattlePhaseController();
        battlePhaseController.draw = jest.fn();
    });

    it('sets the next state to selected squaddie and does not change phase if team has not finished their turns', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME);

        battlePhaseController.update(state);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(battlePhaseController.draw).not.toBeCalled();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);
        expect(state.battlePhaseState.bannerDisplayAnimationStartTime).toBe(startTime);
    });

    it('starts showing the player phase banner by default', () => {
        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        battlePhaseController.update(state);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);
        expect(state.battlePhaseState.bannerDisplayAnimationStartTime).toBe(startTime);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME + diffTime);
        battlePhaseController.update(state);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);
    });

    it('starts the animation and completes if team has finished their turns', () => {
        const {dynamicSquaddie: dynamicSquaddie0} = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicID("player_squaddie_0"));
        dynamicSquaddie0.endTurn();

        battlePhaseController.update(state);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.ENEMY);
        expect(state.battlePhaseState.bannerDisplayAnimationStartTime).toBe(startTime + BANNER_ANIMATION_TIME);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME + BANNER_ANIMATION_TIME + diffTime);
        battlePhaseController.update(state);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.ENEMY);
    });

    it('only draws the banner while the timer is going', () => {
        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo
        });
        battlePhaseController = new BattlePhaseController();
        battlePhaseController.draw = jest.fn();

        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        battlePhaseController.update(state);
        expect(battlePhaseController.draw).not.toBeCalled();
        expect(state.battlePhaseState.bannerDisplayAnimationStartTime).toBe(startTime);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME * 0.5);
        battlePhaseController.update(state);
        expect(battlePhaseController.draw).toBeCalledTimes(1);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME * 0.75);
        battlePhaseController.update(state);
        expect(battlePhaseController.draw).toBeCalledTimes(2);
    });

    it('resets internal variables once completed', () => {
        battlePhaseController = new BattlePhaseController();
        battlePhaseController.affiliationImageUI = new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>;

        expect(battlePhaseController.affiliationImageUI).toBeTruthy();
        battlePhaseController.reset();
        expect(battlePhaseController.affiliationImageUI).toBeFalsy();
    });
});