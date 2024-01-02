import {ActionResultPerSquaddie, ActionResultPerSquaddieService, DegreeOfSuccess} from "./actionResultPerSquaddie";

describe('ActionResultPerSquaddie', () => {
    describe('knows when the result hinders the squaddie', () => {
        it('knows when the target is not hindered', () => {
            const result: ActionResultPerSquaddie = ActionResultPerSquaddieService.new({
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                damageTaken: 0,
            });

            expect(ActionResultPerSquaddieService.isSquaddieHindered(result)).toBeFalsy();
        });
        it('knows when the target took damage', () => {
            const result: ActionResultPerSquaddie = ActionResultPerSquaddieService.new({
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                damageTaken: 1,
            });

            expect(ActionResultPerSquaddieService.isSquaddieHindered(result)).toBeTruthy();
        });
    })
    describe('knows when the result helps the squaddie', () => {
        it('knows when the target is not helped', () => {
            const result: ActionResultPerSquaddie = ActionResultPerSquaddieService.new({
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                healingReceived: 0,
            });

            expect(ActionResultPerSquaddieService.isSquaddieHelped(result)).toBeFalsy();
        });
        it('knows when the target received healing', () => {
            const result: ActionResultPerSquaddie = ActionResultPerSquaddieService.new({
                actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                healingReceived: 1,
            });

            expect(ActionResultPerSquaddieService.isSquaddieHelped(result)).toBeTruthy();
        });
    })
})
