import { MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattleSquaddie } from "../../battle/battleSquaddie"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { BattleActionDecisionStepService } from "../../battle/actionDecision/battleActionDecisionStep"

export const NullMissionMap = () =>
    MissionMapService.new({
        terrainTileMap: TerrainTileMapService.new({
            movementCost: ["1 "],
        }),
    })

export const BattleOrchestratorStateTestService = {
    knightUsesLongswordAction: ({
        gameEngineState,
        knightBattleSquaddie,
        longswordAction,
    }: {
        gameEngineState: GameEngineState
        knightBattleSquaddie: BattleSquaddie
        longswordAction: ActionTemplate
    }) => {
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            actionTemplateId: longswordAction.id,
        })
    },
}
