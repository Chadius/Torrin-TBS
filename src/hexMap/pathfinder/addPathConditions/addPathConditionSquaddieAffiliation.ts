import {
    AddPathCondition,
    AreValidParametersForAddPathCondition,
} from "./addPathCondition"
import { SearchPath, SearchPathService } from "../searchPath"
import { SearchParameters } from "../searchParams"
import { MissionMap } from "../../../missionMap/missionMap"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../battle/objectRepository"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import {
    FriendlyAffiliationsByAffiliation,
    SquaddieAffiliation,
} from "../../../squaddie/squaddieAffiliation"

export class AddPathConditionSquaddieAffiliation implements AddPathCondition {
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

    shouldAddNewPath({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPath
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForAddPathCondition({ newPath })) {
            return undefined
        }

        if (
            searchParameters.squaddieAffiliation === SquaddieAffiliation.UNKNOWN
        ) {
            return true
        }

        if (searchParameters.canStopOnSquaddies === true) {
            return true
        }

        const head = SearchPathService.getMostRecentLocation(newPath)

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

        if (
            !SquaddieService.isSquaddieAlive({
                squaddieTemplate,
                battleSquaddie,
            })
        ) {
            return true
        }
        const friendlyAffiliations: {
            [friendlyAffiliation in SquaddieAffiliation]?: boolean
        } =
            FriendlyAffiliationsByAffiliation[
                searchParameters.squaddieAffiliation
            ]
        return (
            friendlyAffiliations[squaddieTemplate.squaddieId.affiliation] ===
            true
        )
    }
}
