import {
    AreValidParametersForAddPathCondition,
    PathContinueConstraint,
} from "./pathContinueConstraint"
import { SearchParameters } from "../searchParameters"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "../../../missionMap/mapSearchDataLayer"
import { CoordinateTraveled } from "../coordinateTraveled"
import { isValidValue } from "../../../utils/validityCheck"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../search/searchPathAdapter/searchPathAdapter"

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
    }: {
        newPath: SearchPathAdapter
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForAddPathCondition({ newPath })) {
            return undefined
        }

        if (!isValidValue(this.enqueuedMapLayer)) {
            return undefined
        }

        const headLocation: CoordinateTraveled =
            SearchPathAdapterService.getMostRecentCoordinate(newPath)
        if (
            MapSearchDataLayerService.outOfBounds({
                mapLayer: this.enqueuedMapLayer,
                mapCoordinate: headLocation.hexCoordinate,
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
