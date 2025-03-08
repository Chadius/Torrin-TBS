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

export class NextNodeIsOnTheMap implements PathContinueConstraint {
    terrainMapLayer: MapSearchDataLayer

    constructor({ terrainMapLayer }: { terrainMapLayer: MapSearchDataLayer }) {
        this.terrainMapLayer = terrainMapLayer
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

        if (!isValidValue(this.terrainMapLayer)) {
            return undefined
        }

        const headLocation: CoordinateTraveled =
            SearchPathAdapterService.getMostRecentCoordinate(newPath)
        return !MapSearchDataLayerService.outOfBounds({
            mapLayer: this.terrainMapLayer,
            mapCoordinate: headLocation.hexCoordinate,
        })
    }
}
