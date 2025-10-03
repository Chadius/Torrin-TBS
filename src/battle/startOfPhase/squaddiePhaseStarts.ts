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
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { ObjectRepository } from "../objectRepository"

export const SquaddiePhaseStartsService = {
    restoreTurnForAllSquaddies: (message: {
        teams: BattleSquaddieTeam[]
        repository: ObjectRepository
        phase: TBattlePhase
    }) => {
        BattlePhaseService.doForEachSquaddieOfBattlePhase({
            teams: message.teams,
            repository: message.repository,
            phase: message.phase,
            callback: (battleSquaddie: BattleSquaddie) => {
                SquaddieTurnService.beginNewTurn(battleSquaddie.squaddieTurn)
            },
        })
    },
    reduceDurationForAttributeModifiers: ({
        teams,
        repository,
        phase,
    }: {
        teams: BattleSquaddieTeam[]
        repository: ObjectRepository
        phase: TBattlePhase
    }) => {
        BattlePhaseService.doForEachSquaddieOfBattlePhase({
            teams,
            repository,
            phase,
            callback: (battleSquaddie: BattleSquaddie) => {
                InBattleAttributesService.decreaseModifiersBy1Round(
                    battleSquaddie.inBattleAttributes
                )
                InBattleAttributesService.removeInactiveAttributeModifiers(
                    battleSquaddie.inBattleAttributes
                )
            },
        })
    },
    stopCamera: (message: MessageBoardMessageSquaddiePhaseStarts) => {
        message.camera.setXVelocity(0)
        message.camera.setYVelocity(0)
    },
    stopHighlightingMapTiles: (
        message: MessageBoardMessageSquaddiePhaseStarts
    ) => {
        if (message.missionMap?.terrainTileMap === undefined) {
            return
        }
        TerrainTileMapService.removeAllGraphicsLayers(
            message.missionMap.terrainTileMap
        )
    },
    unTintSquaddieMapIconForEachSquaddieWhoCanAct: (
        message: MessageBoardMessageSquaddiePhaseStarts
    ) => {
        BattlePhaseService.doForEachSquaddieOfBattlePhase({
            teams: message.teams,
            repository: message.repository,
            phase: message.phase,
            callback: (battleSquaddie: BattleSquaddie) => {
                DrawSquaddieIconOnMapUtilities.unTintSquaddieMapIcon(
                    message.repository,
                    battleSquaddie
                )
            },
        })
    },
    reduceCooldownForAllSquaddies: (
        message: MessageBoardMessageSquaddiePhaseStarts
    ) => {
        BattlePhaseService.doForEachSquaddieOfBattlePhase({
            teams: message.teams,
            repository: message.repository,
            phase: message.phase,
            callback: (battleSquaddie: BattleSquaddie) => {
                BattleSquaddieService.beginNewTurn(battleSquaddie)
            },
        })
    },
}
