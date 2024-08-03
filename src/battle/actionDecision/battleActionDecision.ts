import { BattleActionDecisionStep } from "./battleActionDecisionStep"

export interface BattleActionDecision {
    steps: BattleActionDecisionStep[]
    currentStepIndex: number
}

export const BattleActionDecisionService = {
    new: (): BattleActionDecision => ({
        steps: [],
        currentStepIndex: 0,
    }),
    isEmpty: (decision: BattleActionDecision): boolean => {
        return decision.steps.length === 0
    },
    addStep: (
        decision: BattleActionDecision,
        decisionStep: BattleActionDecisionStep
    ) => {
        decision.steps.push(decisionStep)
    },
    getCurrentStep: (
        decision: BattleActionDecision
    ): BattleActionDecisionStep => {
        return decision.steps[decision.currentStepIndex]
    },
    goToNextStep: (decision: BattleActionDecision) => {
        decision.currentStepIndex += 1
    },
}
