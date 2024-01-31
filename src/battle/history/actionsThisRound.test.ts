import {ActionsThisRoundService} from "./actionsThisRound";

describe('Actions This Round', () => {
    it('can create object with actor Id and starting location', () => {
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: "soldier",
            startingLocation: {q: 0, r: 0},
        });

        expect(actionsThisRound.battleSquaddieId).toEqual("soldier");
        expect(actionsThisRound.startingLocation).toEqual({q:0, r:0});
        expect(actionsThisRound.processedActions).toHaveLength(0);
        expect(actionsThisRound.currentActionTemplateId).toBeUndefined();
    });

    describe('sanitize', () => {
        it('will throw an error if there is no battle squaddie id', () => {
            expect(() => {
                ActionsThisRoundService.new({
                    battleSquaddieId: undefined,
                    startingLocation: {q: 0, r: 0},
                });
            }).toThrow("cannot sanitize");
        });
        it('will throw an error if there is no starting location', () => {
            expect(() => {
                ActionsThisRoundService.new({
                    battleSquaddieId: "soldier",
                    startingLocation: undefined,
                });
            }).toThrow("cannot sanitize");
        });
    });

    describe('can calculate multiple attack penalty', () => {
        it('will not apply MAP when there are no actions', () => {
            const noActionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "soldier",
                startingLocation: {q: 0, r: 0},
            });
            expect(ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(noActionsThisRound)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });

        // it('will not increase MAP if the action is not an attack', () => {});
        // it('will set MAP multiplier to 0 for executing the first attack'
        // it('will not increase MAP if the attack has the trait',
        // it('will set MAP multiplier to 1 for executing the second attack',
        // it('will set MAP multiplier to 2 for executing the third attack',
        // it('will set MAP multiplier to 2 for executing more than 3 attacks',
    });
});
