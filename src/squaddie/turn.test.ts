import {Integer} from "../hexMap/hexGrid";
import {SquaddieActivity} from "./activity";
import {ACTIVITY_PERFORM_FAILURE_REASON, SquaddieTurn} from "./turn";

describe('Squaddie turn and resources', () => {
  describe('actions', () => {
    let turn: SquaddieTurn;
    let activitySpends2Actions: SquaddieActivity;
    beforeEach(() => {
      turn = new SquaddieTurn();
      activitySpends2Actions = new SquaddieActivity({
        id: "activitySpends2Actions",
        name: "Power Attack",
        actionsToSpend: 2 as Integer,
      })
    })

    it('should start with 3 actions', () => {
      expect(turn.getRemainingActions()).toBe(3 as Integer);
    });
    it('should spend 1 action by default', () => {
      turn.spendActionsOnActivity(
        new SquaddieActivity({
          id: "strike",
          name: "longsword",
        })
      );
      expect(turn.getRemainingActions()).toBe(2 as Integer);
    });
    it('should spend multiple actions if activity uses more', () => {
      turn.spendActionsOnActivity(activitySpends2Actions);
      expect(turn.getRemainingActions()).toBe(1 as Integer);
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
      expect(turn.getRemainingActions()).toBe(3 as Integer);
    })
  });
});
