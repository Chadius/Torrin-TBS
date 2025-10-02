import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { ObjectRepositoryService } from "../objectRepository"
import { BattlePhaseService } from "../orchestratorComponents/battlePhaseTracker"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { SquaddieService } from "../../squaddie/squaddieService"
import { MissionMapSquaddieCoordinateService } from "../../missionMap/squaddieCoordinate"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { GraphicsConfig } from "../../utils/graphics/graphicsConfig"
import { BANNER_ANIMATION_TIME } from "../orchestratorComponents/battlePhaseController"
import { MessageBoardMessageStartedPlayerPhase } from "../../message/messageBoardMessage"
import { MissionMapService } from "../../missionMap/missionMap"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export const PlayerPhaseService = {
    panToControllablePlayerSquaddieIfPlayerPhase: (
        message: MessageBoardMessageStartedPlayerPhase
    ) => {
        const gameEngineState: GameEngineState = message.gameEngineState
        const repository = gameEngineState.repository
        const playerTeam: BattleSquaddieTeam =
            BattlePhaseService.findTeamsOfAffiliation(
                gameEngineState.battleOrchestratorState.battleState.teams,
                SquaddieAffiliation.PLAYER
            )[0]
        let squaddieToPanToBattleId = playerTeam.battleSquaddieIds.find(
            (id) => {
                if (repository == undefined) return false
                const { squaddieTemplate, battleSquaddie } =
                    ObjectRepositoryService.getSquaddieByBattleId(
                        repository,
                        id
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
        if (
            MissionMapSquaddieCoordinateService.isValid(mapDatum) &&
            mapDatum.currentMapCoordinate != undefined
        ) {
            const squaddieScreenLocation =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: mapDatum.currentMapCoordinate,
                    cameraLocation:
                        gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
                })
            if (
                GraphicsConfig.isLocationWithinMiddleThirdOfScreen(
                    squaddieScreenLocation.x,
                    squaddieScreenLocation.y
                )
            ) {
                return
            }

            const squaddieWorldLocation =
                ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                    mapCoordinate: mapDatum.currentMapCoordinate,
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
