import { GameEngineState } from "../../gameEngine/gameEngine"
import { MessageBoardMessageSquaddiePhaseEnds } from "../../message/messageBoardMessage"
import { ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    BattlePhase,
    BattlePhaseService,
} from "../orchestratorComponents/battlePhaseTracker"
import { BattleSquaddie } from "../battleSquaddie"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { MapGraphicsLayerSquaddieTypes } from "../../hexMap/mapLayer/mapGraphicsLayer"

export const SquaddiePhaseEndsService = {
    unTintSquaddieMapIconForEachSquaddie: (
        message: MessageBoardMessageSquaddiePhaseEnds
    ) => {
        doForEachSquaddieOfBattlePhase(
            message.gameEngineState,
            message.phase,
            (battleSquaddie: BattleSquaddie) => {
                DrawSquaddieUtilities.unTintSquaddieMapIcon(
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

const doForEachSquaddieOfBattlePhase = (
    gameEngineState: GameEngineState,
    phase: BattlePhase,
    callback: (battleSquaddie: BattleSquaddie) => void
) => {
    const squaddieAffiliation =
        BattlePhaseService.ConvertBattlePhaseToSquaddieAffiliation(phase)

    const squaddieTeams =
        gameEngineState.battleOrchestratorState.battleState.teams.filter(
            (team) => team.affiliation === squaddieAffiliation
        )
    squaddieTeams.forEach((team) => {
        team.battleSquaddieIds.forEach((battleSquaddieId) => {
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    battleSquaddieId
                )
            )

            callback(battleSquaddie)
        })
    })
}
