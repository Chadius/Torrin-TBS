import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionCondition, MissionConditionCalculator, MissionConditionType} from "./missionCondition";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SquaddieService} from "../../squaddie/squaddieService";
import {MissionMapSquaddieLocation} from "../../missionMap/squaddieLocation";
import {ObjectRepositoryService} from "../objectRepository";
import {GameEngineState} from "../../gameEngine/gameEngine";

export class MissionConditionDefeatAffiliation implements MissionConditionCalculator {
    shouldBeComplete(missionCondition: MissionCondition, state: GameEngineState, missionObjectiveId: string): boolean {
        const isComplete: boolean = state.battleOrchestratorState.battleState.missionCompletionStatus[missionObjectiveId].conditions[missionCondition.id];
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

        const livingSquaddie = state.battleOrchestratorState.battleState.missionMap.getAllSquaddieData().find((livingSquaddieDatum: MissionMapSquaddieLocation) => {
            const {
                squaddieTemplate,
                battleSquaddie,
            } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, livingSquaddieDatum.battleSquaddieId));

            if (squaddieTemplate.squaddieId.affiliation !== affiliationToCheck) {
                return false;
            }

            const {
                isDead
            } = SquaddieService.canSquaddieActRightNow({squaddieTemplate, battleSquaddie})
            return !isDead;
        });

        return !livingSquaddie;
    }
}
