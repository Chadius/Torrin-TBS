export const DIE_SIZE = 6;

export interface RollResult {
    occurred: boolean;
    rolls: number[];
}

export const RollResultHelper = {
    isACriticalSuccess: (rollResult: RollResult) => {
        let totalAttackRoll = rollResult.rolls.reduce((currentSum, currentValue) => currentSum + currentValue, 0);
        return (totalAttackRoll >= DIE_SIZE * 2);
    },
    totalAttackRoll: (rollResult: RollResult) => {
        return rollResult.rolls.reduce((currentSum, currentValue) => currentSum + currentValue, 0);
    }
}
