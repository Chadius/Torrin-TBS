import {TODODELETEMESquaddieDecisionsDuringThisPhase} from "../history/TODODELETEMESquaddieDecisionsDuringThisPhase";
import {TeamStrategyState} from "./teamStrategyState";
import {ObjectRepository} from "../objectRepository";
import {DecidedAction} from "../../action/decided/decidedAction";

export interface TeamStrategyCalculator {
    DetermineNextInstruction(state: TeamStrategyState, squaddieRepository: ObjectRepository): DecidedAction | undefined;
}

