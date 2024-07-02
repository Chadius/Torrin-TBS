import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import { convertMapCoordinatesToWorldCoordinates } from "../../hexMap/convertCoordinates"
import { KeyButtonName, KeyWasPressed } from "../../utils/keyboardConfig"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { MissionMapSquaddieLocationHandler } from "../../missionMap/squaddieLocation"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { isValidValue } from "../../utils/validityCheck"
import { MissionMapService } from "../../missionMap/missionMap"
import { SummaryHUDStateService } from "./summaryHUD"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { RectAreaService } from "../../ui/rectArea"
import { HEX_TILE_WIDTH } from "../../graphicsConstants"

export class BattleSquaddieSelectedHUD {
    nextBattleSquaddieIds: string[]

    constructor() {
        this.reset()
    }

    selectSquaddieAndDrawWindow({
        battleId,
        repositionWindow,
        gameEngineState,
    }: {
        battleId: string
        repositionWindow?: {
            mouseX: number
            mouseY: number
        }
        gameEngineState: GameEngineState
    }) {
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            SummaryHUDStateService.new({
                battleSquaddieId: battleId,
                mouseSelectionLocation: repositionWindow
                    ? {
                          x: repositionWindow.mouseX,
                          y: repositionWindow.mouseY,
                      }
                    : { x: 0, y: 0 },
            })
        SummaryHUDStateService.update({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            objectRepository: gameEngineState.repository,
            gameEngineState,
            resourceHandler: gameEngineState.resourceHandler,
        })
    }

    draw(gameEngineState: GameEngineState, graphicsContext: GraphicsBuffer) {
        if (
            !gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.showSummaryHUD
        ) {
            return
        }
        SummaryHUDStateService.draw({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            graphicsBuffer: graphicsContext,
            gameEngineState,
        })
    }

    keyPressed(keyCode: number, gameEngineState: GameEngineState) {
        const pressedTheNextSquaddieKey: boolean = KeyWasPressed(
            KeyButtonName.NEXT_SQUADDIE,
            keyCode
        )
        if (pressedTheNextSquaddieKey) {
            this.selectNextSquaddie(gameEngineState)
        }
    }

    reset() {
        this.nextBattleSquaddieIds = []
    }

    private selectNextSquaddie(gameEngineState: GameEngineState) {
        if (this.nextBattleSquaddieIds.length === 0) {
            this.nextBattleSquaddieIds =
                getPlayerControllableSquaddiesWhoCanActAndOnTheMap(
                    gameEngineState
                ).map((info) => info.battleSquaddieId)
        }

        if (this.nextBattleSquaddieIds.length === 0) {
            return
        }

        const nextBattleSquaddieId: string = this.nextBattleSquaddieIds.find(
            (id) =>
                !isValidValue(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState
                ) ||
                id !==
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.battleSquaddieId
        )

        this.nextBattleSquaddieIds = this.nextBattleSquaddieIds.filter(
            (id) => id != nextBattleSquaddieId
        )

        const selectedMapCoordinates =
            gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                nextBattleSquaddieId
            )
        if (MissionMapSquaddieLocationHandler.isValid(selectedMapCoordinates)) {
            const selectedWorldCoordinates =
                convertMapCoordinatesToWorldCoordinates(
                    selectedMapCoordinates.mapLocation.q,
                    selectedMapCoordinates.mapLocation.r
                )
            gameEngineState.battleOrchestratorState.battleState.camera.pan({
                xDestination: selectedWorldCoordinates[0],
                yDestination: selectedWorldCoordinates[1],
                timeToPan: 500,
                respectConstraints: true,
            })
        }

        let repositionWindow = {
            mouseX: ScreenDimensions.SCREEN_WIDTH / 2,
            mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
        }
        if (
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.playerCommandState?.playerCommandWindow
        ) {
            repositionWindow.mouseX =
                RectAreaService.left(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState.playerCommandWindow
                        .area
                ) + HEX_TILE_WIDTH
            repositionWindow.mouseY =
                RectAreaService.top(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState.playerCommandWindow
                        .area
                ) - HEX_TILE_WIDTH
        }

        this.selectSquaddieAndDrawWindow({
            battleId: nextBattleSquaddieId,
            gameEngineState: gameEngineState,
            repositionWindow,
        })
    }
}

const getPlayerControllableSquaddiesWhoCanActAndOnTheMap = (
    gameEngineState: GameEngineState
) =>
    ObjectRepositoryService.getBattleSquaddieIterator(
        gameEngineState.repository
    ).filter((info) => {
        return (
            isSquaddiePlayerControllableRightNow(
                info.battleSquaddieId,
                gameEngineState
            ) === true &&
            MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                info.battleSquaddieId
            ).mapLocation !== undefined
        )
    })

const isSquaddiePlayerControllableRightNow = (
    battleSquaddieId: string,
    gameEngineState: GameEngineState
): boolean => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieId
        )
    )

    const { playerCanControlThisSquaddieRightNow } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })

    return playerCanControlThisSquaddieRightNow
}
