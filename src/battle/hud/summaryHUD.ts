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
    SquaddieSummaryPopoverPosition,
    SquaddieSummaryPopoverService,
} from "./playerActionPanel/squaddieSummaryPopover"
import { isValidValue } from "../../utils/validityCheck"

export enum SummaryPopoverType {
    MAIN = "MAIN",
    TARGET = "TARGET",
}

const SUMMARY_WINDOW_DISPLAY = {
    squaddieSummaryPopoversByType: {
        MAIN: 0,
        TARGET: 9,
    },
}

export interface SummaryHUDState {
    showPlayerCommand: boolean
    showSummaryHUD: boolean
    playerCommandState: PlayerCommandState
    mouseSelectionLocation: { x: number; y: number }
    squaddieSummaryPopoversByType: {
        [t in SummaryPopoverType]: SquaddieSummaryPopover
    }
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
            squaddieSummaryPopoversByType: {
                MAIN: undefined,
                TARGET: undefined,
            },
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
            summaryHUDState.squaddieSummaryPopoversByType.MAIN,
            summaryHUDState.squaddieSummaryPopoversByType.TARGET,
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

        ;[SummaryPopoverType.MAIN, SummaryPopoverType.TARGET]
            .filter(
                (popoverType) =>
                    !!summaryHUDState.squaddieSummaryPopoversByType[popoverType]
            )
            .map((popoverType) => {
                removeSummaryPopoverIfExpired({ summaryHUDState, popoverType })
                return popoverType
            })
            .filter(
                (popoverType) =>
                    !!summaryHUDState.squaddieSummaryPopoversByType[popoverType]
            )
            .forEach((popoverType) => {
                SquaddieSummaryPopoverService.draw({
                    graphicsBuffer,
                    gameEngineState,
                    squaddieSummaryPopover:
                        summaryHUDState.squaddieSummaryPopoversByType[
                            popoverType
                        ],
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
        position,
        expirationTime,
    }: {
        summaryHUDState: SummaryHUDState
        gameEngineState: GameEngineState
        objectRepository: ObjectRepository
        resourceHandler: ResourceHandler
        battleSquaddieId: string
        position: SquaddieSummaryPopoverPosition
        expirationTime?: number
    }) => {
        maybeCreateSummaryPanel({
            summaryHUDState,
            battleSquaddieId,
            popoverType: SummaryPopoverType.MAIN,
            expirationTime,
            position,
        })
        SquaddieSummaryPopoverService.update({
            objectRepository,
            gameEngineState,
            resourceHandler,
            squaddieSummaryPopover:
                summaryHUDState.squaddieSummaryPopoversByType.MAIN,
        })
    },
    setTargetSummaryPopover: ({
        summaryHUDState,
        gameEngineState,
        objectRepository,
        resourceHandler,
        battleSquaddieId,
        expirationTime,
        position,
    }: {
        summaryHUDState: SummaryHUDState
        gameEngineState: GameEngineState
        objectRepository: ObjectRepository
        resourceHandler: ResourceHandler
        battleSquaddieId: string
        position: SquaddieSummaryPopoverPosition
        expirationTime?: number
    }) => {
        maybeCreateSummaryPanel({
            summaryHUDState,
            battleSquaddieId,
            popoverType: SummaryPopoverType.TARGET,
            expirationTime,
            position,
        })
        SquaddieSummaryPopoverService.update({
            objectRepository,
            gameEngineState,
            resourceHandler,
            squaddieSummaryPopover:
                summaryHUDState.squaddieSummaryPopoversByType.TARGET,
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
        if (
            !isValidValue(summaryHUDState?.squaddieSummaryPopoversByType.MAIN)
        ) {
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
                summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId,
        })
    },
    hasMainSummaryPopoverExpired: ({
        summaryHUDState,
    }: {
        summaryHUDState: SummaryHUDState
    }): boolean => {
        return hasSummaryPopoverExpired({
            summaryHUDState,
            popoverType: SummaryPopoverType.MAIN,
        })
    },
    removeMainSummaryPopoverIfExpired: ({
        summaryHUDState,
    }: {
        summaryHUDState: SummaryHUDState
    }) => {
        removeSummaryPopoverIfExpired({
            summaryHUDState,
            popoverType: SummaryPopoverType.MAIN,
        })
    },
    hasTargetSummaryPopoverExpired: ({
        summaryHUDState,
    }: {
        summaryHUDState: SummaryHUDState
    }): boolean => {
        return hasSummaryPopoverExpired({
            summaryHUDState,
            popoverType: SummaryPopoverType.TARGET,
        })
    },
    removeTargetSummaryPopoverIfExpired: ({
        summaryHUDState,
    }: {
        summaryHUDState: SummaryHUDState
    }) => {
        removeSummaryPopoverIfExpired({
            summaryHUDState,
            popoverType: SummaryPopoverType.TARGET,
        })
    },
}

const maybeCreateSummaryPanel = ({
    summaryHUDState,
    battleSquaddieId,
    popoverType,
    expirationTime,
    position,
}: {
    summaryHUDState: SummaryHUDState
    battleSquaddieId: string
    popoverType: SummaryPopoverType
    position: SquaddieSummaryPopoverPosition
    expirationTime?: number
}) => {
    if (!isValidValue(battleSquaddieId) || battleSquaddieId === "") {
        return
    }

    const newPanel = SquaddieSummaryPopoverService.new({
        battleSquaddieId: battleSquaddieId,
        startingColumn:
            SUMMARY_WINDOW_DISPLAY.squaddieSummaryPopoversByType[popoverType],
        expirationTime,
        position,
    })

    if (
        !shouldReplacePopover(
            summaryHUDState.squaddieSummaryPopoversByType[popoverType],
            expirationTime
        )
    ) {
        return
    }

    summaryHUDState.showSummaryHUD = true
    summaryHUDState.squaddieSummaryPopoversByType[popoverType] = newPanel
}

const shouldReplacePopover = (
    popover: SquaddieSummaryPopover,
    expirationTime?: number
) => {
    const summaryPopoverExists: boolean = isValidValue(popover)
    const summaryPopoverWillExpireOverTime: boolean =
        summaryPopoverExists && isValidValue(popover.expirationTime)
    const newPopoverWillExpireOverTime: boolean = isValidValue(expirationTime)

    return !(
        summaryPopoverExists &&
        !summaryPopoverWillExpireOverTime &&
        newPopoverWillExpireOverTime
    )
}

const removeSummaryPopoverIfExpired = ({
    summaryHUDState,
    popoverType,
}: {
    summaryHUDState: SummaryHUDState
    popoverType: SummaryPopoverType
}) => {
    if (hasSummaryPopoverExpired({ summaryHUDState, popoverType })) {
        summaryHUDState.squaddieSummaryPopoversByType[popoverType] = undefined
    }
}

const hasSummaryPopoverExpired = ({
    summaryHUDState,
    popoverType,
}: {
    summaryHUDState: SummaryHUDState
    popoverType: SummaryPopoverType
}) => {
    if (
        !isValidValue(
            summaryHUDState.squaddieSummaryPopoversByType[popoverType]
                ?.expirationTime
        )
    ) {
        return false
    }

    return (
        Date.now() >
        summaryHUDState.squaddieSummaryPopoversByType[popoverType]
            ?.expirationTime
    )
}
