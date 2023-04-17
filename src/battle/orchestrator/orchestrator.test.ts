import {BattleOrchestratorMode, Orchestrator} from "./orchestrator";
import {BattleMissionLoader} from "../orchestratorComponents/battleMissionLoader";
import {OrchestratorState} from "./orchestratorState";
import {BattleCutscenePlayer} from "../orchestratorComponents/battleCutscenePlayer";
import {BattleSquaddieSelector} from "../orchestratorComponents/BattleSquaddieSelector";
import {BattleSquaddieMover} from "../orchestratorComponents/battleSquaddieMover";
import {BattleMapDisplay} from "../orchestratorComponents/battleMapDisplay";

describe('Battle Orchestrator', () => {
    type OrchestratorTestOptions = {
        missionLoader: BattleMissionLoader;
        cutscenePlayer: BattleCutscenePlayer;
        squaddieSelector: BattleSquaddieSelector;
        squaddieMover: BattleSquaddieMover;

        initialMode: BattleOrchestratorMode;
    }

    let orchestrator: Orchestrator;

    let mockBattleMissionLoader: BattleMissionLoader;
    let mockBattleCutscenePlayer: BattleCutscenePlayer;
    let mockSquaddieSelector: BattleSquaddieSelector;
    let mockSquaddieMover: BattleSquaddieMover;
    let mockMapDisplay: BattleMapDisplay;

    let nullState: OrchestratorState;

    beforeEach(() => {
        nullState = new OrchestratorState();

        mockBattleMissionLoader = new (<new () => BattleMissionLoader>BattleMissionLoader)() as jest.Mocked<BattleMissionLoader>;
        mockBattleMissionLoader.update = jest.fn();
        mockBattleMissionLoader.mouseEventHappened = jest.fn();
        mockBattleMissionLoader.hasCompleted = jest.fn().mockReturnValue(true);

        mockBattleCutscenePlayer = new (<new () => BattleCutscenePlayer>BattleCutscenePlayer)() as jest.Mocked<BattleCutscenePlayer>;
        mockBattleCutscenePlayer.update = jest.fn();
        mockBattleCutscenePlayer.mouseEventHappened = jest.fn();
        mockBattleCutscenePlayer.hasCompleted = jest.fn().mockReturnValue(true);

        mockSquaddieSelector = new (<new () => BattleSquaddieSelector>BattleSquaddieSelector)() as jest.Mocked<BattleSquaddieSelector>;
        mockSquaddieSelector.update = jest.fn();
        mockSquaddieSelector.mouseEventHappened = jest.fn();
        mockSquaddieSelector.hasCompleted = jest.fn().mockReturnValue(true);

        mockSquaddieMover = new (<new () => BattleSquaddieMover>BattleSquaddieMover)() as jest.Mocked<BattleSquaddieMover>;
        mockSquaddieMover.update = jest.fn();
        mockSquaddieMover.mouseEventHappened = jest.fn();
        mockSquaddieMover.hasCompleted = jest.fn().mockReturnValue(true);

        mockMapDisplay = new (<new () => BattleMapDisplay>BattleMapDisplay)() as jest.Mocked<BattleMapDisplay>;
        mockMapDisplay.update = jest.fn();
        mockMapDisplay.mouseEventHappened = jest.fn();
        mockMapDisplay.hasCompleted = jest.fn().mockReturnValue(true);
        mockMapDisplay.draw = jest.fn();
    });

    const createOrchestrator:(overrides: Partial<OrchestratorTestOptions>) => Orchestrator = (overrides: Partial<OrchestratorTestOptions> = {}) => {
        const orchestrator: Orchestrator = new Orchestrator({
            ...{
                missionLoader: mockBattleMissionLoader,
                cutscenePlayer: mockBattleCutscenePlayer,
                squaddieSelector: mockSquaddieSelector,
                squaddieMover: mockSquaddieMover,
                mapDisplay: mockMapDisplay,
            },
            ...overrides
        })

        switch(overrides.initialMode) {
            case BattleOrchestratorMode.LOADING_MISSION:
                orchestrator.update(nullState);
                break;
            case BattleOrchestratorMode.CUTSCENE_PLAYER:
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                break;
            case BattleOrchestratorMode.SQUADDIE_SELECTOR:
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                orchestrator.update(nullState);
                break;
            case BattleOrchestratorMode.SQUADDIE_MOVER:
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

    it('waits for mission to complete loading before moving on to cutscene player', () => {
        const needsTwoUpdatesToFinishLoading = new (<new () => BattleMissionLoader>BattleMissionLoader)() as jest.Mocked<BattleMissionLoader>;
        needsTwoUpdatesToFinishLoading.update = jest.fn();
        needsTwoUpdatesToFinishLoading.mouseEventHappened = jest.fn();
        needsTwoUpdatesToFinishLoading.hasCompleted = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);

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
        expect(orchestrator.getCurrentMode()).toBe(BattleOrchestratorMode.CUTSCENE_PLAYER);
        expect(orchestrator.getCurrentComponent()).toBe(mockBattleCutscenePlayer);
    });

    it('will call the battle map display system if not loading', () => {
        const stateWantsToDisplayTheMap: OrchestratorState = new OrchestratorState({
            displayMap: true,
        });

        const loadingOrchestratorShouldNotDraw: Orchestrator = createOrchestrator({
            initialMode: BattleOrchestratorMode.LOADING_MISSION
        });
        loadingOrchestratorShouldNotDraw.update(stateWantsToDisplayTheMap);
        expect(mockMapDisplay.update).not.toBeCalled();

        const squaddieSelectorOrchestratorShouldDisplayMap: Orchestrator = createOrchestrator({
            squaddieSelector: mockSquaddieSelector,
            initialMode: BattleOrchestratorMode.SQUADDIE_SELECTOR,
        });
        expect(mockMapDisplay.update).toBeCalledTimes(1);
        squaddieSelectorOrchestratorShouldDisplayMap.update(stateWantsToDisplayTheMap);
        expect(mockMapDisplay.update).toBeCalledTimes(2);
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