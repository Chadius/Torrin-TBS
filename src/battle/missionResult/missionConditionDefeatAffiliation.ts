import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import {
    MissionCondition,
    MissionConditionCalculator,
    MissionConditionType,
    TMissionConditionType,
} from "./missionCondition"
import { getResultOrThrowError } from "../../utils/resultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import { MissionMapSquaddieCoordinate } from "../../missionMap/squaddieCoordinate"
import { ObjectRepositoryService } from "../objectRepository"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { MissionMapService } from "../../missionMap/missionMap"

export class MissionConditionDefeatAffiliation
    implements MissionConditionCalculator
{
    shouldBeComplete(
        missionCondition: MissionCondition,
        state: GameEngineState,
        missionObjectiveId: string
    ): boolean {
        const isComplete: boolean =
            state.battleOrchestratorState.battleState.missionCompletionStatus[
                missionObjectiveId
            ].conditions[missionCondition.id]
        if (isComplete !== undefined) {
            return isComplete
        }

        const affiliationByType: {
            [key in TMissionConditionType]?: TSquaddieAffiliation
        } = {
            [MissionConditionType.DEFEAT_ALL_PLAYERS]:
                SquaddieAffiliation.PLAYER,
            [MissionConditionType.DEFEAT_ALL_ENEMIES]:
                SquaddieAffiliation.ENEMY,
            [MissionConditionType.DEFEAT_ALL_ALLIES]: SquaddieAffiliation.ALLY,
            [MissionConditionType.DEFEAT_ALL_NO_AFFILIATIONS]:
                SquaddieAffiliation.NONE,
        }
        const affiliationToCheck = affiliationByType[missionCondition.type]

        const livingSquaddie = MissionMapService.getAllSquaddieData(
            state.battleOrchestratorState.battleState.missionMap
        ).find((livingSquaddieDatum: MissionMapSquaddieCoordinate) => {
            const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    state.repository,
                    livingSquaddieDatum.battleSquaddieId
                )
            )

            if (
                squaddieTemplate.squaddieId.affiliation !== affiliationToCheck
            ) {
                return false
            }

            const { isDead } = SquaddieService.canSquaddieActRightNow({
                squaddieTemplate,
                battleSquaddie,
            })
            return !isDead
        })

        return !livingSquaddie
    }
}
