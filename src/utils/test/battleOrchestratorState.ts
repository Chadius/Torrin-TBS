import { MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"

export const NullMissionMap = () =>
    MissionMapService.new({
        terrainTileMap: TerrainTileMapService.new({
            movementCost: ["1 "],
        }),
    })
