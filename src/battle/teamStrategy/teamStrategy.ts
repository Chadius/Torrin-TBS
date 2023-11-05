import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";

export enum TeamStrategyType {
    END_TURN = "END_TURN",
    MOVE_CLOSER_TO_SQUADDIE = "MOVE_CLOSER_TO_SQUADDIE",
    TARGET_SQUADDIE_IN_RANGE = "TARGET_SQUADDIE_IN_RANGE",
}

export interface TeamStrategyOptions {
    desiredBattleSquaddieId?: string;
    desiredAffiliation?: SquaddieAffiliation;
}

export interface TeamStrategy {
    type: TeamStrategyType;
    options: TeamStrategyOptions;
}
