import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import {
    PlayerCommandSelection,
    PlayerCommandState,
    PlayerCommandStateService,
} from "../playerCommand/playerCommandHUD"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { MouseButton } from "../../../utils/mouseConfig"
import { isValidValue } from "../../../utils/validityCheck"
import {
    SquaddieNameAndPortraitTile,
    SquaddieNameAndPortraitTileService,
} from "../playerActionPanel/tile/squaddieNameAndPortraitTile"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { RectAreaService } from "../../../ui/rectArea"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { MissionMapService } from "../../../missionMap/missionMap"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "../playerActionPanel/tile/actionTilePosition"
import {
    SquaddieStatusTile,
    SquaddieStatusTileService,
} from "../playerActionPanel/tile/squaddieStatusTile"
import {
    ActionSelectedTile,
    ActionSelectedTileService,
} from "../playerActionPanel/tile/actionSelectedTile"
import {
    ActionPreviewTile,
    ActionPreviewTileService,
} from "../playerActionPanel/tile/actionPreviewTile/actionPreviewTile"

export const SUMMARY_HUD_PEEK_EXPIRATION_MS = 2000

const ActionPanelPositionForNames = [
    ActionTilePosition.ACTOR_NAME,
    ActionTilePosition.PEEK_PLAYABLE_NAME,
    ActionTilePosition.PEEK_RIGHT_NAME,
    ActionTilePosition.TARGET_NAME,
]

const ActionPanelPositionForStatus = [
    ActionTilePosition.PEEK_PLAYABLE_STATUS,
    ActionTilePosition.PEEK_RIGHT_STATUS,
    ActionTilePosition.ACTOR_STATUS,
    ActionTilePosition.TARGET_STATUS,
]

export interface SummaryHUDState {
    showPlayerCommand: boolean
    playerCommandState: PlayerCommandState
    screenSelectionCoordinates: { x: number; y: number }
    squaddieNameTiles: {
        [q in ActionTilePosition]?: SquaddieNameAndPortraitTile
    }
    squaddieStatusTiles: {
        [q in ActionTilePosition]?: SquaddieStatusTile
    }
    actionSelectedTile: ActionSelectedTile
    actionPreviewTile: ActionPreviewTile
    squaddieToPeekAt?: {
        battleSquaddieId: string
        actionPanelPositions: {
            nameAndPortrait: ActionTilePosition
            status: ActionTilePosition
        }
        expirationTime: number
    }
}

