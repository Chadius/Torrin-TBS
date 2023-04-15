import {BattleOrchestratorMode, Orchestrator} from "./orchestrator";
import {BattleMissionLoader} from "../battleMissionLoader";
import {BattleResourceLoader} from "../battleResourceLoader";
import {OrchestratorState} from "./orchestratorState";
import {BattleCutscenePlayer} from "../battleCutscenePlayer";
import {BattleSquaddieSelector} from "../BattleSquaddieSelector";
import {BattleSquaddieMover} from "../battleSquaddieMover";

describe('Battle Orchestrator', () => {
    type OrchestratorTestOptions = {
        missionLoader: BattleMissionLoader;
        resourceLoader: BattleResourceLoader;
        cutscenePlayer: BattleCutscenePlayer;
        squaddieSelector: BattleSquaddieSelector;
        squaddieMover: BattleSquaddieMover;

        initialMode: BattleOrchestratorMode;
    }

    let orchestrator: Orchestrator;

    let mockBattleMissionLoader: BattleMissionLoader;
    let mockBattleResourceLoader: BattleResourceLoader;
    let mockBattleCutscenePlayer: BattleCutscenePlayer;
    let mockSquaddieSelector: BattleSquaddieSelector;
    let mockSquaddieMover: BattleSquaddieMover;

    let nullState: OrchestratorState;

    beforeEach(() => {
        nullState = new OrchestratorState();

        mockBattleMissionLoader = {
            update: jest.fn(),
            mouseEventHappened: jest.fn(),
            hasCompleted: jest.fn().mockReturnValue(true),
        };
        mockBattleResourceLoader = {
            update: jest.fn(),
            mouseEventHappened: jest.fn(),
            hasCompleted: jest.fn().mockReturnValue(true),
        };
        mockBattleCutscenePlayer = {
            update: jest.fn(),
            mouseEventHappened: jest.fn(),
            hasCompleted: jest.fn().mockReturnValue(true),
        };
        mockSquaddieSelector = {
            update: jest.fn(),
            mouseEventHappened: jest.fn(),
            hasCompleted: jest.fn().mockReturnValue(true),
        };
        mockSquaddieMover = {
            update: jest.fn(),
            mouseEventHappened: jest.fn(),
            hasCompleted: jest.fn().mockReturnValue(true),
        };
    });

    const createOrchestrator:(overrides: Partial<OrchestratorTestOptions>) => Orchestrator = (overrides: Partial<OrchestratorTestOptions> = {}) => {
        const orchestrator: Orchestrator = new Orchestrator({
            ...{
                missionLoader: mockBattleMissionLoader,
                resourceLoader: mockBattleResourceLoader,
                cutscenePlayer: mockBattleCutscenePlayer,
                squaddieSelector: mockSquaddieSelector,
                squaddieMover: mockSquaddieMover,
            },
            ...overrides
        })

        switch(overrides.initialMode) {
            case BattleOrchestratorMode.LOADING_MISSION:
                orchestrator.update(nullState);
                break;
            case BattleOrchestratorMode.LOADING_RESOURCES:
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                break;
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                break;
            case BattleOrchestratorMode.SQUADDIE_SELECTOR:
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                break;
            case BattleOrchestratorMode.SQUADDIE_MOVER:
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                break;
            default:
                break;
        }

        return orchestrator;
    }

    it('starts in mission loading mode', () => {
        orchestrator = createOrchestrator({missionLoader: mockBattleMissionLoader});
        orchestrator.update(nullState);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.LOADING_MISSION);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleMissionLoader);
    });

    it('waits for mission to complete loading before moving on to loading resources', () => {
        const needsTwoUpdatesToFinishLoading = {
            hasCompleted: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true),
            update: jest.fn(),
            mouseEventHappened: jest.fn(),
        };

        orchestrator = createOrchestrator({
            missionLoader: needsTwoUpdatesToFinishLoading,
            initialMode: BattleOrchestratorMode.LOADING_MISSION,
        });
        orchestrator.update(nullState);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.LOADING_MISSION);
        expect(orchestrator.getCurrentComponent()).toBe(needsTwoUpdatesToFinishLoading);
        orchestrator.update(nullState);
        expect(needsTwoUpdatesToFinishLoading.update).toBeCalledTimes(2);
        expect(needsTwoUpdatesToFinishLoading.hasCompleted).toBeCalledTimes(2);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.LOADING_RESOURCES);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleResourceLoader);
    });

    // it('will call the battle drawing system if the state says so', () => {});

    it('after loading the resources it goes to the cutscene playing mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.LOADING_RESOURCES,
        });
        orchestrator.update(nullState);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleCutscenePlayer);
        orchestrator.update(nullState);
        expect(mockBattleCutscenePlayer.update).toBeCalledTimes(1);
        expect(mockBattleCutscenePlayer.hasCompleted).toBeCalledTimes(1);
    });

    it('will transition from cutscene playing to squaddie selector mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.CUTSCENE_PLAYER,
        });
        orchestrator.update(nullState);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_SELECTOR);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieSelector);
        orchestrator.update(nullState);
        expect(mockSquaddieSelector.update).toBeCalledTimes(1);
        expect(mockSquaddieSelector.hasCompleted).toBeCalledTimes(1);
    });

    it('will move from squaddie selector mode to squaddie move mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_SELECTOR,
        });
        orchestrator.update(nullState);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieMover);
        orchestrator.update(nullState);
        expect(mockSquaddieMover.update).toBeCalledTimes(1);
        expect(mockSquaddieMover.hasCompleted).toBeCalledTimes(1);
    });

    it('will move from squaddie move mode to squaddie selector mode', () => {
        orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.SQUADDIE_MOVER,
        });
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
        expect(mockSquaddieSelector.update).toBeCalledTimes(1);
        expect(mockSquaddieSelector.hasCompleted).toBeCalledTimes(1);
        orchestrator.update(nullState);
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.SQUADDIE_SELECTOR);
        expect(orchestrator.getCurrentComponent()).toBe(mockSquaddieSelector);
        orchestrator.update(nullState);
        expect(mockSquaddieSelector.update).toBeCalledTimes(2);
        expect(mockSquaddieSelector.hasCompleted).toBeCalledTimes(2);
    });
});