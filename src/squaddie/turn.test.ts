import {SquaddieActivity} from "./activity";
import {ACTIVITY_PERFORM_FAILURE_REASON, SquaddieTurn} from "./turn";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";

describe('Squaddie turn and resources', () => {
    describe('actions', () => {
        let turn: SquaddieTurn;
        let activitySpends2Actions: SquaddieActivity;
        beforeEach(() => {
            turn = new SquaddieTurn();
            activitySpends2Actions = new SquaddieActivity({
                id: "activitySpends2Actions",
                name: "Power Attack",
                actionsToSpend: 2,
                traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY)
            })
        })

        it('should start with 3 actions', () => {
            expect(turn.remainingNumberOfActions).toBe(3);
        });
        it('should spend 1 action by default', () => {
            turn.spendActionsOnActivity(
                new SquaddieActivity({
                    id: "strike",
                    name: "longsword",
                    traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY)
                })
            );
            expect(turn.remainingNumberOfActions).toBe(2);
        });
        it('should spend multiple actions if activity uses more', () => {
            turn.spendActionsOnActivity(activitySpends2Actions);
            expect(turn.remainingNumberOfActions).toBe(1);
        });
        it('should report when an activity cannot be spent', () => {
            turn.spendActionsOnActivity(activitySpends2Actions);
            const query = turn.canPerformActivity(activitySpends2Actions);
            expect(query.canPerform).toBeFalsy();
            expect(query.reason).toBe(ACTIVITY_PERFORM_FAILURE_REASON.TOO_FEW_ACTIONS_REMAINING);
        });
        it('should give 3 actions upon starting a new round', () => {
            turn.spendActionsOnActivity(activitySpends2Actions);
            turn.beginNewRound();
            expect(turn.remainingNumberOfActions).toBe(3);
        });
        it('can spend arbitrary number of actions', () => {
            turn.beginNewRound();
            turn.spendNumberActions(1);
            expect(turn.remainingNumberOfActions).toBe(2);
        });
        it('knows when it is out of actions', () => {
            expect(turn.hasActionsRemaining()).toBeTruthy();
            turn.spendNumberActions(3);
            expect(turn.hasActionsRemaining()).toBeFalsy();
            turn.beginNewRound();
            expect(turn.hasActionsRemaining()).toBeTruthy();
        });
        it('can end its turn', () => {
            turn.endTurn();
            expect(turn.hasActionsRemaining()).toBeFalsy();
        });
    });
});
