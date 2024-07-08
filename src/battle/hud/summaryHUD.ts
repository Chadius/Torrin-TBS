import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ObjectRepository } from "../objectRepository"
import {
    PlayerCommandSelection,
    PlayerCommandState,
    PlayerCommandStateService,
} from "./playerCommandHUD"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { ResourceHandler } from "../../resource/resourceHandler"
import { MouseButton } from "../../utils/mouseConfig"
import { ButtonStatus } from "../../ui/button"
import {
    SquaddieSummaryPanel,
    SquaddieSummaryPanelService,
} from "./playerActionPanel/squaddieSummaryPanel"
import { isValidValue } from "../../utils/validityCheck"

const SUMMARY_WINDOW_DISPLAY = {
    summaryPanelStartColumns: [0, 9],
}

export interface SummaryHUDState {
    showPlayerCommand: boolean
    showSummaryHUD: boolean
    playerCommandState: PlayerCommandState
    mouseSelectionLocation: { x: number; y: number }

    summaryPanelLeft?: SquaddieSummaryPanel
    summaryPanelRight?: SquaddieSummaryPanel
}

export const SummaryHUDStateService = {
    new: ({
        mouseSelectionLocation,
    }: {
        mouseSelectionLocation: { x: number; y: number }
    }): SummaryHUDState => {
        return {
            playerCommandState: PlayerCommandStateService.new({}),
            showPlayerCommand: false,
            showSummaryHUD: false,
            mouseSelectionLocation,
        }
    },
    mouseClicked: ({
        mouseX,
        mouseButton,
        mouseY,
        summaryHUDState,
        gameEngineState,
    }: {
        mouseX: number
        mouseButton: MouseButton
        summaryHUDState: SummaryHUDState
        mouseY: number
        gameEngineState: GameEngineState
    }): PlayerCommandSelection => {
        if (!summaryHUDState?.showPlayerCommand) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        return PlayerCommandStateService.mouseClicked({
            mouseX,
            mouseButton,
            mouseY,
            gameEngineState,
            playerCommandState: summaryHUDState.playerCommandState,
        })
    },
    isMouseHoveringOver: ({
        summaryHUDState,
        mouseSelectionLocation,
    }: {
        mouseSelectionLocation: { x: number; y: number }
        summaryHUDState: SummaryHUDState
    }): boolean => {
        if (!summaryHUDState.showSummaryHUD) {
            return false
        }

        return [
            summaryHUDState.summaryPanelLeft,
            summaryHUDState.summaryPanelRight,
        ]
            .filter((x) => x)
            .some((panel: SquaddieSummaryPanel) =>
                SquaddieSummaryPanelService.isMouseHoveringOver({
                    mouseLocation: {
                        x: mouseSelectionLocation.x,
                        y: mouseSelectionLocation.y,
                    },
                    squaddieSummaryPanel: panel,
                })
            )
    },
    draw: ({
        summaryHUDState,
        graphicsBuffer,
        gameEngineState,
    }: {
        summaryHUDState: SummaryHUDState
        graphicsBuffer: GraphicsBuffer
        gameEngineState: GameEngineState
    }) => {
        if (!summaryHUDState.showSummaryHUD) {
            return
        }

        ;[summaryHUDState.summaryPanelLeft, summaryHUDState.summaryPanelRight]
            .filter((x) => x)
            .forEach((panel) => {
                SquaddieSummaryPanelService.draw({
                    graphicsBuffer,
                    gameEngineState,
                    squaddieSummaryPanel: panel,
                })
            })

        if (summaryHUDState.showPlayerCommand) {
            PlayerCommandStateService.draw({
                playerCommandState: summaryHUDState.playerCommandState,
                graphicsBuffer,
                gameEngineState,
            })
        }
    },
    setLeftSummaryPanel: ({
        summaryHUDState,
        gameEngineState,
        objectRepository,
        resourceHandler,
        battleSquaddieId,
    }: {
        summaryHUDState: SummaryHUDState
        gameEngineState: GameEngineState
        objectRepository: ObjectRepository
        resourceHandler: ResourceHandler
        battleSquaddieId: string
    }) => {
        maybeCreateSummaryPanel({
            summaryHUDState,
            battleSquaddieId,
            summaryPanelIsOnLeftSide: true,
        })
        SquaddieSummaryPanelService.update({
            objectRepository,
            gameEngineState,
            resourceHandler,
            squaddieSummaryPanel: summaryHUDState.summaryPanelLeft,
        })
    },
    setRightSummaryPanel: ({
        summaryHUDState,
        gameEngineState,
        objectRepository,
        resourceHandler,
        battleSquaddieId,
    }: {
        summaryHUDState: SummaryHUDState
        gameEngineState: GameEngineState
        objectRepository: ObjectRepository
        resourceHandler: ResourceHandler
        battleSquaddieId: string
    }) => {
        maybeCreateSummaryPanel({
            summaryHUDState,
            battleSquaddieId,
            summaryPanelIsOnLeftSide: false,
        })
        SquaddieSummaryPanelService.update({
            objectRepository,
            gameEngineState,
            resourceHandler,
            squaddieSummaryPanel: summaryHUDState.summaryPanelRight,
        })
    },
    mouseMoved: ({
        mouseY,
        mouseX,
        summaryHUDState,
        gameEngineState,
    }: {
        mouseX: number
        summaryHUDState: SummaryHUDState
        mouseY: number
        gameEngineState: GameEngineState
    }) => {
        if (!summaryHUDState.showPlayerCommand) {
            return
        }

        const changeButtonStatusBasedOnMouseLocation = (button: {
            buttonArea: RectArea
            status: ButtonStatus
        }) => {
            const isMouseInsideButton = RectAreaService.isInside(
                button.buttonArea,
                mouseX,
                mouseY
            )

            if (button.status === ButtonStatus.HOVER && !isMouseInsideButton) {
                button.status = ButtonStatus.ACTIVE
                return
            }

            if (button.status === ButtonStatus.ACTIVE && isMouseInsideButton) {
                button.status = ButtonStatus.HOVER
            }
        }

        summaryHUDState.playerCommandState.actionButtons.forEach((button) => {
            changeButtonStatusBasedOnMouseLocation(button)
        })
        changeButtonStatusBasedOnMouseLocation(
            summaryHUDState.playerCommandState.moveButton
        )
        changeButtonStatusBasedOnMouseLocation(
            summaryHUDState.playerCommandState.endTurnButton
        )
    },
    createCommandWindow: ({
        summaryHUDState,
        objectRepository,
        gameEngineState,
        resourceHandler,
    }: {
        summaryHUDState: SummaryHUDState
        objectRepository: ObjectRepository
        gameEngineState: GameEngineState
        resourceHandler: ResourceHandler
    }) => {
        if (!isValidValue(summaryHUDState?.summaryPanelLeft)) {
            return
        }

        summaryHUDState.showPlayerCommand = true
        PlayerCommandStateService.createCommandWindow({
            playerCommandState: summaryHUDState.playerCommandState,
            summaryHUDState,
            objectRepository,
            gameEngineState,
            resourceHandler,
            battleSquaddieId: summaryHUDState.summaryPanelLeft.battleSquaddieId,
        })
    },
}

const maybeCreateSummaryPanel = ({
    summaryHUDState,
    battleSquaddieId,
    summaryPanelIsOnLeftSide,
}: {
    summaryHUDState: SummaryHUDState
    battleSquaddieId: string
    summaryPanelIsOnLeftSide: boolean
}) => {
    if (!isValidValue(battleSquaddieId) || battleSquaddieId === "") {
        return
    }

    summaryHUDState.showSummaryHUD = true

    const newPanel = SquaddieSummaryPanelService.new({
        battleSquaddieId: battleSquaddieId,
        startingColumn: summaryPanelIsOnLeftSide
            ? SUMMARY_WINDOW_DISPLAY.summaryPanelStartColumns[0]
            : SUMMARY_WINDOW_DISPLAY.summaryPanelStartColumns[1],
    })

    if (summaryPanelIsOnLeftSide) {
        summaryHUDState.summaryPanelLeft = newPanel
        return
    }
    summaryHUDState.summaryPanelRight = newPanel
}
