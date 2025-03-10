import { SearchParameters } from "../searchParameters"
import { AreValidParametersForAddPathCondition } from "../pathContinueConstraint/pathContinueConstraint"
import { PathStopConstraint } from "./pathStopConstraint"
import { MissionMap } from "../../../missionMap/missionMap"
import { ObjectRepository } from "../../../battle/objectRepository"
import { getSquaddieAtEndOfPath } from "../getSquaddieAtEndOfPath"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../search/searchPathAdapter/searchPathAdapter"

export class PathDoesNotEndOnAnotherSquaddie implements PathStopConstraint {
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

    squaddieCanStopAtTheEndOfThisPath({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPathAdapter
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForAddPathCondition({ newPath })) {
            return undefined
        }

        if (SearchPathAdapterService.getCoordinates(newPath).length <= 1) {
            return true
        }

        if (searchParameters.pathStopConstraints.canStopOnSquaddies === true) {
            return true
        }

        const { battleSquaddie } = getSquaddieAtEndOfPath({
            searchPath: newPath,
            missionMap: this.missionMap,
            objectRepository: this.repository,
        })

        return battleSquaddie === undefined
    }
}
