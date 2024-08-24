import {
    AddPathCondition,
    AreValidParametersForAddPathCondition,
} from "./addPathCondition"
import { MissionMap } from "../../../missionMap/missionMap"
import { SearchPath, SearchPathHelper } from "../searchPath"
import { SearchParameters } from "../searchParams"
import { TerrainTileMapService } from "../../terrainTileMap"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { HexGridMovementCost } from "../../hexGridMovementCost"

export class AddPathConditionPathLeadsToPit implements AddPathCondition {
    missionMap: MissionMap

    constructor({ missionMap }: { missionMap: MissionMap }) {
        this.missionMap = missionMap
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

        if (searchParameters.passOverPits) {
            return true
        }

        const coordinate: HexCoordinate =
            SearchPathHelper.getMostRecentLocation(newPath).hexCoordinate
        const terrainType = TerrainTileMapService.getTileTerrainTypeAtLocation(
            this.missionMap.terrainTileMap,
            coordinate
        )
        return terrainType !== HexGridMovementCost.pit
    }
}
