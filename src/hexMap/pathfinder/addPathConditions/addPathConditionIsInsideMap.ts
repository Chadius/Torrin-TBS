import {AddPathCondition, AreValidParametersForAddPathCondition} from "./addPathCondition";
import {SearchPath, SearchPathHelper} from "../searchPath";
import {SearchParameters} from "../searchParams";
import {MapLayer, MapLayerHelper} from "../../../missionMap/mapLayer";
import {TileFoundDescription} from "../tileFoundDescription";
import {isValidValue} from "../../../utils/validityCheck";

export class AddPathConditionIsInsideMap implements AddPathCondition {
    terrainMapLayer: MapLayer;

    constructor({terrainMapLayer}: { terrainMapLayer: MapLayer }) {
        this.terrainMapLayer = terrainMapLayer;
    }

    shouldAddNewPath({
                         newPath,
                         searchParameters,
                     }: {
        newPath: SearchPath;
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForAddPathCondition({newPath})) {
            return undefined;
        }

        if (!isValidValue(this.terrainMapLayer)) {
            return undefined;
        }

        const headLocation: TileFoundDescription = SearchPathHelper.getMostRecentTileLocation(newPath);
        return !MapLayerHelper.outOfBounds({
            mapLayer: this.terrainMapLayer,
            q: headLocation.hexCoordinate.q,
            r: headLocation.hexCoordinate.r
        });
    }
}
