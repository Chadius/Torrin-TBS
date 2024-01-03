import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../squaddie/action";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {ATTACK_MODIFIER} from "../modifierConstants";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {ActionResultText} from "./actionAnimation/actionResultText";
import {DegreeOfSuccess, DegreeOfSuccessService} from "../actionCalculator/degreeOfSuccess";
import {ActionTimer} from "./actionAnimation/actionTimer";
import {ActionAnimationPhase} from "./actionAnimation/actionAnimationConstants";
import {RollResultService} from "../actionCalculator/rollResult";
import {ActionResultPerSquaddie} from "../history/actionResultPerSquaddie";
import {BattleSquaddie} from "../battleSquaddie";

export const ActionResultTextService = {
    outputResultForTextOnly: ({currentAction, result, squaddieRepository}: {
        currentAction: SquaddieSquaddieAction,
        result: SquaddieSquaddieResults,
        squaddieRepository: ObjectRepository,
    }): string[] => {
        return outputResultForTextOnly({currentAction, result, squaddieRepository});
    },
    outputIntentForTextOnly: ({currentAction, actingBattleSquaddieId, squaddieRepository, actingSquaddieModifiers}: {
        currentAction: SquaddieSquaddieAction,
        actingBattleSquaddieId: string,
        squaddieRepository: ObjectRepository,
        actingSquaddieModifiers: { [modifier in ATTACK_MODIFIER]?: number },
    }): string[] => {
        return outputIntentForTextOnly({
            currentAction,
            actingBattleSquaddieId,
            squaddieRepository,
            actingSquaddieModifiers
        });
    },
    getSquaddieUsesActionString: ({squaddieTemplate, action, newline}: {
        squaddieTemplate: SquaddieTemplate,
        action: SquaddieSquaddieAction,
        newline: boolean
    }): string => {
        return `${squaddieTemplate.squaddieId.name} uses${newline ? '\n' : ' '}${action.name}`;
    },
    getRollsDescriptionString: ({rolls, addSpacing}: { rolls: number[], addSpacing: boolean }): string => {
        return `${addSpacing ? '   ' : ''}rolls (${rolls[0]}, ${rolls[1]})`;
    },
    getHinderingActionMissedString: ({squaddieTemplate}: { squaddieTemplate: SquaddieTemplate }): string => {
        return `${squaddieTemplate.squaddieId.name}: MISS!`;
    },
    getHinderingActionCriticallyMissedString: ({squaddieTemplate}: { squaddieTemplate: SquaddieTemplate }): string => {
        return `${squaddieTemplate.squaddieId.name}: CRITICAL MISS!!`;
    },
    getHinderingActionDealtNoDamageString: ({squaddieTemplate}: { squaddieTemplate: SquaddieTemplate }): string => {
        return `${squaddieTemplate.squaddieId.name}: NO DAMAGE`;
    },
    getHinderingActionDealtDamageString: ({squaddieTemplate, damageTaken}: {
        squaddieTemplate: SquaddieTemplate,
        damageTaken: number
    }): string => {
        return `${squaddieTemplate.squaddieId.name} takes ${damageTaken} damage`;
    },
    getHinderingActionDealtCriticalDamageString: ({squaddieTemplate, damageTaken}: {
        squaddieTemplate: SquaddieTemplate,
        damageTaken: number
    }): string => {
        return `${squaddieTemplate.squaddieId.name}: CRITICAL HIT! ${damageTaken} damage`;
    },
    getHelpfulActionHealingReceivedString({squaddieTemplate, healingReceived}: {
        squaddieTemplate: SquaddieTemplate;
        healingReceived: number
    }): string {
        return `${squaddieTemplate.squaddieId.name} receives ${healingReceived} healing`;
    },
    calculateActorUsesActionDescriptionText: ({
                                                  timer,
                                                  actorTemplate,
                                                  action,
                                                  results,
                                              }: {
        timer?: ActionTimer
        actorTemplate: SquaddieTemplate,
        action: SquaddieSquaddieAction,
        results: SquaddieSquaddieResults,
    }): string => {
        let actorUsesActionDescriptionText = ActionResultTextService.getSquaddieUsesActionString({
            squaddieTemplate: actorTemplate,
            action: action,
            newline: true,
        });
        if (!timer) {
            return actorUsesActionDescriptionText;
        }
        if ([
                ActionAnimationPhase.DURING_ACTION,
                ActionAnimationPhase.TARGET_REACTS,
                ActionAnimationPhase.SHOWING_RESULTS,
                ActionAnimationPhase.FINISHED_SHOWING_RESULTS,
            ].includes(timer.currentPhase)
            && results.actingSquaddieRoll.occurred
        ) {
            actorUsesActionDescriptionText += `\n\n`;
            actorUsesActionDescriptionText += `   rolls(${results.actingSquaddieRoll.rolls[0]}, ${results.actingSquaddieRoll.rolls[1]})`;


            const attackPenaltyDescriptions = ActionResultText.getAttackPenaltyDescriptions(results.actingSquaddieModifiers);
            if (attackPenaltyDescriptions.length > 0) {
                actorUsesActionDescriptionText += "\n" + attackPenaltyDescriptions.join("\n");
            }

            actorUsesActionDescriptionText += `\n${ActionResultText.getActingSquaddieRollTotalIfNeeded(results)}`;

            if (RollResultService.isACriticalSuccess(results.actingSquaddieRoll)) {
                actorUsesActionDescriptionText += `\n\nCRITICAL HIT!`;
            }
            if (RollResultService.isACriticalFailure(results.actingSquaddieRoll)) {
                actorUsesActionDescriptionText += `\n\nCRITICAL MISS!!`;
            }
        }
        return actorUsesActionDescriptionText;
    },
    getBeforeActionText: ({
                              targetTemplate, targetBattle, action
                          }: {
        targetTemplate: SquaddieTemplate,
        targetBattle: BattleSquaddie,
        action: SquaddieSquaddieAction,
    }): string => {
        let targetBeforeActionText = `${targetTemplate.squaddieId.name}`;

        if (SquaddieSquaddieActionService.isHindering(action)) {
            targetBeforeActionText += `\nAC ${targetBattle.inBattleAttributes.armyAttributes.armorClass}`;
        }

        return targetBeforeActionText;
    },
    getAfterActionText: ({
                             result
                         }: {
        result: ActionResultPerSquaddie
    }): string => {
        let targetAfterActionText = "";

        switch (result.actorDegreeOfSuccess) {
            case DegreeOfSuccess.FAILURE:
                targetAfterActionText = `MISS`;
                break;
            case DegreeOfSuccess.CRITICAL_SUCCESS:
                let damageText = 'CRITICAL HIT!\n';
                if (result.damageTaken === 0 && result.healingReceived === 0) {
                    damageText += `NO DAMAGE`;
                } else if (result.damageTaken > 0) {
                    damageText += `${result.damageTaken} damage`;
                }
                targetAfterActionText = damageText;
                break;
            case DegreeOfSuccess.CRITICAL_FAILURE:
                targetAfterActionText = `CRITICAL MISS!!`;
                break;
            case DegreeOfSuccess.SUCCESS:
                if (result.damageTaken === 0 && result.healingReceived === 0) {
                    targetAfterActionText = `NO DAMAGE`;
                } else if (result.damageTaken > 0) {
                    targetAfterActionText = `${result.damageTaken} damage`;
                }
                break;
            default:
                break;
        }

        if (result.healingReceived > 0) {
            targetAfterActionText += `${result.healingReceived} healed`;
        }

        return targetAfterActionText;
    }
};

