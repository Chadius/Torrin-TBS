import { GameEngineState } from "../../gameEngine/gameEngine"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { BattlePhaseService } from "../orchestratorComponents/battlePhaseTracker"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { SquaddieService } from "../../squaddie/squaddieService"
import { MissionMapSquaddieLocationService } from "../../missionMap/squaddieLocation"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { GraphicsConfig } from "../../utils/graphics/graphicsConfig"
import { BANNER_ANIMATION_TIME } from "../orchestratorComponents/battlePhaseController"
import { MessageBoardMessageStartedPlayerPhase } from "../../message/messageBoardMessage"
import { MissionMapService } from "../../missionMap/missionMap"

export const PlayerPhaseService = {
    panToControllablePlayerSquaddieIfPlayerPhase: (
        message: MessageBoardMessageStartedPlayerPhase
    ) => {
        const gameEngineState: GameEngineState = message.gameEngineState
        const playerTeam: BattleSquaddieTeam =
            BattlePhaseService.findTeamsOfAffiliation(
                gameEngineState.battleOrchestratorState.battleState.teams,
                SquaddieAffiliation.PLAYER
            )[0]
        let squaddieToPanToBattleId = playerTeam.battleSquaddieIds.find(
            (id) => {
                const { squaddieTemplate, battleSquaddie } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            gameEngineState.repository,
                            id
                        )
                    )
                const { playerCanControlThisSquaddieRightNow } =
                    SquaddieService.canPlayerControlSquaddieRightNow({
                        battleSquaddie,
                        squaddieTemplate,
                    })

                return playerCanControlThisSquaddieRightNow
            }
        )

        if (squaddieToPanToBattleId === undefined) {
            return
        }

        const mapDatum = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            squaddieToPanToBattleId
        )
        if (MissionMapSquaddieLocationService.isValid(mapDatum)) {
            const squaddieScreenLocation =
                ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                    {
                        q: mapDatum.mapLocation.q,
                        r: mapDatum.mapLocation.r,
                        ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                    }
                )
            if (
                GraphicsConfig.isCoordinateWithinMiddleThirdOfScreen(
                    squaddieScreenLocation.screenX,
                    squaddieScreenLocation.screenY
                )
            ) {
                return
            }

            const squaddieWorldLocation =
                ConvertCoordinateService.convertMapCoordinatesToWorldCoordinates(
                    mapDatum.mapLocation.q,
                    mapDatum.mapLocation.r
                )
            gameEngineState.battleOrchestratorState.battleState.camera.pan({
                xDestination: squaddieWorldLocation.worldX,
                yDestination: squaddieWorldLocation.worldY,
                timeToPan: BANNER_ANIMATION_TIME - 500,
                respectConstraints: true,
            })
        }
    },
}
