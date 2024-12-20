import { GameEngineState } from "../../gameEngine/gameEngine"
import { ActionTilePosition } from "../../battle/hud/playerActionPanel/tile/actionTilePosition"
import { ObjectRepositoryService } from "../../battle/objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { expect } from "vitest"

export const SummaryHUDSpec = {
    expectActorNameToBe: (
        gameEngineState: GameEngineState,
        expectedActorName: string
    ) => {
        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState
        ).toBeTruthy()

        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.showPlayerCommand
        ).toBeTruthy()
        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.playerCommandState
        ).toBeTruthy()

        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieNameTiles[
                ActionTilePosition.ACTOR_NAME
            ]
        ).toBeTruthy()

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.ACTOR_NAME
                ].battleSquaddieId
            )
        )

        expect(squaddieTemplate.squaddieId.name).toEqual(expectedActorName)
    },
}
