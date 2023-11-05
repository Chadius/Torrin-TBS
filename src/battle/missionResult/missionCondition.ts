import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {MissionConditionDefeatAffiliation} from "./missionConditionDefeatAffiliation";

export enum MissionConditionType {
    DEFEAT_ALL_ENEMIES = "DEFEAT_ALL_ENEMIES",
    DEFEAT_ALL_PLAYERS = "DEFEAT_ALL_PLAYERS",
    DEFEAT_ALL_ALLIES = "DEFEAT_ALL_ALLIES",
    DEFEAT_ALL_NO_AFFILIATIONS = "DEFEAT_ALL_NO_AFFILIATIONS",
}

export interface MissionCondition {
    id: string,
    type: MissionConditionType,
}

export interface MissionConditionCalculator {
    shouldBeComplete(missionCondition: MissionCondition, state: BattleOrchestratorState, missionObjectiveId: string): boolean
}

export const MissionShouldBeComplete = (missionCondition: MissionCondition, state: BattleOrchestratorState, missionObjectiveId: string): boolean => {
    let calculator: MissionConditionCalculator;
    if (
        [
            MissionConditionType.DEFEAT_ALL_ENEMIES,
            MissionConditionType.DEFEAT_ALL_PLAYERS,
            MissionConditionType.DEFEAT_ALL_ALLIES,
            MissionConditionType.DEFEAT_ALL_NO_AFFILIATIONS,
        ].includes(missionCondition.type)
    ) {
        calculator = new MissionConditionDefeatAffiliation();
    }

    return calculator.shouldBeComplete(missionCondition, state, missionObjectiveId);
}
