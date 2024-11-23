import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
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
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import {
    ActionPanelPosition,
    SquaddieNameAndPortraitTile,
    SquaddieNameAndPortraitTileService,
} from "./playerActionPanel/tile/squaddieNameAndPortraitTile"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { RectAreaService } from "../../ui/rectArea"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"

const SUMMARY_POPOVER_PEEK_EXPIRATION_MS = 2000

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
    squaddiePanels: {
        [ActionPanelPosition.ACTOR]: SquaddieNameAndPortraitTile
        [ActionPanelPosition.PEEK_PLAYABLE]: SquaddieNameAndPortraitTile
        [ActionPanelPosition.PEEK_RIGHT]: SquaddieNameAndPortraitTile
    }
    squaddieToPeekAt?: {
        battleSquaddieId: string
        actionPanelPosition: ActionPanelPosition
        expirationTime: number
    }
}

export const SummaryHUDStateService = {
    new: ({
        mouseSelectionLocation,
    }: {
        mouseSelectionLocation: { x: number; y: number }
    }): SummaryHUDState => {
        return {
            playerCommandState: PlayerCommandStateService.new(),
            showPlayerCommand: false,
            showSummaryHUD: false,
            mouseSelectionLocation,
            squaddieSummaryPopoversByType: {
                MAIN: undefined,
                TARGET: undefined,
            },
            squaddiePanels: {
                [ActionPanelPosition.ACTOR]: undefined,
                [ActionPanelPosition.PEEK_PLAYABLE]: undefined,
                [ActionPanelPosition.PEEK_RIGHT]: undefined,
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
        if (
            summaryHUDState.squaddiePanels[ActionPanelPosition.ACTOR] &&
            RectAreaService.isInside(
                SquaddieNameAndPortraitTileService.getBoundingBoxBasedOnActionPanelPosition(
                    ActionPanelPosition.ACTOR
                ),
                mouseSelectionLocation.x,
                mouseSelectionLocation.y
            )
        ) {
            return true
        }

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
        drawOldStuff({
            summaryHUDState,
            gameEngineState,
            graphicsBuffer,
        })

        drawActorPanel({
            summaryHUDState,
            graphicsBuffer,
            gameEngineState,
        })
        drawPeekPlayablePanel({
            summaryHUDState,
            graphicsBuffer,
            gameEngineState,
        })
        drawPeekRightPanel({
            summaryHUDState,
            graphicsBuffer,
            gameEngineState,
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
    removeSummaryPopover: ({
        summaryHUDState,
        popoverType,
    }: {
        summaryHUDState: SummaryHUDState
        popoverType: SummaryPopoverType
    }) => {
        summaryHUDState.squaddieSummaryPopoversByType[popoverType] = undefined
    },
    peekAtSquaddie: ({
        gameEngineState,
        battleSquaddieId,
        summaryHUDState,
    }: {
        summaryHUDState: SummaryHUDState
        gameEngineState: GameEngineState
        battleSquaddieId: string
    }) => {
        if (
            battleSquaddieId ===
            summaryHUDState.squaddiePanels[ActionPanelPosition.ACTOR]
                ?.battleSquaddieId
        ) {
            return
        }

        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )

        const { squaddieHasThePlayerControlledAffiliation } =
            SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })

        let actionPanelPosition: ActionPanelPosition
        switch (true) {
            case !!summaryHUDState.squaddiePanels[ActionPanelPosition.ACTOR]:
                actionPanelPosition = ActionPanelPosition.PEEK_RIGHT
                break
            case squaddieHasThePlayerControlledAffiliation:
                actionPanelPosition = ActionPanelPosition.PEEK_PLAYABLE
                break
            default:
                actionPanelPosition = ActionPanelPosition.PEEK_RIGHT
                break
        }
        summaryHUDState.squaddieToPeekAt = {
            battleSquaddieId,
            actionPanelPosition,
            expirationTime: Date.now() + SUMMARY_POPOVER_PEEK_EXPIRATION_MS,
        }
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

const sendMessageIfPopoverExpired = ({
    summaryHUDState,
    popoverType,
    gameEngineState,
}: {
    summaryHUDState: SummaryHUDState
    popoverType: SummaryPopoverType
    gameEngineState: GameEngineState
}) => {
    if (hasSummaryPopoverExpired({ summaryHUDState, popoverType })) {
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.SUMMARY_POPOVER_EXPIRES,
            gameEngineState,
            popoverType,
        })
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

const drawActorPanel = ({
    graphicsBuffer,
    gameEngineState,
    summaryHUDState,
}: {
    graphicsBuffer: GraphicsBuffer
    gameEngineState: GameEngineState
    summaryHUDState: SummaryHUDState
}) => {
    if (
        !BattleActionDecisionStepService.isActorSet(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    ) {
        summaryHUDState.squaddiePanels[ActionPanelPosition.ACTOR] = undefined
        return
    }

    const battleSquaddieId = BattleActionDecisionStepService.getActor(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    ).battleSquaddieId

    if (
        summaryHUDState.squaddiePanels[ActionPanelPosition.ACTOR] === undefined
    ) {
        createSquaddieNameAndPortraitTile({
            gameEngineState,
            battleSquaddieId,
            summaryHUDState,
            actionPanelPosition: ActionPanelPosition.ACTOR,
        })
    }

    SquaddieNameAndPortraitTileService.draw({
        tile: summaryHUDState.squaddiePanels[ActionPanelPosition.ACTOR],
        graphicsContext: graphicsBuffer,
        resourceHandler: gameEngineState.resourceHandler,
    })
}

const drawPeekPlayablePanel = ({
    graphicsBuffer,
    gameEngineState,
    summaryHUDState,
}: {
    graphicsBuffer: GraphicsBuffer
    gameEngineState: GameEngineState
    summaryHUDState: SummaryHUDState
}) => {
    drawPeekablePanel({
        graphicsBuffer,
        gameEngineState,
        summaryHUDState,
        actionPanelPosition: ActionPanelPosition.PEEK_PLAYABLE,
    })
}

const drawPeekRightPanel = ({
    graphicsBuffer,
    gameEngineState,
    summaryHUDState,
}: {
    graphicsBuffer: GraphicsBuffer
    gameEngineState: GameEngineState
    summaryHUDState: SummaryHUDState
}) => {
    drawPeekablePanel({
        graphicsBuffer,
        gameEngineState,
        summaryHUDState,
        actionPanelPosition: ActionPanelPosition.PEEK_RIGHT,
    })
}

const drawPeekablePanel = ({
    graphicsBuffer,
    gameEngineState,
    summaryHUDState,
    actionPanelPosition,
}: {
    graphicsBuffer: GraphicsBuffer
    gameEngineState: GameEngineState
    summaryHUDState: SummaryHUDState
    actionPanelPosition: ActionPanelPosition
}) => {
    if (
        summaryHUDState.squaddieToPeekAt?.actionPanelPosition !==
        actionPanelPosition
    ) {
        summaryHUDState.squaddiePanels[actionPanelPosition] = undefined
        return
    }

    if (
        Date.now() > summaryHUDState.squaddieToPeekAt?.expirationTime &&
        !!summaryHUDState.squaddiePanels[actionPanelPosition]
    ) {
        summaryHUDState.squaddiePanels[actionPanelPosition] = undefined
        summaryHUDState.squaddieToPeekAt = undefined
        return
    }

    const battleSquaddieId = summaryHUDState.squaddieToPeekAt.battleSquaddieId

    if (
        summaryHUDState.squaddiePanels[actionPanelPosition] === undefined ||
        summaryHUDState.squaddiePanels[actionPanelPosition].battleSquaddieId !==
            battleSquaddieId
    ) {
        createSquaddieNameAndPortraitTile({
            gameEngineState,
            battleSquaddieId,
            summaryHUDState,
            actionPanelPosition: actionPanelPosition,
        })
    }

    SquaddieNameAndPortraitTileService.draw({
        tile: summaryHUDState.squaddiePanels[actionPanelPosition],
        graphicsContext: graphicsBuffer,
        resourceHandler: gameEngineState.resourceHandler,
    })
}

const createSquaddieNameAndPortraitTile = ({
    gameEngineState,
    battleSquaddieId,
    summaryHUDState,
    actionPanelPosition,
}: {
    gameEngineState: GameEngineState
    battleSquaddieId: string
    summaryHUDState: SummaryHUDState
    actionPanelPosition: ActionPanelPosition
}) => {
    const team = gameEngineState.battleOrchestratorState.battleState.teams.find(
        (t) => t.battleSquaddieIds.includes(battleSquaddieId)
    )
    summaryHUDState.squaddiePanels[actionPanelPosition] =
        SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
            battleSquaddieId: battleSquaddieId,
            objectRepository: gameEngineState.repository,
            team,
            horizontalPosition: actionPanelPosition,
        })
}

const drawOldStuff = ({
    summaryHUDState,
    gameEngineState,
    graphicsBuffer,
}: {
    summaryHUDState: SummaryHUDState
    gameEngineState: GameEngineState
    graphicsBuffer: GraphicsBuffer
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
            sendMessageIfPopoverExpired({
                summaryHUDState,
                popoverType,
                gameEngineState,
            })
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
                    summaryHUDState.squaddieSummaryPopoversByType[popoverType],
            })
        })
}
