import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattlePhase, BattlePhaseTracker} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {NullSquaddieResource} from "../../squaddie/resource";
import {NullTraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurn} from "../../squaddie/turn";
import {BANNER_ANIMATION_TIME, BattlePhaseController} from "./battlePhaseController";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {ImageUI} from "../../ui/imageUI";
import {ResourceHandler} from "../../resource/resourceHandler";
import p5 from "p5";

jest.mock('p5', () => () => {
    return {}
});
describe('BattlePhaseController', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let battlePhaseTracker: BattlePhaseTracker;
    let battlePhaseController: BattlePhaseController;
    let playerSquaddieTeam: BattleSquaddieTeam;
    let enemySquaddieTeam: BattleSquaddieTeam;
    let resourceHandler: ResourceHandler;
    let diffTime: number;
    let state: OrchestratorState;
    let mockedP5: p5;

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
                activities: [],
            })
        );
        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "player_squaddie_0",
                staticSquaddieId: "player_squaddie",
                squaddieTurn: new SquaddieTurn(),
                mapIcon: new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>,
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
                activities: [],
            })
        );
        squaddieRepo.addDynamicSquaddie(
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "enemy_squaddie_0",
                staticSquaddieId: "enemy_squaddie",
                squaddieTurn: new SquaddieTurn(),
                mapIcon: new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>,
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

        diffTime = 100;

        resourceHandler = new (<new (options: any) => ResourceHandler>ResourceHandler)({}) as jest.Mocked<ResourceHandler>;
        resourceHandler.getResource = jest.fn().mockReturnValue(makeResult("Hi"));

        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;

        state = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
            battlePhaseState: {
                bannerPhaseToShow: BattlePhase.UNKNOWN,
            },
            resourceHandler
        });

        battlePhaseController = new BattlePhaseController();
        battlePhaseController.draw = jest.fn();
    });

    it('does nothing and finishes immediately if team has not finished their turn', () => {
        battlePhaseTracker.advanceToNextPhase();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);

        battlePhaseController.update(state, mockedP5);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(battlePhaseController.draw).not.toBeCalled();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);
    });

    it('starts showing the player phase banner by default', () => {
        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
            resourceHandler,
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        battlePhaseController.update(state, mockedP5);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(startTime);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME + diffTime);
        battlePhaseController.update(state, mockedP5);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);
    });

    it('starts the animation and completes if team has finished their turns', () => {
        battlePhaseTracker.advanceToNextPhase();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);

        const {dynamicSquaddie: dynamicSquaddie0} = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicID("player_squaddie_0"));
        dynamicSquaddie0.endTurn();

        const startTime = 100;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);
        battlePhaseController.update(state, mockedP5);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.ENEMY);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME + diffTime);
        battlePhaseController.update(state, mockedP5);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.ENEMY);
    });

    it('only draws the banner while the timer is going', () => {
        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
            resourceHandler,
        });
        battlePhaseController = new BattlePhaseController();
        battlePhaseController.draw = jest.fn();

        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        battlePhaseController.update(state, mockedP5);
        expect(battlePhaseController.draw).not.toBeCalled();
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(startTime);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME * 0.5);
        battlePhaseController.update(state, mockedP5);
        expect(battlePhaseController.draw).toBeCalledTimes(1);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME * 0.75);
        battlePhaseController.update(state, mockedP5);
        expect(battlePhaseController.draw).toBeCalledTimes(2);
    });

    it('resets internal variables once completed', () => {
        battlePhaseController = new BattlePhaseController();
        battlePhaseController.affiliationImageUI = new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>;

        expect(battlePhaseController.affiliationImageUI).toBeTruthy();
        battlePhaseController.reset(new OrchestratorState());
        expect(battlePhaseController.affiliationImageUI).toBeFalsy();
    });

    it('restores team squaddie turns once the banner appears starts', () => {
        const {dynamicSquaddie: dynamicSquaddie0} = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicID("player_squaddie_0"));
        dynamicSquaddie0.endTurn();
        expect(dynamicSquaddie0.canStillActThisRound()).toBeFalsy();

        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
            resourceHandler,
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;

        jest.spyOn(Date, 'now').mockImplementation(() => startTime);
        battlePhaseController.update(state, mockedP5);

        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(battlePhaseTracker.getCurrentPhase()).toBe(BattlePhase.PLAYER);
        expect(dynamicSquaddie0.canStillActThisRound()).toBeTruthy();
    });
});
