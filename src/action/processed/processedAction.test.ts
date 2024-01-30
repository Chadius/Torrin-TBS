import {ProcessedActionService} from "./processedAction";
import {DecidedActionService} from "../decided/decidedAction";

describe('ProcessedAction', () => {
    it('creates default values as needed', () => {
        const action = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                battleSquaddieId: "",
            })
        });
        expect(action.processedActionEffects).toHaveLength(0);
    });
});
