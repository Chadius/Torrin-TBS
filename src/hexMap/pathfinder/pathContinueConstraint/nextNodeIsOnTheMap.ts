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

export class NextNodeIsOnTheMap implements PathContinueConstraint {
    terrainMapLayer: MapSearchDataLayer

    constructor({ terrainMapLayer }: { terrainMapLayer: MapSearchDataLayer }) {
        this.terrainMapLayer = terrainMapLayer
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

        if (!isValidValue(this.terrainMapLayer)) {
            return undefined
        }

        const headLocation: CoordinateTraveled =
            SearchPathService.getMostRecentCoordinate(newPath)
        return !MapSearchDataLayerService.outOfBounds({
            mapLayer: this.terrainMapLayer,
            mapCoordinate: headLocation.hexCoordinate,
        })
    }
}
