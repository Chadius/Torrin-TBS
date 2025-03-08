import {
    AreValidParametersForAddPathCondition,
    PathContinueConstraint,
} from "./pathContinueConstraint"
import { SearchParameters } from "../searchParameters"
import { MissionMap } from "../../../missionMap/missionMap"
import { ObjectRepository } from "../../../battle/objectRepository"
import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
} from "../../../squaddie/squaddieAffiliation"
import { getSquaddieAtEndOfPath } from "../getSquaddieAtEndOfPath"
import { SearchPathAdapter } from "../../../search/searchPathAdapter/searchPathAdapter"

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
        newPath: SearchPathAdapter
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

        if (searchParameters.pathStopConstraints.canStopOnSquaddies) return true
        if (
            searchParameters.pathContinueConstraints.squaddieAffiliation
                .canCrossThroughUnfriendlySquaddies
        )
            return true

        const { battleSquaddie, squaddieTemplate } = getSquaddieAtEndOfPath({
            searchPath: newPath,
            missionMap: this.missionMap,
            objectRepository: this.repository,
        })

        if (battleSquaddie === undefined) return true

        return SquaddieAffiliationService.areSquaddieAffiliationsAllies({
            actingAffiliation:
                searchParameters.pathContinueConstraints.squaddieAffiliation
                    .searchingSquaddieAffiliation,
            targetAffiliation: squaddieTemplate.squaddieId.affiliation,
        })
    }
}
