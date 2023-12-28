import {SquaddieInstructionInProgress, SquaddieInstructionInProgressHandler} from "./squaddieInstructionInProgress";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "./squaddieActionsForThisRound";
import {SquaddieActionType} from "./anySquaddieAction";
import {SquaddieSquaddieActionService} from "../../squaddie/action";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {DamageType} from "../../squaddie/squaddieService";

const longswordAction = SquaddieSquaddieActionService.new({
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
            squaddieActionsForThisRound: {
                battleSquaddieId: "battleSquaddieId",
                squaddieTemplateId: "templateId",
                startingLocation: {q: 1, r: 1},
                actions: [],
            },
            currentlySelectedAction: longswordAction,
        };

        SquaddieInstructionInProgressHandler.cancelSelectedAction(squaddieCurrentlyActing);
        expect(SquaddieInstructionInProgressHandler.squaddieHasActedThisTurn(squaddieCurrentlyActing)).toBeFalsy();
        expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(squaddieCurrentlyActing)).toBeTruthy();
    });

    it('will indicate the squaddie has acted this round if they cancel after acting', () => {
        const longswordUsedThisRoundAction: SquaddieActionsForThisRound = {
            battleSquaddieId: "battleSquaddieId",
            squaddieTemplateId: "templateId",
            startingLocation: {q: 1, r: 1},
            actions: [],
        };

        SquaddieActionsForThisRoundHandler.addAction(longswordUsedThisRoundAction, {
            type: SquaddieActionType.SQUADDIE,
            squaddieAction: longswordAction,
            targetLocation: {q: 0, r: 0},
            numberOfActionPointsSpent: 1,
        });

        const squaddieCurrentlyActing: SquaddieInstructionInProgress = {
            squaddieActionsForThisRound: longswordUsedThisRoundAction,
            currentlySelectedAction: longswordAction,
            movingBattleSquaddieIds: [],
        };

        SquaddieInstructionInProgressHandler.cancelSelectedAction(squaddieCurrentlyActing);
        expect(SquaddieInstructionInProgressHandler.squaddieHasActedThisTurn(squaddieCurrentlyActing)).toBeTruthy();
        expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(squaddieCurrentlyActing)).toBeFalsy();
    });
});
