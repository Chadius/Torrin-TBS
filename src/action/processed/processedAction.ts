import {DecidedAction} from "../decided/decidedAction";
import {ProcessedActionEffect} from "./processedActionEffect";
import {getValidValueOrDefault} from "../../utils/validityCheck";

export interface ProcessedAction {
    decidedAction: DecidedAction;
    processedActionEffects: ProcessedActionEffect[];
}

export const ProcessedActionService = {
    new: ({
              decidedAction,
              processedActionEffects,
          }:{
        decidedAction: DecidedAction,
        processedActionEffects?: ProcessedActionEffect[]
    }): ProcessedAction => {
        return sanitize({
            decidedAction,
            processedActionEffects,
        });
    }
}

const sanitize = (processedAction: ProcessedAction): ProcessedAction => {
    processedAction.processedActionEffects = getValidValueOrDefault(processedAction.processedActionEffects, []);
    return processedAction;
}
