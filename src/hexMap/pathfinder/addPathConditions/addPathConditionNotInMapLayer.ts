import {AddPathCondition, AreValidParametersForAddPathCondition} from "./addPathCondition";
import {SearchPath, SearchPathHelper} from "../searchPath";
import {SearchParameters} from "../searchParams";
import {MapLayer, MapLayerHelper} from "../../../missionMap/mapLayer";
import {TileFoundDescription} from "../tileFoundDescription";
import {isValidValue} from "../../../utils/validityCheck";

export class AddPathConditionNotInMapLayer implements AddPathCondition {
    enqueuedMapLayer: MapLayer;

    constructor({enqueuedMapLayer}: { enqueuedMapLayer: MapLayer }) {
        this.enqueuedMapLayer = enqueuedMapLayer;
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

        if (!isValidValue(this.enqueuedMapLayer)) {
            return undefined;
        }

        const headLocation: TileFoundDescription = SearchPathHelper.getMostRecentTileLocation(newPath);
        if (MapLayerHelper.outOfBounds({
            mapLayer: this.enqueuedMapLayer,
            q: headLocation.hexCoordinate.q,
            r: headLocation.hexCoordinate.r
        })) {
            return undefined;
        }
        return this.enqueuedMapLayer.valueByLocation[headLocation.hexCoordinate.q][headLocation.hexCoordinate.r] !== true;
    }
}
