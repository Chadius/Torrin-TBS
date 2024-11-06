import {
    TeamStrategyCalculator,
    TeamStrategyService,
} from "./teamStrategyCalculator"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { isValidValue } from "../../utils/validityCheck"
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
    }): BattleActionDecisionStep[] {
        const battleSquaddieIdToAct =
            TeamStrategyService.getBattleSquaddieWhoCanAct(
                team,
                gameEngineState.repository
            )
        if (!isValidValue(battleSquaddieIdToAct)) {
            return undefined
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
