import {
    AreValidParametersForAddPathCondition,
    PathContinueConstraint,
} from "./pathContinueConstraint"
import { MissionMap } from "../../../missionMap/missionMap"
import { SearchPath, SearchPathService } from "../searchPath"
import { SearchParameters } from "../searchParameters"
import { TerrainTileMapService } from "../../terrainTileMap"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { HexGridMovementCost } from "../../hexGridMovementCost"

export class NextNodeIsAPitAndSearchCannotCrossPits
    implements PathContinueConstraint
{
    missionMap: MissionMap

    constructor({ missionMap }: { missionMap: MissionMap }) {
        this.missionMap = missionMap
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

        if (searchParameters.pathContinueConstraints.passOverPits) {
            return true
        }

        const coordinate: HexCoordinate =
            SearchPathService.getMostRecentCoordinate(newPath).hexCoordinate
        const terrainType =
            TerrainTileMapService.getTileTerrainTypeAtCoordinate(
                this.missionMap.terrainTileMap,
                coordinate
            )
        return terrainType !== HexGridMovementCost.pit
    }
}
