import { MissionMap } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"

export const NullMissionMap = () =>
    new MissionMap({
        terrainTileMap: TerrainTileMapService.new({
            movementCost: ["1 "],
        }),
    })
