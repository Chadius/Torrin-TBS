import {SearchPath, SearchPathHelper} from "./searchPath";
import {MapLayer, MapLayerHelper} from "../../missionMap/mapLayer";
import {isValidValue} from "../../utils/validityCheck";

export interface PathFilter {
    pathSatisfiesFilter(path: SearchPath): boolean;
}

export class PathIsInBoundsFilter implements PathFilter {
    mapLayer: MapLayer;

    constructor({mapLayer}: { mapLayer: MapLayer }) {
        this.mapLayer = mapLayer;
    }

    pathSatisfiesFilter(path: SearchPath): boolean {
        const headOfPath = SearchPathHelper.getMostRecentTileLocation(path);
        return isValidValue(headOfPath)
            && isValidValue(headOfPath.hexCoordinate)
            && !MapLayerHelper.outOfBounds({
                mapLayer: this.mapLayer,
                q: headOfPath.hexCoordinate.q,
                r: headOfPath.hexCoordinate.r
            });
    }
}

export class MapLayerMatchesValueFilter implements PathFilter {
    mapLayer: MapLayer;
    desiredValue: boolean | number;

    constructor({mapLayer, desiredValue}: { mapLayer: MapLayer, desiredValue: boolean | number }) {
        this.mapLayer = mapLayer;
        this.desiredValue = desiredValue;
    }

    pathSatisfiesFilter(path: SearchPath): boolean {
        const headOfPath = SearchPathHelper.getMostRecentTileLocation(path);
        if (!(isValidValue(headOfPath) && isValidValue(headOfPath.hexCoordinate))) {
            return false;
        }
        return this.mapLayer.valueByLocation[headOfPath.hexCoordinate.q][headOfPath.hexCoordinate.r] === this.desiredValue;
    }
}

export class PathPredicateFilter implements PathFilter {
    predicate: (path: SearchPath) => boolean;

    constructor({predicate}: { predicate: (path: SearchPath) => boolean }) {
        this.predicate = predicate;
    }

    pathSatisfiesFilter(path: SearchPath): boolean {
        return this.predicate(path);
    }
}
