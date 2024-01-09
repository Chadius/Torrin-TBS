import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../decision/actionEffectSquaddieTemplate";
import {ACTION_PERFORM_FAILURE_REASON, SquaddieTurn, SquaddieTurnService} from "./turn";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";

describe('Squaddie turn and resources', () => {
    describe('actions', () => {
        let turn: SquaddieTurn;
        let actionSpends2ActionPoints: ActionEffectSquaddieTemplate;
        beforeEach(() => {
            turn = SquaddieTurnService.new();
            actionSpends2ActionPoints = ActionEffectSquaddieTemplateService.new({
                id: "actionSpends2ActionPoints",
                name: "Power Attack",
                actionPointCost: 2,
                traits: TraitStatusStorageHelper.newUsingTraitValues({[Trait.ATTACK]: true}),
            })
        })

        it('should start with 3 action points', () => {
            expect(turn.remainingActionPoints).toBe(3);
        });
        it('should spend 1 action by default', () => {
            SquaddieTurnService.spendActionPointsOnActionTemplate(turn,
                ActionEffectSquaddieTemplateService.new({
                    id: "strike",
                    name: "longsword",
                    traits: TraitStatusStorageHelper.newUsingTraitValues({[Trait.ATTACK]: true}),
                })
            );
            expect(turn.remainingActionPoints).toBe(2);
        });
        it('should spend multiple actions if action uses more', () => {
            SquaddieTurnService.spendActionPointsOnActionTemplate(turn, actionSpends2ActionPoints);
            expect(turn.remainingActionPoints).toBe(1);
        });
        it('should report when an action cannot be spent', () => {
            SquaddieTurnService.spendActionPointsOnActionTemplate(turn, actionSpends2ActionPoints);
            const query = SquaddieTurnService.canPerformAction(turn, actionSpends2ActionPoints);
            expect(query.canPerform).toBeFalsy();
            expect(query.reason).toBe(ACTION_PERFORM_FAILURE_REASON.TOO_FEW_ACTIONS_REMAINING);
        });
        it('should give 3 action points upon starting a new round', () => {
            SquaddieTurnService.spendActionPointsOnActionTemplate(turn, actionSpends2ActionPoints);
            SquaddieTurnService.beginNewRound(turn);
            expect(turn.remainingActionPoints).toBe(3);
        });
        it('can spend arbitrary number of action points', () => {
            SquaddieTurnService.beginNewRound(turn);
            SquaddieTurnService.spendActionPoints(turn, 1);
            expect(turn.remainingActionPoints).toBe(2);
        });
        it('knows when it is out of action points', () => {
            expect(SquaddieTurnService.hasActionPointsRemaining(turn)).toBeTruthy();
            SquaddieTurnService.spendActionPoints(turn, 3);
            expect(SquaddieTurnService.hasActionPointsRemaining(turn)).toBeFalsy();
            SquaddieTurnService.beginNewRound(turn);
            expect(SquaddieTurnService.hasActionPointsRemaining(turn)).toBeTruthy();
        });
        it('can end its turn', () => {
            SquaddieTurnService.endTurn(turn);
            expect(SquaddieTurnService.hasActionPointsRemaining(turn)).toBeFalsy();
        });
    });
});
