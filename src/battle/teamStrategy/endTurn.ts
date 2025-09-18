import {
    TeamStrategyBehaviorOverride,
    TeamStrategyCalculator,
    TeamStrategyService,
} from "./teamStrategyCalculator"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { GameEngineState } from "../../gameEngine/gameEngine"

export class EndTurnTeamStrategy implements TeamStrategyCalculator {
    DetermineNextInstruction({
        team,
        gameEngineState,
    }: {
        team: BattleSquaddieTeam
        gameEngineState: GameEngineState
        behaviorOverrides: TeamStrategyBehaviorOverride
    }): BattleActionDecisionStep[] {
        if (gameEngineState.repository == undefined) return []
        const battleSquaddieIdToAct =
            TeamStrategyService.getBattleSquaddieWhoCanAct(
                team,
                gameEngineState.repository
            )
        if (battleSquaddieIdToAct == undefined) {
            return []
        }

        const endTurnStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: endTurnStep,
            battleSquaddieId: battleSquaddieIdToAct,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: endTurnStep,
            endTurn: true,
        })

        return [endTurnStep]
    }
}
