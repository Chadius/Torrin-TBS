import {SquaddieInstructionInProgress, SquaddieInstructionInProgressService} from "./squaddieInstructionInProgress";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundService} from "./squaddieActionsForThisRound";
import {ActionEffectSquaddieTemplateService} from "../../decision/actionEffectSquaddieTemplate";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {DamageType} from "../../squaddie/squaddieService";
import {DecisionService} from "../../decision/decision";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";

const longswordAction = ActionEffectSquaddieTemplateService.new({
    name: "longsword",
    id: "longsword",
    traits: TraitStatusStorageHelper.newUsingTraitValues({
        [Trait.ATTACK]: true,
        [Trait.TARGET_ARMOR]: true,
        [Trait.TARGETS_FOE]: true,
    }),
    minimumRange: 1,
    maximumRange: 1,
    actionPointCost: 1,
    damageDescriptions: {
        [DamageType.BODY]: 2,
    },
});

describe('SquaddieInstructionInProgress', () => {
    it('will indicate the squaddie has not acted this round if they cancel', () => {
        const squaddieCurrentlyActing: SquaddieInstructionInProgress = {
            movingBattleSquaddieIds: [],
            squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battleSquaddieId",
                squaddieTemplateId: "templateId",
                startingLocation: {q: 1, r: 1},
            }),
            currentlySelectedAction: longswordAction,
        };

        SquaddieInstructionInProgressService.cancelSelectedAction(squaddieCurrentlyActing);
        expect(SquaddieInstructionInProgressService.squaddieHasActedThisTurn(squaddieCurrentlyActing)).toBeFalsy();
        expect(SquaddieInstructionInProgressService.isReadyForNewSquaddie(squaddieCurrentlyActing)).toBeTruthy();
    });

    it('will indicate the squaddie has acted this round if they cancel after acting', () => {
        const longswordUsedThisRoundAction: SquaddieActionsForThisRound = SquaddieActionsForThisRoundService.new({
            battleSquaddieId: "battleSquaddieId",
            squaddieTemplateId: "templateId",
            startingLocation: {q: 1, r: 1},
        });

        SquaddieActionsForThisRoundService.addDecision(longswordUsedThisRoundAction,
            DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        effect: longswordAction,
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }));

        const squaddieCurrentlyActing: SquaddieInstructionInProgress = {
            squaddieActionsForThisRound: longswordUsedThisRoundAction,
            currentlySelectedAction: longswordAction,
            movingBattleSquaddieIds: [],
        };

        SquaddieInstructionInProgressService.cancelSelectedAction(squaddieCurrentlyActing);
        expect(SquaddieInstructionInProgressService.squaddieHasActedThisTurn(squaddieCurrentlyActing)).toBeTruthy();
        expect(SquaddieInstructionInProgressService.isReadyForNewSquaddie(squaddieCurrentlyActing)).toBeFalsy();
    });
});
