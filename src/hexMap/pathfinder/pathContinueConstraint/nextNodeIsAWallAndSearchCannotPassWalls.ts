import {
    PathContinueConstraint,
    AreValidParametersForAddPathCondition,
} from "./pathContinueConstraint"
import { MissionMap } from "../../../missionMap/missionMap"
import { SearchPath, SearchPathService } from "../searchPath"
import { SearchParameters } from "../searchParameters"
import { TerrainTileMapService } from "../../terrainTileMap"
import { HexCoordinate } from "../../hexCoordinate/hexCoordinate"
import { HexGridMovementCost } from "../../hexGridMovementCost"

export class NextNodeIsAWallAndSearchCannotPassWalls
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

        if (searchParameters.pathContinueConstraints.passThroughWalls) {
            return true
        }

        const coordinate: HexCoordinate =
            SearchPathService.getMostRecentLocation(newPath).hexCoordinate
        const terrainType = TerrainTileMapService.getTileTerrainTypeAtLocation(
            this.missionMap.terrainTileMap,
            coordinate
        )
        return terrainType !== HexGridMovementCost.wall
    }
}