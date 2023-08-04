import {BattleMissionLoader} from "./battleMissionLoader";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import * as mocks from "../../utils/test/mocks";

describe('BattleMissionLoader', () => {
    let initialState: BattleOrchestratorState;
    let mockResourceHandler: ResourceHandler;

    beforeEach(() => {
        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);

        initialState = new BattleOrchestratorState({
            resourceHandler: mockResourceHandler,
            squaddieRepo: new BattleSquaddieRepository(),
        });
    });

    it('marks it as done when finished loading resources', () => {
        const initializeSquaddieResources = jest.spyOn(BattleMissionLoader.prototype as any, 'initializeSquaddieResources').mockImplementation(() => {
        });
        const loader = new BattleMissionLoader();
        expect(loader.hasCompleted(initialState)).toBeFalsy();
        loader.update(initialState);
        loader.update(initialState);
        expect(mockResourceHandler.areAllResourcesLoaded).toBeCalledTimes(1);
        expect(loader.hasCompleted(initialState)).toBeFalsy();
        loader.update(initialState);
        expect(mockResourceHandler.areAllResourcesLoaded).toBeCalledTimes(2);
        expect(initializeSquaddieResources).toBeCalled();
        expect(loader.hasCompleted(initialState)).toBeTruthy();
    });

    it('clears internal variables upon reset', () => {
        const initializeSquaddieResources = jest.spyOn(BattleMissionLoader.prototype as any, 'initializeSquaddieResources').mockImplementation(() => {
        });
        const loader = new BattleMissionLoader();
        loader.update(initialState);
        loader.update(initialState);
        loader.update(initialState);
        expect(initializeSquaddieResources).toBeCalled();
        expect(loader.hasCompleted(initialState)).toBeTruthy();
        expect(loader.finishedPreparations).toBeTruthy();
        expect(loader.startedLoading).toBeTruthy();

        loader.reset(new BattleOrchestratorState({}));
        expect(loader.startedLoading).toBeFalsy();
        expect(loader.finishedPreparations).toBeFalsy();
    });
});
