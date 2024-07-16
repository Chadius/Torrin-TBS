import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ObjectRepository } from "../objectRepository"
import {
    PlayerCommandSelection,
    PlayerCommandState,
    PlayerCommandStateService,
} from "./playerCommandHUD"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ResourceHandler } from "../../resource/resourceHandler"
import { MouseButton } from "../../utils/mouseConfig"
import {
    SquaddieSummaryPopover,
    SquaddieSummaryPopoverService,
} from "./playerActionPanel/squaddieSummaryPopover"
import { isValidValue } from "../../utils/validityCheck"

const SUMMARY_WINDOW_DISPLAY = {
    summaryPopoverStartColumns: [0, 9],
}

export interface SummaryHUDState {
    showPlayerCommand: boolean
    showSummaryHUD: boolean
    playerCommandState: PlayerCommandState
    mouseSelectionLocation: { x: number; y: number }

    summaryPopoverMain?: SquaddieSummaryPopover
    summaryPopoverTarget?: SquaddieSummaryPopover
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
            summaryHUDState.summaryPopoverMain,
            summaryHUDState.summaryPopoverTarget,
        ]
            .filter((x) => x)
            .some((popover: SquaddieSummaryPopover) =>
                SquaddieSummaryPopoverService.isMouseHoveringOver({
                    mouseLocation: {
                        x: mouseSelectionLocation.x,
                        y: mouseSelectionLocation.y,
                    },
                    squaddieSummaryPopover: popover,
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

        ;[
            summaryHUDState.summaryPopoverMain,
            summaryHUDState.summaryPopoverTarget,
        ]
            .filter((x) => x)
            .forEach((popover) => {
                SquaddieSummaryPopoverService.draw({
                    graphicsBuffer,
                    gameEngineState,
                    squaddieSummaryPopover: popover,
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
    setMainSummaryPopover: ({
        summaryHUDState,
        gameEngineState,
        objectRepository,
        resourceHandler,
        battleSquaddieId,
        lockPopover,
    }: {
        summaryHUDState: SummaryHUDState
        gameEngineState: GameEngineState
        objectRepository: ObjectRepository
        resourceHandler: ResourceHandler
        battleSquaddieId: string
        lockPopover: boolean
    }) => {
        maybeCreateSummaryPanel({
            summaryHUDState,
            battleSquaddieId,
            createMainPanel: true,
        })
        SquaddieSummaryPopoverService.update({
            objectRepository,
            gameEngineState,
            resourceHandler,
            squaddieSummaryPopover: summaryHUDState.summaryPopoverMain,
        })
    },
    setTargetSummaryPopover: ({
        summaryHUDState,
        gameEngineState,
        objectRepository,
        resourceHandler,
        battleSquaddieId,
        lockPopover,
    }: {
        summaryHUDState: SummaryHUDState
        gameEngineState: GameEngineState
        objectRepository: ObjectRepository
        resourceHandler: ResourceHandler
        battleSquaddieId: string
        lockPopover: boolean
    }) => {
        maybeCreateSummaryPanel({
            summaryHUDState,
            battleSquaddieId,
            createMainPanel: false,
        })
        SquaddieSummaryPopoverService.update({
            objectRepository,
            gameEngineState,
            resourceHandler,
            squaddieSummaryPopover: summaryHUDState.summaryPopoverTarget,
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

        PlayerCommandStateService.mouseMoved({
            mouseX,
            mouseY,
            gameEngineState,
            playerCommandState: summaryHUDState.playerCommandState,
        })
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
        if (!isValidValue(summaryHUDState?.summaryPopoverMain)) {
            return
        }

        summaryHUDState.showPlayerCommand = true
        PlayerCommandStateService.createCommandWindow({
            playerCommandState: summaryHUDState.playerCommandState,
            summaryHUDState,
            objectRepository,
            gameEngineState,
            resourceHandler,
            battleSquaddieId:
                summaryHUDState.summaryPopoverMain.battleSquaddieId,
        })
    },
}

const maybeCreateSummaryPanel = ({
    summaryHUDState,
    battleSquaddieId,
    createMainPanel,
}: {
    summaryHUDState: SummaryHUDState
    battleSquaddieId: string
    createMainPanel: boolean
}) => {
    if (!isValidValue(battleSquaddieId) || battleSquaddieId === "") {
        return
    }

    summaryHUDState.showSummaryHUD = true

    const newPanel = SquaddieSummaryPopoverService.new({
        battleSquaddieId: battleSquaddieId,
        startingColumn: createMainPanel
            ? SUMMARY_WINDOW_DISPLAY.summaryPopoverStartColumns[0]
            : SUMMARY_WINDOW_DISPLAY.summaryPopoverStartColumns[1],
    })

    if (createMainPanel) {
        summaryHUDState.summaryPopoverMain = newPanel
        return
    }
    summaryHUDState.summaryPopoverTarget = newPanel
}
