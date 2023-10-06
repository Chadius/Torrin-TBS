import {SquaddieAction} from "./action";
import {ACTION_PERFORM_FAILURE_REASON, SquaddieTurn} from "./turn";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";

describe('Squaddie turn and resources', () => {
    describe('actions', () => {
        let turn: SquaddieTurn;
        let actionSpends2ActionPoints: SquaddieAction;
        beforeEach(() => {
            turn = new SquaddieTurn();
            actionSpends2ActionPoints = new SquaddieAction({
                id: "actionSpends2ActionPoints",
                name: "Power Attack",
                actionPointCost: 2,
                traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTION)
            })
        })

        it('should start with 3 action points', () => {
            expect(turn.remainingActionPoints).toBe(3);
        });
        it('should spend 1 action by default', () => {
            turn.spendActionPointsOnAction(
                new SquaddieAction({
                    id: "strike",
                    name: "longsword",
                    traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTION)
                })
            );
            expect(turn.remainingActionPoints).toBe(2);
        });
        it('should spend multiple actions if action uses more', () => {
            turn.spendActionPointsOnAction(actionSpends2ActionPoints);
            expect(turn.remainingActionPoints).toBe(1);
        });
        it('should report when an action cannot be spent', () => {
            turn.spendActionPointsOnAction(actionSpends2ActionPoints);
            const query = turn.canPerformAction(actionSpends2ActionPoints);
            expect(query.canPerform).toBeFalsy();
            expect(query.reason).toBe(ACTION_PERFORM_FAILURE_REASON.TOO_FEW_ACTIONS_REMAINING);
        });
        it('should give 3 action points upon starting a new round', () => {
            turn.spendActionPointsOnAction(actionSpends2ActionPoints);
            turn.beginNewRound();
            expect(turn.remainingActionPoints).toBe(3);
        });
        it('can spend arbitrary number of action points', () => {
            turn.beginNewRound();
            turn.spendActionPoints(1);
            expect(turn.remainingActionPoints).toBe(2);
        });
        it('knows when it is out of action points', () => {
            expect(turn.hasActionPointsRemaining()).toBeTruthy();
            turn.spendActionPoints(3);
            expect(turn.hasActionPointsRemaining()).toBeFalsy();
            turn.beginNewRound();
            expect(turn.hasActionPointsRemaining()).toBeTruthy();
        });
        it('can end its turn', () => {
            turn.endTurn();
            expect(turn.hasActionPointsRemaining()).toBeFalsy();
        });
    });
});
