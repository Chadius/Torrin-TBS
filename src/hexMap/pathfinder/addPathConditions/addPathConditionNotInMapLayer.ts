import {
    AddPathCondition,
    AreValidParametersForAddPathCondition,
} from "./addPathCondition"
import { SearchPath, SearchPathService } from "../searchPath"
import { SearchParameters } from "../searchParams"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "../../../missionMap/mapSearchDataLayer"
import { LocationTraveled } from "../locationTraveled"
import { isValidValue } from "../../../utils/validityCheck"

export class AddPathConditionNotInMapLayer implements AddPathCondition {
    enqueuedMapLayer: MapSearchDataLayer

    constructor({
        enqueuedMapLayer,
    }: {
        enqueuedMapLayer: MapSearchDataLayer
    }) {
        this.enqueuedMapLayer = enqueuedMapLayer
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
