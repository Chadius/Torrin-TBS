import { GameEngineState } from "../../gameEngine/gameEngine"
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
        BattlePhaseService.doForEachSquaddieOfBattlePhase(
            message.gameEngineState,
            message.phase,
            (battleSquaddie: BattleSquaddie) => {
                DrawSquaddieIconOnMapUtilities.unTintSquaddieMapIcon(
                    message.gameEngineState.repository,
                    battleSquaddie
                )
            }
        )
    },
    clearMapSquaddieGameplayLayers: (
        message: MessageBoardMessageSquaddiePhaseEnds
    ) => {
        const gameEngineState: GameEngineState = message.gameEngineState
        MapGraphicsLayerSquaddieTypes.forEach((t) =>
            TerrainTileMapService.removeGraphicsLayerByType(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
                t
            )
        )
    },
}
