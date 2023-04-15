import {BattleMissionLoader} from "./battleMissionLoader";
import {OrchestratorState} from "./orchestrator/orchestratorState";
import {ResourceHandler, ResourceType} from "../resource/resourceHandler";
import {stubImmediateLoader} from "../resource/resourceHandlerTestUtils";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";

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
        const loader = new BattleMissionLoader();
        expect(loader.hasCompleted(initialState)).toBeFalsy();
        loader.update(initialState);
        expect(mockResourceHandler.areAllResourcesLoaded).toBeCalled();
        expect(loader.hasCompleted(initialState)).toBeTruthy();
    });
});