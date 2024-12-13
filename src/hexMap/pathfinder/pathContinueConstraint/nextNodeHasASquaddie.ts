import {
    PathContinueConstraint,
    AreValidParametersForAddPathCondition,
} from "./pathContinueConstraint"
import { SearchPath, SearchPathService } from "../searchPath"
import { SearchParameters } from "../searchParameters"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../battle/objectRepository"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
} from "../../../squaddie/squaddieAffiliation"
import { getSquaddieAtEndOfPath } from "../getSquaddieAtEndOfPath"

export class NextNodeHasASquaddie implements PathContinueConstraint {
    missionMap: MissionMap
    repository: ObjectRepository

    constructor({
        missionMap,
        objectRepository,
    }: {
        missionMap: MissionMap
        objectRepository: ObjectRepository
    }) {
        this.missionMap = missionMap
        this.repository = objectRepository
    }

    shouldContinue({
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
            searchParameters.pathContinueConstraints.squaddieAffiliation
                .searchingSquaddieAffiliation === SquaddieAffiliation.UNKNOWN
        ) {
            return true
        }

        if (searchParameters.pathStopConstraints.canStopOnSquaddies === true) {
            return true
        }

        const { battleSquaddie, squaddieTemplate } = getSquaddieAtEndOfPath({
            searchPath: newPath,
            missionMap: this.missionMap,
            objectRepository: this.repository,
        })

        if (battleSquaddie === undefined) {
            return true
        }

        return SquaddieAffiliationService.areSquaddieAffiliationsAllies({
            actingAffiliation:
                searchParameters.pathContinueConstraints.squaddieAffiliation
                    .searchingSquaddieAffiliation,
            targetAffiliation: squaddieTemplate.squaddieId.affiliation,
        })
    }
}
