import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {AdvanceToNextPhase, BattlePhase} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurn} from "../../squaddie/turn";
import {BANNER_ANIMATION_TIME, BattlePhaseController, BattlePhaseState} from "./battlePhaseController";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleCamera} from "../battleCamera";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieResource} from "../../squaddie/resource";

describe('BattlePhaseController', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let battlePhaseController: BattlePhaseController;
    let playerSquaddieTeam: BattleSquaddieTeam;
    let enemySquaddieTeam: BattleSquaddieTeam;
    let resourceHandler: ResourceHandler;
    let diffTime: number;
    let state: BattleOrchestratorState;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let teamsByAffiliation: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam };

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepo = new BattleSquaddieRepository();

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
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
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "player_squaddie_0",
                staticSquaddieId: "player_squaddie",
                squaddieTurn: new SquaddieTurn(),
                mapIcon: mocks.mockImageUI(),
            })
        );

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
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
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "enemy_squaddie_0",
                staticSquaddieId: "enemy_squaddie",
                squaddieTurn: new SquaddieTurn(),
                mapIcon: mocks.mockImageUI(),
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

        teamsByAffiliation = {
            [SquaddieAffiliation.PLAYER]: playerSquaddieTeam,
            [SquaddieAffiliation.ENEMY]: enemySquaddieTeam,
        };

        diffTime = 100;

        resourceHandler = new (<new (options: any) => ResourceHandler>ResourceHandler)({}) as jest.Mocked<ResourceHandler>;
        resourceHandler.getResource = jest.fn().mockReturnValue(makeResult("Hi"));

        state = new BattleOrchestratorState({
            squaddieRepo,
            battlePhaseState: {
                currentAffiliation: BattlePhase.UNKNOWN,
                turnCount: 0,
            },
            resourceHandler,
            teamsByAffiliation,
        });

        battlePhaseController = new BattlePhaseController();
        battlePhaseController.draw = jest.fn();
    });

    it('does nothing and finishes immediately if team has not finished their turn', () => {
        state.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };
        AdvanceToNextPhase(state.battlePhaseState, teamsByAffiliation);
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(battlePhaseController.draw).not.toBeCalled();
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
    });

    it('starts showing the player phase banner by default', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepo,
            resourceHandler,
            teamsByAffiliation,
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        state.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(state.battlePhaseState.turnCount).toBe(1);
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(startTime);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME + diffTime);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
    });

    it('stops the camera when it displays the banner', () => {
        const camera: BattleCamera = new BattleCamera();
        camera.setXVelocity(-100);
        camera.setYVelocity(-100);

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepo,
            resourceHandler,
            teamsByAffiliation,
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();

        expect(state.camera.getVelocity()).toStrictEqual([0, 0]);
    });

    it('starts the animation and completes if team has finished their turns', () => {
        state.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        AdvanceToNextPhase(state.battlePhaseState, teamsByAffiliation);
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);

        const {dynamicSquaddie: dynamicSquaddie0} = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicId("player_squaddie_0"));
        dynamicSquaddie0.endTurn();

        const startTime = 100;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);
        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.ENEMY);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME + diffTime);
        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.ENEMY);
    });

    it('only draws the banner while the timer is going', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepo,
            resourceHandler,
            teamsByAffiliation,
        });
        battlePhaseController = new BattlePhaseController();
        battlePhaseController.draw = jest.fn();

        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.draw).not.toBeCalled();
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(startTime);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME * 0.5);
        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.draw).toBeCalledTimes(1);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME * 0.75);
        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.draw).toBeCalledTimes(2);
    });

    it('resets internal variables once completed', () => {
        battlePhaseController = new BattlePhaseController();
        battlePhaseController.affiliationImageUI = mocks.mockImageUI();

        expect(battlePhaseController.affiliationImageUI).toBeTruthy();
        battlePhaseController.reset(new BattleOrchestratorState({}));
        expect(battlePhaseController.affiliationImageUI).toBeFalsy();
    });

    it('restores team squaddie turns once the banner appears starts', () => {
        const {dynamicSquaddie: dynamicSquaddie0} = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicId("player_squaddie_0"));
        dynamicSquaddie0.endTurn();
        expect(dynamicSquaddie0.canStillActThisRound()).toBeFalsy();

        const phase: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepo,
            resourceHandler,
            battlePhaseState: phase,
            teamsByAffiliation,
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;

        jest.spyOn(Date, 'now').mockImplementation(() => startTime);
        battlePhaseController.update(state, mockedP5GraphicsContext);

        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(phase.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(dynamicSquaddie0.canStillActThisRound()).toBeTruthy();
    });
});
