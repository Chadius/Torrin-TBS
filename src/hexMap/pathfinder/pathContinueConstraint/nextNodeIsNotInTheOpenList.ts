import {
    PathContinueConstraint,
    AreValidParametersForAddPathCondition,
} from "./pathContinueConstraint"
import { SearchPath, SearchPathService } from "../searchPath"
import { SearchParameters } from "../searchParameters"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "../../../missionMap/mapSearchDataLayer"
import { LocationTraveled } from "../locationTraveled"
import { isValidValue } from "../../../utils/validityCheck"

export class NextNodeIsNotInTheOpenList implements PathContinueConstraint {
    enqueuedMapLayer: MapSearchDataLayer

    constructor({
        enqueuedMapLayer,
    }: {
        enqueuedMapLayer: MapSearchDataLayer
    }) {
        this.enqueuedMapLayer = enqueuedMapLayer
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

        if (!isValidValue(this.enqueuedMapLayer)) {
            return undefined
        }

        const headLocation: LocationTraveled =
            SearchPathService.getMostRecentLocation(newPath)
        if (
            MapSearchDataLayerService.outOfBounds({
                mapLayer: this.enqueuedMapLayer,
                q: headLocation.hexCoordinate.q,
                r: headLocation.hexCoordinate.r,
            })
        ) {
            return undefined
        }
        return (
            this.enqueuedMapLayer.valueByLocation[headLocation.hexCoordinate.q][
                headLocation.hexCoordinate.r
            ] !== true
        )
    }
}