export const SummaryHUDStateService = {
    new: ({
        screenSelectionCoordinates,
    }: {
        screenSelectionCoordinates?: { x: number; y: number }
    }): SummaryHUDState => ({
        playerCommandState: PlayerCommandStateService.new(),
        showPlayerCommand: false,
        screenSelectionCoordinates,
        actionSelectedTile: undefined,
        actionPreviewTile: undefined,
        squaddieNameTiles: {
            [ActionTilePosition.ACTOR_NAME]: undefined,
            [ActionTilePosition.PEEK_PLAYABLE_NAME]: undefined,
            [ActionTilePosition.PEEK_RIGHT_NAME]: undefined,
            [ActionTilePosition.TARGET_NAME]: undefined,
        },
        squaddieStatusTiles: {
            [ActionTilePosition.PEEK_PLAYABLE_STATUS]: undefined,
            [ActionTilePosition.PEEK_RIGHT_STATUS]: undefined,
            [ActionTilePosition.ACTOR_STATUS]: undefined,
            [ActionTilePosition.TARGET_STATUS]: undefined,
        },
    }),
    isMouseHoveringOver: ({
        summaryHUDState,
        mouseSelectionLocation,
    }: {
        mouseSelectionLocation: { x: number; y: number }
        summaryHUDState: SummaryHUDState
    }): boolean => {
        if (
            Object.entries(summaryHUDState.squaddieNameTiles)
                .filter(([_, tile]) => isValidValue(tile))
                .map(([position, _]) => position as ActionTilePosition)
                .some((position) =>
                    RectAreaService.isInside(
                        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                            position
                        ),
                        mouseSelectionLocation.x,
                        mouseSelectionLocation.y
                    )
                )
        ) {
            return true
        }

        return Object.entries(summaryHUDState.squaddieStatusTiles)
            .filter(([_, tile]) => isValidValue(tile))
            .map(([position, _]) => position as ActionTilePosition)
            .some((position) =>
                RectAreaService.isInside(
                    ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                        position
                    ),
                    mouseSelectionLocation.x,
                    mouseSelectionLocation.y
                )
            )
    },
    mouseClicked: ({
        mouseX,
        mouseButton,
        mouseY,
        summaryHUDState,
    }: {
        mouseX: number
        mouseButton: MouseButton
        summaryHUDState: SummaryHUDState
        mouseY: number
    }): PlayerCommandSelection => {
        if (!summaryHUDState?.showPlayerCommand) {
            return PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        }

        return PlayerCommandStateService.mouseClicked({
            mouseX,
            mouseButton,
            mouseY,
            playerCommandState: summaryHUDState.playerCommandState,
        })
    },
    draw: ({
        summaryHUDState,
        graphicsBuffer,
        gameEngineState,
        resourceHandler,
    }: {
        summaryHUDState: SummaryHUDState
        graphicsBuffer: GraphicsBuffer
        gameEngineState: GameEngineState
        resourceHandler: ResourceHandler
    }) => {
        drawActorTiles({
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
        drawTargetTiles({
            summaryHUDState,
            graphicsBuffer,
            gameEngineState,
        })
        drawSelectedActionTile({
            summaryHUDState,
            graphicsBuffer,
            resourceHandler,
            gameEngineState,
        })
        drawActionPreviewTile({
            summaryHUDState,
            graphicsBuffer,
            gameEngineState,
        })

        if (summaryHUDState.showPlayerCommand) {
            PlayerCommandStateService.draw({
                playerCommandState: summaryHUDState.playerCommandState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })
        }
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
    createActorTiles: ({
        summaryHUDState,
        objectRepository,
        gameEngineState,
    }: {
        summaryHUDState: SummaryHUDState
        objectRepository: ObjectRepository
        gameEngineState: GameEngineState
    }) => {
        if (
            !BattleActionDecisionStepService.isActorSet(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ) {
            return
        }

        summaryHUDState.showPlayerCommand = true
        PlayerCommandStateService.createCommandWindow({
            playerCommandState: summaryHUDState.playerCommandState,
            summaryHUDState,
            objectRepository,
            gameEngineState,
            battleSquaddieId: BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId,
        })
    },
    createActionTiles: ({
        summaryHUDState,
        objectRepository,
        gameEngineState,
    }: {
        summaryHUDState: SummaryHUDState
        objectRepository: ObjectRepository
        gameEngineState: GameEngineState
    }) => {
        const selectedAction = BattleActionDecisionStepService.getAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
        if (!selectedAction) return

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            selectedAction.actionTemplateId
        )
        if (!actionTemplate) return

        summaryHUDState.actionSelectedTile = ActionSelectedTileService.new({
            objectRepository,
            battleSquaddieId: BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId,
            actionTemplateId: actionTemplate.id,
            horizontalPosition: ActionTilePosition.SELECTED_ACTION,
        })
    },
    createActionPreviewTile: ({
        summaryHUDState,
        objectRepository,
        gameEngineState,
    }: {
        summaryHUDState: SummaryHUDState
        objectRepository: ObjectRepository
        gameEngineState: GameEngineState
    }) => {
        summaryHUDState.actionPreviewTile = ActionPreviewTileService.new({
            gameEngineState,
            objectRepository,
        })
    },
    peekAtSquaddie: ({
        gameEngineState,
        battleSquaddieId,
        summaryHUDState,
        removeExpirationTime,
    }: {
        summaryHUDState: SummaryHUDState
        gameEngineState: GameEngineState
        battleSquaddieId: string
        removeExpirationTime?: boolean
    }) => {
        if (
            battleSquaddieId ===
                summaryHUDState.squaddieNameTiles[ActionTilePosition.ACTOR_NAME]
                    ?.battleSquaddieId ||
            battleSquaddieId ===
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.TARGET_NAME
                ]?.battleSquaddieId
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

        let nameAndPortraitPosition: ActionTilePosition =
            ActionTilePosition.PEEK_RIGHT_NAME
        let statusPosition: ActionTilePosition =
            ActionTilePosition.PEEK_RIGHT_STATUS
        switch (true) {
            case !!summaryHUDState.squaddieNameTiles[
                ActionTilePosition.ACTOR_NAME
            ]:
                nameAndPortraitPosition = ActionTilePosition.PEEK_RIGHT_NAME
                statusPosition = ActionTilePosition.PEEK_RIGHT_STATUS
                break
            case squaddieHasThePlayerControlledAffiliation:
                nameAndPortraitPosition = ActionTilePosition.PEEK_PLAYABLE_NAME
                statusPosition = ActionTilePosition.PEEK_PLAYABLE_STATUS
                break
        }
        summaryHUDState.squaddieToPeekAt = {
            battleSquaddieId,
            actionPanelPositions: {
                nameAndPortrait: nameAndPortraitPosition,
                status: statusPosition,
            },
            expirationTime: removeExpirationTime
                ? undefined
                : Date.now() + SUMMARY_HUD_PEEK_EXPIRATION_MS,
        }
    },
}

const drawActorTiles = ({
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
        summaryHUDState.squaddieNameTiles[ActionTilePosition.ACTOR_NAME] =
            undefined
        summaryHUDState.squaddieStatusTiles[ActionTilePosition.ACTOR_STATUS] =
            undefined
        return
    }

    const battleSquaddieId = BattleActionDecisionStepService.getActor(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    ).battleSquaddieId

    if (
        summaryHUDState.squaddieNameTiles[ActionTilePosition.ACTOR_NAME] ===
        undefined
    ) {
        createSquaddieNameAndPortraitTile({
            gameEngineState,
            battleSquaddieId,
            summaryHUDState,
            actionPanelPosition: ActionTilePosition.ACTOR_NAME,
        })
    }

    SquaddieNameAndPortraitTileService.draw({
        tile: summaryHUDState.squaddieNameTiles[ActionTilePosition.ACTOR_NAME],
        graphicsContext: graphicsBuffer,
        resourceHandler: gameEngineState.resourceHandler,
    })

    if (
        summaryHUDState.squaddieStatusTiles[ActionTilePosition.ACTOR_STATUS] ===
        undefined
    ) {
        createSquaddieStatusTile({
            graphicsContext: graphicsBuffer,
            gameEngineState,
            battleSquaddieId,
            summaryHUDState,
            actionPanelPosition: ActionTilePosition.ACTOR_STATUS,
        })
    }

    SquaddieStatusTileService.draw({
        tile: summaryHUDState.squaddieStatusTiles[
            ActionTilePosition.ACTOR_STATUS
        ],
        graphicsContext: graphicsBuffer,
        resourceHandler: gameEngineState.resourceHandler,
    })
}

const drawTargetTiles = ({
    graphicsBuffer,
    gameEngineState,
    summaryHUDState,
}: {
    graphicsBuffer: GraphicsBuffer
    gameEngineState: GameEngineState
    summaryHUDState: SummaryHUDState
}) => {
    if (
        !BattleActionDecisionStepService.isTargetConsidered(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    ) {
        summaryHUDState.squaddieNameTiles[ActionTilePosition.TARGET_NAME] =
            undefined
        summaryHUDState.squaddieStatusTiles[ActionTilePosition.TARGET_STATUS] =
            undefined
        return
    }

    const targetCoordinate = BattleActionDecisionStepService.getTarget(
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    ).targetCoordinate

    const battleSquaddieId = MissionMapService.getBattleSquaddieAtCoordinate(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        targetCoordinate
    ).battleSquaddieId

    if (
        summaryHUDState.squaddieNameTiles[ActionTilePosition.TARGET_NAME] ===
        undefined
    ) {
        createSquaddieNameAndPortraitTile({
            gameEngineState,
            battleSquaddieId,
            summaryHUDState,
            actionPanelPosition: ActionTilePosition.TARGET_NAME,
        })
    }

    SquaddieNameAndPortraitTileService.draw({
        tile: summaryHUDState.squaddieNameTiles[ActionTilePosition.TARGET_NAME],
        graphicsContext: graphicsBuffer,
        resourceHandler: gameEngineState.resourceHandler,
    })

    if (
        summaryHUDState.squaddieStatusTiles[
            ActionTilePosition.TARGET_STATUS
        ] === undefined
    ) {
        createSquaddieStatusTile({
            graphicsContext: graphicsBuffer,
            gameEngineState,
            battleSquaddieId,
            summaryHUDState,
            actionPanelPosition: ActionTilePosition.TARGET_STATUS,
        })
    }

    SquaddieStatusTileService.draw({
        tile: summaryHUDState.squaddieStatusTiles[
            ActionTilePosition.TARGET_STATUS
        ],
        graphicsContext: graphicsBuffer,
        resourceHandler: gameEngineState.resourceHandler,
    })
}

const drawSelectedActionTile = ({
    graphicsBuffer,
    gameEngineState,
    summaryHUDState,
    resourceHandler,
}: {
    graphicsBuffer: GraphicsBuffer
    gameEngineState: GameEngineState
    summaryHUDState: SummaryHUDState
    resourceHandler: ResourceHandler
}) => {
    if (
        !BattleActionDecisionStepService.getAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    ) {
        summaryHUDState.actionSelectedTile = undefined
        return
    }

    if (!summaryHUDState.actionSelectedTile) return

    ActionSelectedTileService.draw({
        tile: summaryHUDState.actionSelectedTile,
        resourceHandler,
        graphicsContext: graphicsBuffer,
        objectRepository: gameEngineState.repository,
    })
}

const drawActionPreviewTile = ({
    graphicsBuffer,
    gameEngineState,
    summaryHUDState,
}: {
    graphicsBuffer: GraphicsBuffer
    gameEngineState: GameEngineState
    summaryHUDState: SummaryHUDState
}) => {
    if (
        !BattleActionDecisionStepService.isTargetConsidered(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    ) {
        summaryHUDState.actionPreviewTile = undefined
        return
    }

    if (!summaryHUDState.actionPreviewTile) return

    ActionPreviewTileService.draw({
        tile: summaryHUDState.actionPreviewTile,
        graphicsContext: graphicsBuffer,
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
    if (
        !areWePeekingAtTheExpectedActionPanelPosition(
            summaryHUDState,
            ActionTilePosition.PEEK_PLAYABLE_NAME
        )
    ) {
        clearNameAndStatusPanel(
            summaryHUDState,
            ActionTilePosition.PEEK_PLAYABLE_NAME,
            ActionTilePosition.PEEK_PLAYABLE_STATUS
        )
        return
    }

    if (
        didPeekableTileExpire(
            summaryHUDState,
            ActionTilePosition.PEEK_PLAYABLE_NAME
        )
    ) {
        clearNameAndStatusPanel(
            summaryHUDState,
            ActionTilePosition.PEEK_PLAYABLE_NAME,
            ActionTilePosition.PEEK_PLAYABLE_STATUS
        )
        summaryHUDState.squaddieToPeekAt = undefined
        return
    }

    if (
        shouldCreateNewPeekableTiles(
            summaryHUDState,
            ActionTilePosition.PEEK_PLAYABLE_NAME
        )
    ) {
        createNewPeekableTiles({
            gameEngineState,
            summaryHUDState,
            nameTilePosition: ActionTilePosition.PEEK_PLAYABLE_NAME,
            statusTilePosition: ActionTilePosition.PEEK_PLAYABLE_STATUS,
            graphicsContext: graphicsBuffer,
        })
    }

    drawPeekablePanel({
        graphicsBuffer,
        gameEngineState,
        summaryHUDState,
        actionPanelPosition: ActionTilePosition.PEEK_PLAYABLE_NAME,
    })
    drawPeekablePanel({
        graphicsBuffer,
        gameEngineState,
        summaryHUDState,
        actionPanelPosition: ActionTilePosition.PEEK_PLAYABLE_STATUS,
    })
}

const areWePeekingAtTheExpectedActionPanelPosition = (
    summaryHUDState: SummaryHUDState,
    actionTilePosition: ActionTilePosition
): boolean =>
    summaryHUDState.squaddieToPeekAt?.actionPanelPositions.nameAndPortrait ===
    actionTilePosition

const clearNameAndStatusPanel = (
    summaryHUDState: SummaryHUDState,
    namePosition: ActionTilePosition,
    statusPosition: ActionTilePosition
) => {
    summaryHUDState.squaddieNameTiles[namePosition] = undefined
    summaryHUDState.squaddieStatusTiles[statusPosition] = undefined
}

const didPeekableTileExpire = (
    summaryHUDState: SummaryHUDState,
    nameTilePosition: ActionTilePosition
): boolean =>
    isValidValue(summaryHUDState.squaddieToPeekAt?.expirationTime) &&
    Date.now() > summaryHUDState.squaddieToPeekAt?.expirationTime &&
    !!summaryHUDState.squaddieNameTiles[nameTilePosition]

const shouldCreateNewPeekableTiles = (
    summaryHUDState: SummaryHUDState,
    nameTilePosition: ActionTilePosition
): boolean =>
    summaryHUDState.squaddieNameTiles[nameTilePosition] === undefined ||
    summaryHUDState.squaddieNameTiles[nameTilePosition].battleSquaddieId !==
        summaryHUDState.squaddieToPeekAt.battleSquaddieId

const createNewPeekableTiles = ({
    gameEngineState,
    summaryHUDState,
    nameTilePosition,
    statusTilePosition,
    graphicsContext,
}: {
    gameEngineState: GameEngineState
    summaryHUDState: SummaryHUDState
    nameTilePosition: ActionTilePosition
    statusTilePosition: ActionTilePosition
    graphicsContext: GraphicsBuffer
}) => {
    createSquaddieNameAndPortraitTile({
        gameEngineState,
        battleSquaddieId: summaryHUDState.squaddieToPeekAt.battleSquaddieId,
        summaryHUDState,
        actionPanelPosition: nameTilePosition,
    })

    createSquaddieStatusTile({
        graphicsContext,
        gameEngineState,
        battleSquaddieId: summaryHUDState.squaddieToPeekAt.battleSquaddieId,
        summaryHUDState,
        actionPanelPosition: statusTilePosition,
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
    if (
        !areWePeekingAtTheExpectedActionPanelPosition(
            summaryHUDState,
            ActionTilePosition.PEEK_RIGHT_NAME
        )
    ) {
        clearNameAndStatusPanel(
            summaryHUDState,
            ActionTilePosition.PEEK_RIGHT_NAME,
            ActionTilePosition.PEEK_RIGHT_STATUS
        )
        return
    }

    if (
        didPeekableTileExpire(
            summaryHUDState,
            ActionTilePosition.PEEK_RIGHT_NAME
        )
    ) {
        clearNameAndStatusPanel(
            summaryHUDState,
            ActionTilePosition.PEEK_RIGHT_NAME,
            ActionTilePosition.PEEK_RIGHT_STATUS
        )
        summaryHUDState.squaddieToPeekAt = undefined
        return
    }

    if (
        shouldCreateNewPeekableTiles(
            summaryHUDState,
            ActionTilePosition.PEEK_RIGHT_NAME
        )
    ) {
        createNewPeekableTiles({
            gameEngineState,
            summaryHUDState,
            nameTilePosition: ActionTilePosition.PEEK_RIGHT_NAME,
            statusTilePosition: ActionTilePosition.PEEK_RIGHT_STATUS,
            graphicsContext: graphicsBuffer,
        })
    }

    drawPeekablePanel({
        graphicsBuffer,
        gameEngineState,
        summaryHUDState,
        actionPanelPosition: ActionTilePosition.PEEK_RIGHT_NAME,
    })
    drawPeekablePanel({
        graphicsBuffer,
        gameEngineState,
        summaryHUDState,
        actionPanelPosition: ActionTilePosition.PEEK_RIGHT_STATUS,
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
    actionPanelPosition: ActionTilePosition
}) => {
    if (ActionPanelPositionForNames.includes(actionPanelPosition)) {
        SquaddieNameAndPortraitTileService.draw({
            tile: summaryHUDState.squaddieNameTiles[actionPanelPosition],
            graphicsContext: graphicsBuffer,
            resourceHandler: gameEngineState.resourceHandler,
        })
    }

    if (ActionPanelPositionForStatus.includes(actionPanelPosition)) {
        SquaddieStatusTileService.draw({
            tile: summaryHUDState.squaddieStatusTiles[actionPanelPosition],
            graphicsContext: graphicsBuffer,
            resourceHandler: gameEngineState.resourceHandler,
        })
    }
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
    actionPanelPosition: ActionTilePosition
}) => {
    const team = gameEngineState.battleOrchestratorState.battleState.teams.find(
        (t) => t.battleSquaddieIds.includes(battleSquaddieId)
    )
    summaryHUDState.squaddieNameTiles[actionPanelPosition] =
        SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
            battleSquaddieId: battleSquaddieId,
            objectRepository: gameEngineState.repository,
            team,
            horizontalPosition: actionPanelPosition,
        })
}

const createSquaddieStatusTile = ({
    gameEngineState,
    battleSquaddieId,
    summaryHUDState,
    actionPanelPosition,
    graphicsContext,
}: {
    gameEngineState: GameEngineState
    battleSquaddieId: string
    summaryHUDState: SummaryHUDState
    actionPanelPosition: ActionTilePosition
    graphicsContext: GraphicsBuffer
}) => {
    summaryHUDState.squaddieStatusTiles[actionPanelPosition] =
        SquaddieStatusTileService.new({
            battleSquaddieId: battleSquaddieId,
            objectRepository: gameEngineState.repository,
            horizontalPosition: actionPanelPosition,
        })

    SquaddieStatusTileService.updateTileUsingSquaddie({
        tile: summaryHUDState.squaddieStatusTiles[actionPanelPosition],
        objectRepository: gameEngineState.repository,
        graphicsContext,
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        resourceHandler: gameEngineState.resourceHandler,
    })
}
