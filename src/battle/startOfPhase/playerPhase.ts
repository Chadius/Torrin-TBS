import { GameEngineState } from "../../gameEngine/gameEngine"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { BattlePhaseService } from "../orchestratorComponents/battlePhaseTracker"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { SquaddieService } from "../../squaddie/squaddieService"
import { MissionMapSquaddieCoordinateService } from "../../missionMap/squaddieCoordinate"
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
        if (MissionMapSquaddieCoordinateService.isValid(mapDatum)) {
            const squaddieScreenLocation =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: mapDatum.mapCoordinate,
                    cameraLocation:
                        gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
                })
            if (
                GraphicsConfig.isCoordinateWithinMiddleThirdOfScreen(
                    squaddieScreenLocation.x,
                    squaddieScreenLocation.y
                )
            ) {
                return
            }

            const squaddieWorldLocation =
                ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                    mapCoordinate: mapDatum.mapCoordinate,
                })
            gameEngineState.battleOrchestratorState.battleState.camera.pan({
                xDestination: squaddieWorldLocation.x,
                yDestination: squaddieWorldLocation.y,
                timeToPan: BANNER_ANIMATION_TIME - 500,
                respectConstraints: true,
            })
        }
    },
}
