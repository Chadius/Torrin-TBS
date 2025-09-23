import { MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { BattleSquaddie } from "../../battle/battleSquaddie"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { BattleActionDecisionStepService } from "../../battle/actionDecision/battleActionDecisionStep"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

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
        BattleActionDecisionStepService.reset(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
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
