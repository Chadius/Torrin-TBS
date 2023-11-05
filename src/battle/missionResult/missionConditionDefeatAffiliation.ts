import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionCondition, MissionConditionCalculator, MissionConditionType} from "./missionCondition";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {CanSquaddieActRightNow} from "../../squaddie/squaddieService";
import {MissionMapSquaddieLocation} from "../../missionMap/squaddieLocation";

export class MissionConditionDefeatAffiliation implements MissionConditionCalculator {
    shouldBeComplete(missionCondition: MissionCondition, state: BattleOrchestratorState, missionObjectiveId: string): boolean {
        const isComplete: boolean = state.missionCompletionStatus[missionObjectiveId].conditions[missionCondition.id];
        if (isComplete !== undefined) {
            return isComplete;
        }

        const affiliationByType: { [key in MissionConditionType]?: SquaddieAffiliation } = {
            [MissionConditionType.DEFEAT_ALL_PLAYERS]: SquaddieAffiliation.PLAYER,
            [MissionConditionType.DEFEAT_ALL_ENEMIES]: SquaddieAffiliation.ENEMY,
            [MissionConditionType.DEFEAT_ALL_ALLIES]: SquaddieAffiliation.ALLY,
            [MissionConditionType.DEFEAT_ALL_NO_AFFILIATIONS]: SquaddieAffiliation.NONE,
        };
        const affiliationToCheck = affiliationByType[missionCondition.type];

        const livingSquaddie = state.missionMap.getAllSquaddieData().find((livingSquaddieDatum: MissionMapSquaddieLocation) => {
            const {
                squaddieTemplate,
                battleSquaddie,
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(livingSquaddieDatum.battleSquaddieId));

            if (squaddieTemplate.squaddieId.affiliation !== affiliationToCheck) {
                return false;
            }

            const {
                isDead
            } = CanSquaddieActRightNow({squaddieTemplate, battleSquaddie})
            return !isDead;
        });

        return !livingSquaddie;
    }
}
