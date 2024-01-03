export const DIE_SIZE = 6;

export interface RollResult {
    occurred: boolean;
    rolls: number[];
}

export const RollResultService = {
    new: ({rolls, occurred}: { rolls?: number[], occurred?: boolean }): RollResult => {
        return sanitize({
            rolls,
            occurred,
        });
    },
    sanitize: (rollResult: RollResult): RollResult => {
        return sanitize(rollResult);
    },
    isACriticalSuccess: (rollResult: RollResult) => {
        let totalAttackRoll = rollResult.rolls.reduce((currentSum, currentValue) => currentSum + currentValue, 0);
        return (totalAttackRoll >= DIE_SIZE * 2);
    },
    isACriticalFailure: (rollResult: RollResult) => {
        let totalAttackRoll = rollResult.rolls.reduce((currentSum, currentValue) => currentSum + currentValue, 0);
        return (totalAttackRoll <= 2);
    },
    totalAttackRoll: (rollResult: RollResult) => {
        return rollResult.rolls.reduce((currentSum, currentValue) => currentSum + currentValue, 0);
    }
}

const sanitize = (rollResult: RollResult): RollResult => {
    rollResult.occurred = rollResult.rolls && rollResult.rolls.length > 0;
    rollResult.rolls = rollResult.rolls && rollResult.rolls.length > 0 ? rollResult.rolls : [];
    return rollResult;
}
