import { SearchPath, SearchPathHelper } from "../searchPath"
import { SearchParameters } from "../searchParams"
import { AreValidParametersForAddPathCondition } from "../addPathConditions/addPathCondition"
import { PathCanStopCondition } from "./pathCanStopCondition"
import { MissionMap } from "../../../missionMap/missionMap"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../battle/objectRepository"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { IsSquaddieAlive } from "../../../squaddie/squaddieService"

export class PathCanStopConditionNotOnAnotherSquaddie
    implements PathCanStopCondition
{
    missionMap: MissionMap
    repository: ObjectRepository

    constructor({
        missionMap,
        repository,
    }: {
        missionMap: MissionMap
        repository: ObjectRepository
    }) {
        this.missionMap = missionMap
        this.repository = repository
    }

    shouldMarkPathLocationAsStoppable({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPath
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForAddPathCondition({ newPath })) {
            return undefined
        }

        if (newPath.locationsTraveled.length <= 1) {
            return true
        }

        if (searchParameters.canStopOnSquaddies === true) {
            return true
        }

        const head = SearchPathHelper.getMostRecentLocation(newPath)

        const { battleSquaddieId } = this.missionMap.getSquaddieAtLocation({
            q: head.hexCoordinate.q,
            r: head.hexCoordinate.r,
        })
        if (battleSquaddieId === undefined) {
            return true
        }

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                this.repository,
                battleSquaddieId
            )
        )

        if (!squaddieTemplate) {
            return true
        }

        return !IsSquaddieAlive({ squaddieTemplate, battleSquaddie })
    }
}
