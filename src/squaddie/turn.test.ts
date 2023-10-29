import {SquaddieAction} from "./action";
import {ACTION_PERFORM_FAILURE_REASON, SquaddieTurn, SquaddieTurnHandler} from "./turn";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";

describe('Squaddie turn and resources', () => {
    describe('actions', () => {
        let turn: SquaddieTurn;
        let actionSpends2ActionPoints: SquaddieAction;
        beforeEach(() => {
            turn = SquaddieTurnHandler.new();
            actionSpends2ActionPoints = new SquaddieAction({
                id: "actionSpends2ActionPoints",
                name: "Power Attack",
                actionPointCost: 2,
                traits: new TraitStatusStorage({initialTraitValues: {[Trait.ATTACK]: true}}).filterCategory(TraitCategory.ACTION)
            })
        })

        it('should start with 3 action points', () => {
            expect(turn.remainingActionPoints).toBe(3);
        });
        it('should spend 1 action by default', () => {
            SquaddieTurnHandler.spendActionPointsOnAction(turn,
                new SquaddieAction({
                    id: "strike",
                    name: "longsword",
                    traits: new TraitStatusStorage({initialTraitValues: {[Trait.ATTACK]: true}}).filterCategory(TraitCategory.ACTION)
                })
            );
            expect(turn.remainingActionPoints).toBe(2);
        });
        it('should spend multiple actions if action uses more', () => {
            SquaddieTurnHandler.spendActionPointsOnAction(turn, actionSpends2ActionPoints);
            expect(turn.remainingActionPoints).toBe(1);
        });
        it('should report when an action cannot be spent', () => {
            SquaddieTurnHandler.spendActionPointsOnAction(turn, actionSpends2ActionPoints);
            const query = SquaddieTurnHandler.canPerformAction(turn, actionSpends2ActionPoints);
            expect(query.canPerform).toBeFalsy();
            expect(query.reason).toBe(ACTION_PERFORM_FAILURE_REASON.TOO_FEW_ACTIONS_REMAINING);
        });
        it('should give 3 action points upon starting a new round', () => {
            SquaddieTurnHandler.spendActionPointsOnAction(turn, actionSpends2ActionPoints);
            SquaddieTurnHandler.beginNewRound(turn);
            expect(turn.remainingActionPoints).toBe(3);
        });
        it('can spend arbitrary number of action points', () => {
            SquaddieTurnHandler.beginNewRound(turn);
            SquaddieTurnHandler.spendActionPoints(turn, 1);
            expect(turn.remainingActionPoints).toBe(2);
        });
        it('knows when it is out of action points', () => {
            expect(SquaddieTurnHandler.hasActionPointsRemaining(turn)).toBeTruthy();
            SquaddieTurnHandler.spendActionPoints(turn, 3);
            expect(SquaddieTurnHandler.hasActionPointsRemaining(turn)).toBeFalsy();
            SquaddieTurnHandler.beginNewRound(turn);
            expect(SquaddieTurnHandler.hasActionPointsRemaining(turn)).toBeTruthy();
        });
        it('can end its turn', () => {
            SquaddieTurnHandler.endTurn(turn);
            expect(SquaddieTurnHandler.hasActionPointsRemaining(turn)).toBeFalsy();
        });
    });
});
