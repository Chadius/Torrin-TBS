import { GameEngineState } from "../../gameEngine/gameEngine"
import { MessageBoardMessageSquaddiePhaseStarts } from "../../message/messageBoardMessage"
import { ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    BattlePhase,
    BattlePhaseService,
} from "../orchestratorComponents/battlePhaseTracker"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { BattleSquaddie } from "../battleSquaddie"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"

export const SquaddiePhaseStartsService = {
    restoreTurnForAllSquaddies: ({
        gameEngineState,
        phase,
    }: {
        gameEngineState: GameEngineState
        phase: BattlePhase
    }) => {
        doForEachSquaddieOfBattlePhase(
            gameEngineState,
            phase,
            (battleSquaddie: BattleSquaddie) => {
                SquaddieTurnService.beginNewRound(battleSquaddie.squaddieTurn)
            }
        )
    },
    reduceDurationForAttributeModifiers: (
        message: MessageBoardMessageSquaddiePhaseStarts
    ) => {
        doForEachSquaddieOfBattlePhase(
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
        doForEachSquaddieOfBattlePhase(
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
