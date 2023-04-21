import {BattleMissionLoader} from "./battleMissionLoader";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {ResourceHandler} from "../../resource/resourceHandler";
import {stubImmediateLoader} from "../../resource/resourceHandlerTestUtils";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";

describe('BattleMissionLoader', () => {
    let initialState: OrchestratorState;
    let mockResourceHandler: ResourceHandler;

    beforeEach(() => {
        mockResourceHandler = new (
            <new (options: any) => ResourceHandler>ResourceHandler
        )({
            imageLoader: new stubImmediateLoader(),
        }) as jest.Mocked<ResourceHandler>;
        mockResourceHandler.loadResources = jest.fn();
        mockResourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);

        initialState = new OrchestratorState({
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

        loader.reset();
        expect(loader.startedLoading).toBeFalsy();
        expect(loader.finishedPreparations).toBeFalsy();
    });
});