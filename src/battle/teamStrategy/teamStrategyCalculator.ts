import {squaddieDecisionsDuringThisPhase} from "../history/squaddieDecisionsDuringThisPhase";
import {TeamStrategyState} from "./teamStrategyState";
import {ObjectRepository} from "../objectRepository";

export interface TeamStrategyCalculator {
    DetermineNextInstruction(state: TeamStrategyState, squaddieRepository: ObjectRepository): squaddieDecisionsDuringThisPhase | undefined;
}