const outputResultForTextOnly = ({currentAction, result, squaddieRepository}: {
    currentAction: SquaddieSquaddieAction,
    result: SquaddieSquaddieResults,
    squaddieRepository: ObjectRepository,
}): string[] => {
    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, result.actingBattleSquaddieId))

    let output: string[] = [];
    let actorUsesActionDescriptionText = ActionResultTextService.getSquaddieUsesActionString({
        squaddieTemplate: actingSquaddieTemplate,
        action: currentAction,
        newline: false,
    });
    output.push(actorUsesActionDescriptionText);

    if (result.actingSquaddieRoll.occurred) {
        output.push(ActionResultTextService.getRollsDescriptionString({
            rolls: result.actingSquaddieRoll.rolls,
            addSpacing: true
        }));

        if (
            TraitStatusStorageHelper.getStatus(currentAction.traits, Trait.ATTACK) === true
            && TraitStatusStorageHelper.getStatus(currentAction.traits, Trait.ALWAYS_SUCCEEDS) !== true
        ) {
            output.push(...ActionResultText.getAttackPenaltyDescriptions(result.actingSquaddieModifiers));
            output.push(...ActionResultText.getActingSquaddieRollTotalIfNeeded(result));
        }
    }

    result.targetedBattleSquaddieIds.forEach((targetSquaddieId: string) => {
        const {squaddieTemplate: targetSquaddieTemplate} = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, targetSquaddieId));
        const resultPerTarget = result.resultPerTarget[targetSquaddieId];

        if (SquaddieSquaddieActionService.isHindering(currentAction)) {
            if (DegreeOfSuccessService.atBestFailure(resultPerTarget.actorDegreeOfSuccess)) {
                if (resultPerTarget.actorDegreeOfSuccess === DegreeOfSuccess.FAILURE) {
                    output.push(ActionResultTextService.getHinderingActionMissedString({squaddieTemplate: targetSquaddieTemplate}));
                } else {
                    output.push(ActionResultTextService.getHinderingActionCriticallyMissedString({squaddieTemplate: targetSquaddieTemplate}));
                }
            } else if (resultPerTarget.damageTaken === 0) {
                output.push(ActionResultTextService.getHinderingActionDealtNoDamageString({squaddieTemplate: targetSquaddieTemplate}));
            } else {
                if (resultPerTarget.actorDegreeOfSuccess === DegreeOfSuccess.CRITICAL_SUCCESS) {
                    output.push(ActionResultTextService.getHinderingActionDealtCriticalDamageString({
                        squaddieTemplate: targetSquaddieTemplate,
                        damageTaken: resultPerTarget.damageTaken,
                    }));
                } else {
                    output.push(ActionResultTextService.getHinderingActionDealtDamageString({
                        squaddieTemplate: targetSquaddieTemplate,
                        damageTaken: resultPerTarget.damageTaken,
                    }));
                }
            }
        }
        if (SquaddieSquaddieActionService.isHelpful(currentAction)) {
            output.push(ActionResultTextService.getHelpfulActionHealingReceivedString({
                squaddieTemplate: targetSquaddieTemplate,
                healingReceived: resultPerTarget.healingReceived,
            }));
        }
    });

    return output;
}

const outputIntentForTextOnly = ({currentAction, actingBattleSquaddieId, squaddieRepository, actingSquaddieModifiers}: {
    currentAction: SquaddieSquaddieAction,
    actingBattleSquaddieId: string,
    squaddieRepository: ObjectRepository,
    actingSquaddieModifiers: { [modifier in ATTACK_MODIFIER]?: number },
}): string[] => {
    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, actingBattleSquaddieId))

    let output: string[] = [];
    output.push(`${actingSquaddieTemplate.squaddieId.name} uses ${currentAction.name}`);
    if (
        TraitStatusStorageHelper.getStatus(currentAction.traits, Trait.ATTACK) === true
        && TraitStatusStorageHelper.getStatus(currentAction.traits, Trait.ALWAYS_SUCCEEDS) !== true
    ) {
        output.push(...ActionResultText.getAttackPenaltyDescriptions(actingSquaddieModifiers));
    }

    return output;
}
