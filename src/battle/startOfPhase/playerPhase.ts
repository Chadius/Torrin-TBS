import { GameEngineState } from "../../gameEngine/gameEngine"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { BattlePhaseService } from "../orchestratorComponents/battlePhaseTracker"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { SquaddieService } from "../../squaddie/squaddieService"
import { MissionMapSquaddieLocationService } from "../../missionMap/squaddieLocation"
import {
    ConvertCoordinateService,
    convertMapCoordinatesToScreenCoordinates,
} from "../../hexMap/convertCoordinates"
import { GraphicsConfig } from "../../utils/graphics/graphicsConfig"
import { BANNER_ANIMATION_TIME } from "../orchestratorComponents/battlePhaseController"
import { MessageBoardMessageStartedPlayerPhase } from "../../message/messageBoardMessage"

export const PlayerPhaseService = {
    panToControllablePlayerSquaddieIfPlayerPhase: (
        message: MessageBoardMessageStartedPlayerPhase
    ) => {
        const gameEngineState: GameEngineState = message.gameEngineState
        const playerTeam: BattleSquaddieTeam =
            BattlePhaseService.FindTeamsOfAffiliation(
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

        const mapDatum =
            gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                squaddieToPanToBattleId
            )
        if (MissionMapSquaddieLocationService.isValid(mapDatum)) {
            const squaddieScreenLocation =
                convertMapCoordinatesToScreenCoordinates(
                    mapDatum.mapLocation.q,
                    mapDatum.mapLocation.r,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
                )
            if (
                GraphicsConfig.isCoordinateWithinMiddleThirdOfScreen(
                    ...squaddieScreenLocation
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
                xDestination: squaddieWorldLocation[0],
                yDestination: squaddieWorldLocation[1],
                timeToPan: BANNER_ANIMATION_TIME - 500,
                respectConstraints: true,
            })
            return
        }
    },
}
