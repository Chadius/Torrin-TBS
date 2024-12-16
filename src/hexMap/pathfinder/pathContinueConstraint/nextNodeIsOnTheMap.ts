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
import { LocationTraveled } from "../locationTraveled"
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

        const headLocation: LocationTraveled =
            SearchPathService.getMostRecentLocation(newPath)
        return !MapSearchDataLayerService.outOfBounds({
            mapLayer: this.terrainMapLayer,
            q: headLocation.hexCoordinate.q,
            r: headLocation.hexCoordinate.r,
        })
    }
}
