import { MessageBoardMessageSquaddiePhaseStarts } from "../../message/messageBoardMessage"
import {
    BattlePhaseService,
    TBattlePhase,
} from "../orchestratorComponents/battlePhaseTracker"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { SquaddieTurnService } from "../../squaddie/turn"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export const SquaddiePhaseStartsService = {
    restoreTurnForAllSquaddies: ({
        gameEngineState,
        phase,
    }: {
        gameEngineState: GameEngineState
        phase: TBattlePhase
    }) => {
        BattlePhaseService.doForEachSquaddieOfBattlePhase(
            gameEngineState,
            phase,
            (battleSquaddie: BattleSquaddie) => {
                SquaddieTurnService.beginNewTurn(battleSquaddie.squaddieTurn)
            }
        )
    },
    reduceDurationForAttributeModifiers: (
        message: MessageBoardMessageSquaddiePhaseStarts
    ) => {
        BattlePhaseService.doForEachSquaddieOfBattlePhase(
            message.gameEngineState,
            message.phase,
            (battleSquaddie: BattleSquaddie) => {
                InBattleAttributesService.decreaseModifiersBy1Round(
                    battleSquaddie.inBattleAttributes
                )
                InBattleAttributesService.removeInactiveAttributeModifiers(
                    battleSquaddie.inBattleAttributes
                )
            }
        )
    },
    stopCamera: (message: MessageBoardMessageSquaddiePhaseStarts) => {
        const gameEngineState: GameEngineState = message.gameEngineState
        gameEngineState.battleOrchestratorState.battleState.camera.setXVelocity(
            0
        )
        gameEngineState.battleOrchestratorState.battleState.camera.setYVelocity(
            0
        )
    },
    stopHighlightingMapTiles: (
        message: MessageBoardMessageSquaddiePhaseStarts
    ) => {
        const gameEngineState: GameEngineState = message.gameEngineState
        if (
            gameEngineState?.battleOrchestratorState?.battleState?.missionMap
                ?.terrainTileMap === undefined
        ) {
            return
        }
        TerrainTileMapService.removeAllGraphicsLayers(
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        )
    },
    unTintSquaddieMapIconForEachSquaddieWhoCanAct: (
        message: MessageBoardMessageSquaddiePhaseStarts
    ) => {
        BattlePhaseService.doForEachSquaddieOfBattlePhase(
            message.gameEngineState,
            message.phase,
            (battleSquaddie: BattleSquaddie) => {
                if (message.gameEngineState.repository == undefined) return
                DrawSquaddieIconOnMapUtilities.unTintSquaddieMapIcon(
                    message.gameEngineState.repository,
                    battleSquaddie
                )
            }
        )
    },
    reduceCooldownForAllSquaddies: ({
        gameEngineState,
        phase,
    }: {
        gameEngineState: GameEngineState
        phase: TBattlePhase
    }) => {
        BattlePhaseService.doForEachSquaddieOfBattlePhase(
            gameEngineState,
            phase,
            (battleSquaddie: BattleSquaddie) => {
                BattleSquaddieService.beginNewTurn(battleSquaddie)
            }
        )
    },
}
