import {
    AreValidParametersForAddPathCondition,
    PathContinueConstraint,
} from "./pathContinueConstraint"
import { SearchPath, SearchPathService } from "../searchPath"
import { SearchParameters } from "../searchParameters"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "../../../missionMap/mapSearchDataLayer"
import { CoordinateTraveled } from "../coordinateTraveled"
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

        const headLocation: CoordinateTraveled =
            SearchPathService.getMostRecentCoordinate(newPath)
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
            this.enqueuedMapLayer.valueByCoordinate[
                headLocation.hexCoordinate.q
            ][headLocation.hexCoordinate.r] !== true
        )
    }
}
