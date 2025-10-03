import { MessageBoardMessageSquaddiePhaseEnds } from "../../message/messageBoardMessage"
import { BattlePhaseService } from "../orchestratorComponents/battlePhaseTracker"
import { BattleSquaddie } from "../battleSquaddie"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { MapGraphicsLayerSquaddieTypes } from "../../hexMap/mapLayer/mapGraphicsLayer"

export const SquaddiePhaseEndsService = {
    unTintSquaddieMapIconForEachSquaddie: (
        message: MessageBoardMessageSquaddiePhaseEnds
    ) => {
        BattlePhaseService.doForEachSquaddieOfBattlePhase({
            teams: message.teams,
            repository: message.repository,
            phase: message.phase,
            callback: (battleSquaddie: BattleSquaddie) => {
                if (message.repository == undefined) return
                DrawSquaddieIconOnMapUtilities.unTintSquaddieMapIcon(
                    message.repository,
                    battleSquaddie
                )
            },
        })
    },
    clearMapSquaddieGameplayLayers: (
        message: MessageBoardMessageSquaddiePhaseEnds
    ) => {
        MapGraphicsLayerSquaddieTypes.forEach((t) =>
            TerrainTileMapService.removeGraphicsLayerByType(
                message.missionMap.terrainTileMap,
                t
            )
        )
    },
}
