import {ActionResultPerSquaddie} from "./actionResultPerSquaddie";

describe('Action Result Per Squaddie', () => {
    it('Can make from data', () => {
        const result: ActionResultPerSquaddie = {
            damageTaken: 1,
            healingReceived: 4,
        };

        expect(result.damageTaken).toBe(1);
        expect(result.healingReceived).toBe(4);
    });
});
