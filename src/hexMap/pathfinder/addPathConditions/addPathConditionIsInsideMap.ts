import {
    AddPathCondition,
    AreValidParametersForAddPathCondition,
} from "./addPathCondition"
import { SearchPath, SearchPathHelper } from "../searchPath"
import { SearchParameters } from "../searchParams"
import {
    MapSearchDataLayer,
    MapSearchDataLayerService,
} from "../../../missionMap/mapSearchDataLayer"
import { LocationTraveled } from "../locationTraveled"
import { isValidValue } from "../../../utils/validityCheck"

export class AddPathConditionIsInsideMap implements AddPathCondition {
    terrainMapLayer: MapSearchDataLayer

    constructor({ terrainMapLayer }: { terrainMapLayer: MapSearchDataLayer }) {
        this.terrainMapLayer = terrainMapLayer
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

        if (!isValidValue(this.terrainMapLayer)) {
            return undefined
        }

        const headLocation: LocationTraveled =
            SearchPathHelper.getMostRecentLocation(newPath)
        return !MapSearchDataLayerService.outOfBounds({
            mapLayer: this.terrainMapLayer,
            q: headLocation.hexCoordinate.q,
            r: headLocation.hexCoordinate.r,
        })
    }
}
