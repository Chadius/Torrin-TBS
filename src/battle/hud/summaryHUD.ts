import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    PlayerCommandState,
    PlayerCommandStateService,
} from "./playerCommandHUD"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../graphicsConstants"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { ResourceHandler } from "../../resource/resourceHandler"
import { MouseButton } from "../../utils/mouseConfig"
import { SquaddieService } from "../../squaddie/squaddieService"
import { OrchestratorUtilities } from "../orchestratorComponents/orchestratorUtils"
import { ButtonStatus } from "../../ui/button"
import { ImageUI } from "../../ui/imageUI"
import { BattleSquaddie } from "../battleSquaddie"
import { isValidValue } from "../../utils/validityCheck"
import { SquaddieEmotion } from "../animation/actionAnimation/actionAnimationConstants"
import p5 from "p5"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { DrawBattleHUD } from "./drawBattleHUD"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../ui/constants"
import { TextBox, TextBoxService } from "../../ui/textBox"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"

const SUMMARY_WINDOW_DISPLAY = {
    leftPanelPosition: {
        startColumn: 0,
        endColumn: 1,
    },
    rightPanelPosition: {
        startColumn: 10,
        endColumn: 11,
    },
    height: 100,
    color: {
        saturation: 10,
        brightness: 20,
    },
}

const ACTION_POINTS_DISPLAY = {
    topOffset: 45,
    text: {
        height: 12,
        color: {
            saturation: 7,
            brightness: 96,
        },
    },
    bar: {
        width: ScreenDimensions.SCREEN_WIDTH / 12 - WINDOW_SPACING.SPACING4,
        height: 20,
        foregroundFillColor: {
            saturation: 2,
            brightness: 60,
        },
        colors: {
            strokeColor: { hsb: [0, 0, 12] },
            foregroundFillColor: { hsb: [0, 0, 87] },
            backgroundFillColor: { hsb: [0, 0, 12] },
        },
        strokeWeight: 2,
    },
}

const HIT_POINTS_DISPLAY = {
    topOffset: 70,
    text: {
        height: 12,
        color: {
            saturation: 7,
            brightness: 96,
        },
    },
    bar: {
        height: 25,
        width: ScreenDimensions.SCREEN_WIDTH / 12 - WINDOW_SPACING.SPACING2,
        foregroundFillColor: {
            saturation: 70,
            brightness: 70,
        },
        colors: {
            strokeColor: { hsb: [0, 0, 12] },
            foregroundFillColor: { hsb: [0, 0, 0] },
            backgroundFillColor: { hsb: [0, 0, 12] },
        },
        strokeWeight: 2,
    },
}

const SQUADDIE_ID_DISPLAY = {
    topOffset: 8,
    bottomOffset: 40,
    textSize: 20,
    fontColor: {
        saturation: 7,
        brightness: 192,
    },
}

const SquaddiePortrait = {
    top: 0,
    left: 0,
    width: 64,
    height: 64,
}

export interface SummaryHUDState {
    battleSquaddieId?: string
    showPlayerCommand: boolean
    showSummaryHUD: boolean
    playerCommandState: PlayerCommandState
    mouseSelectionLocation: { x: number; y: number }

    currentlyDisplayedBattleSquaddieId?: string
    summaryWindow?: {
        area: RectArea
        color: {
            hue: number
            saturation: number
            brightness: number
        }
    }

    squaddiePortrait?: ImageUI

    actionPointsTextBox?: TextBox
    hitPointsTextBox?: TextBox
    squaddieIdTextBox?: TextBox
}

export const SummaryHUDStateService = {
    new: ({
        battleSquaddieId,
        mouseSelectionLocation,
    }: {
        battleSquaddieId: string
        mouseSelectionLocation: { x: number; y: number }
    }): SummaryHUDState => {
        return {
            playerCommandState: PlayerCommandStateService.new({}),
            showPlayerCommand: false,
            showSummaryHUD: false,
            mouseSelectionLocation,
            battleSquaddieId,
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
    }) => {
        if (!(summaryHUDState && summaryHUDState.showPlayerCommand)) {
            return
        }

        PlayerCommandStateService.mouseClicked({
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
        return (
            summaryHUDState.showSummaryHUD &&
            RectAreaService.isInside(
                summaryHUDState.summaryWindow.area,
                mouseSelectionLocation.x,
                mouseSelectionLocation.y
            )
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

        if (summaryHUDState.currentlyDisplayedBattleSquaddieId !== undefined) {
            drawSummarySquaddieWindow({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })
        }

        if (summaryHUDState.squaddiePortrait) {
            summaryHUDState.squaddiePortrait.draw(graphicsBuffer)
        }
        TextBoxService.draw(summaryHUDState.squaddieIdTextBox, graphicsBuffer)

        drawActionPoints(summaryHUDState, gameEngineState, graphicsBuffer)
        drawHitPoints(summaryHUDState, gameEngineState, graphicsBuffer)
        TextBoxService.draw(summaryHUDState.actionPointsTextBox, graphicsBuffer)
        TextBoxService.draw(summaryHUDState.hitPointsTextBox, graphicsBuffer)

        if (summaryHUDState.showPlayerCommand) {
            PlayerCommandStateService.draw({
                playerCommandState: summaryHUDState.playerCommandState,
                graphicsBuffer,
                gameEngineState,
            })
        }
    },
    update: ({
        summaryHUDState,
        gameEngineState,
        objectRepository,
        resourceHandler,
    }: {
        summaryHUDState: SummaryHUDState
        gameEngineState: GameEngineState
        objectRepository: ObjectRepository
        resourceHandler: ResourceHandler
    }) => {
        maybeRecreateUIElements({
            summaryHUDState,
            objectRepository,
            gameEngineState,
            resourceHandler,
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
        if (!summaryHUDState.showSummaryHUD) {
            return
        }

        function changeButtonStatusBasedOnMouseLocation(button: {
            buttonArea: RectArea
            status: ButtonStatus
        }) {
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
                return
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
}

const createActionPointsUIElements = (
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    summaryHUDState: SummaryHUDState,
    summaryWindowArea: RectArea
) => {
    const { actionPointsRemaining } = SquaddieService.getNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })

    summaryHUDState.actionPointsTextBox = TextBoxService.new({
        text: `Act: ${actionPointsRemaining}`,
        textSize: ACTION_POINTS_DISPLAY.text.height,
        fontColor: [
            HUE_BY_SQUADDIE_AFFILIATION[
                squaddieTemplate.squaddieId.affiliation
            ],
            ACTION_POINTS_DISPLAY.text.color.saturation,
            ACTION_POINTS_DISPLAY.text.color.brightness,
        ],
        vertAlign: VERTICAL_ALIGN.CENTER,
        horizAlign: HORIZONTAL_ALIGN.RIGHT,
        area: RectAreaService.new({
            left: summaryWindowArea.left + WINDOW_SPACING.SPACING1,
            height: ACTION_POINTS_DISPLAY.bar.height,
            width: ScreenDimensions.SCREEN_WIDTH / 12 - WINDOW_SPACING.SPACING2,
            top: summaryWindowArea.top + ACTION_POINTS_DISPLAY.topOffset,
        }),
    })
}

const createSquaddieIdUIElements = (
    summaryHUDState: SummaryHUDState,
    squaddieTemplate: SquaddieTemplate,
    summaryWindowArea: RectArea
) => {
    summaryHUDState.squaddieIdTextBox = TextBoxService.new({
        text: `${squaddieTemplate.squaddieId.name}`,
        textSize: SQUADDIE_ID_DISPLAY.textSize,
        fontColor: [
            HUE_BY_SQUADDIE_AFFILIATION[
                squaddieTemplate.squaddieId.affiliation
            ],
            SQUADDIE_ID_DISPLAY.fontColor.saturation,
            SQUADDIE_ID_DISPLAY.fontColor.brightness,
        ],
        vertAlign: VERTICAL_ALIGN.CENTER,
        horizAlign: HORIZONTAL_ALIGN.CENTER,
        area: RectAreaService.new({
            left:
                summaryWindowArea.left +
                SquaddiePortrait.width +
                WINDOW_SPACING.SPACING1,
            height: SQUADDIE_ID_DISPLAY.bottomOffset,
            right:
                RectAreaService.right(summaryWindowArea) -
                WINDOW_SPACING.SPACING1,
            top: summaryWindowArea.top + SQUADDIE_ID_DISPLAY.topOffset,
        }),
    })
}

function createHitPointsUIElements(
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    summaryHUDState: SummaryHUDState,
    summaryWindowArea: RectArea
) {
    const { currentHitPoints, maxHitPoints } = SquaddieService.getHitPoints({
        squaddieTemplate,
        battleSquaddie,
    })
    summaryHUDState.hitPointsTextBox = TextBoxService.new({
        text: `HP: ${currentHitPoints} / ${maxHitPoints}`,
        textSize: HIT_POINTS_DISPLAY.text.height,
        fontColor: [
            HUE_BY_SQUADDIE_AFFILIATION[
                squaddieTemplate.squaddieId.affiliation
            ],
            HIT_POINTS_DISPLAY.text.color.saturation,
            HIT_POINTS_DISPLAY.text.color.brightness,
        ],
        vertAlign: VERTICAL_ALIGN.CENTER,
        horizAlign: HORIZONTAL_ALIGN.RIGHT,
        area: RectAreaService.new({
            left: summaryWindowArea.left + WINDOW_SPACING.SPACING1,
            height: HIT_POINTS_DISPLAY.bar.height,
            width: ScreenDimensions.SCREEN_WIDTH / 12 - WINDOW_SPACING.SPACING2,
            top: summaryWindowArea.top + HIT_POINTS_DISPLAY.topOffset,
        }),
    })
}

const maybeRecreateUIElements = ({
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
        summaryHUDState.battleSquaddieId ===
        summaryHUDState.currentlyDisplayedBattleSquaddieId
    ) {
        return
    }

    summaryHUDState.currentlyDisplayedBattleSquaddieId =
        summaryHUDState.battleSquaddieId
    summaryHUDState.showSummaryHUD = true

    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            summaryHUDState.battleSquaddieId
        )
    )

    const {
        squaddieHasThePlayerControlledAffiliation,
        playerCanControlThisSquaddieRightNow,
    } = SquaddieService.canPlayerControlSquaddieRightNow({
        squaddieTemplate,
        battleSquaddie,
    })

    const startColumn =
        squaddieHasThePlayerControlledAffiliation ||
        playerCanControlThisSquaddieRightNow
            ? SUMMARY_WINDOW_DISPLAY.leftPanelPosition.startColumn
            : SUMMARY_WINDOW_DISPLAY.rightPanelPosition.startColumn
    const endColumn =
        squaddieHasThePlayerControlledAffiliation ||
        playerCanControlThisSquaddieRightNow
            ? SUMMARY_WINDOW_DISPLAY.leftPanelPosition.endColumn
            : SUMMARY_WINDOW_DISPLAY.rightPanelPosition.endColumn

    const summaryWindowArea: RectArea = RectAreaService.new({
        top: ScreenDimensions.SCREEN_HEIGHT - SUMMARY_WINDOW_DISPLAY.height,
        startColumn,
        endColumn,
        screenWidth: ScreenDimensions.SCREEN_WIDTH,
        height: SUMMARY_WINDOW_DISPLAY.height,
    })

    const summaryWindowColor = {
        hue: HUE_BY_SQUADDIE_AFFILIATION[
            squaddieTemplate.squaddieId.affiliation
        ],
        saturation: SUMMARY_WINDOW_DISPLAY.color.saturation,
        brightness: SUMMARY_WINDOW_DISPLAY.color.brightness,
    }
    summaryHUDState.summaryWindow = {
        area: summaryWindowArea,
        color: summaryWindowColor,
    }

    generateSquaddiePortrait({
        summaryHUDState,
        gameEngineState,
    })

    createSquaddieIdUIElements(
        summaryHUDState,
        squaddieTemplate,
        summaryWindowArea
    )

    createActionPointsUIElements(
        squaddieTemplate,
        battleSquaddie,
        summaryHUDState,
        summaryWindowArea
    )

    createHitPointsUIElements(
        squaddieTemplate,
        battleSquaddie,
        summaryHUDState,
        summaryWindowArea
    )

    maybeRecreatePlayerCommandWindow({
        summaryHUDState,
        objectRepository,
        gameEngineState,
        resourceHandler,
    })
}

const drawSummarySquaddieWindow = ({
    summaryHUDState,
    graphicsBuffer,
    gameEngineState,
}: {
    graphicsBuffer: GraphicsBuffer
    summaryHUDState: SummaryHUDState
    gameEngineState: GameEngineState
}) => {
    graphicsBuffer.push()
    graphicsBuffer.fill(
        summaryHUDState.summaryWindow.color.hue,
        summaryHUDState.summaryWindow.color.saturation,
        summaryHUDState.summaryWindow.color.brightness
    )
    graphicsBuffer.rect(
        RectAreaService.left(summaryHUDState.summaryWindow.area),
        RectAreaService.top(summaryHUDState.summaryWindow.area),
        RectAreaService.width(summaryHUDState.summaryWindow.area),
        RectAreaService.height(summaryHUDState.summaryWindow.area)
    )
    graphicsBuffer.pop()
}

const maybeRecreatePlayerCommandWindow = ({
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
    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            summaryHUDState.battleSquaddieId
        )
    )
    const { playerCanControlThisSquaddieRightNow } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })

    if (!playerCanControlThisSquaddieRightNow) {
        summaryHUDState.showPlayerCommand = false
        return
    }

    if (
        !OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)
    ) {
        summaryHUDState.playerCommandState = PlayerCommandStateService.new({})
    }

    summaryHUDState.showPlayerCommand = true
    PlayerCommandStateService.createCommandWindow({
        playerCommandState: summaryHUDState.playerCommandState,
        summaryHUDState,
        objectRepository,
        gameEngineState,
        resourceHandler,
    })
}

const generateSquaddiePortrait = ({
    summaryHUDState,
    gameEngineState,
}: {
    summaryHUDState: SummaryHUDState
    gameEngineState: GameEngineState
}) => {
    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            summaryHUDState.battleSquaddieId
        )
    )

    let portraitIcon: p5.Image = null

    if (
        isValidValue(
            squaddieTemplate.squaddieId.resources.actionSpritesByEmotion[
                SquaddieEmotion.NEUTRAL
            ]
        )
    ) {
        portraitIcon = gameEngineState.resourceHandler.getResource(
            squaddieTemplate.squaddieId.resources.actionSpritesByEmotion[
                SquaddieEmotion.NEUTRAL
            ]
        )
    }

    if (!isValidValue(portraitIcon)) {
        portraitIcon = getSquaddieTeamIconImage(gameEngineState, battleSquaddie)
    }

    if (portraitIcon) {
        summaryHUDState.squaddiePortrait = new ImageUI({
            graphic: portraitIcon,
            area: RectAreaService.new({
                left:
                    SquaddiePortrait.left +
                    summaryHUDState.summaryWindow.area.left,
                top:
                    SquaddiePortrait.top +
                    summaryHUDState.summaryWindow.area.top,
                width: SquaddiePortrait.width,
                height: SquaddiePortrait.height,
            }),
        })
    } else {
        summaryHUDState.squaddiePortrait = null
    }
}

const getSquaddieTeamIconImage = (
    gameEngineState: GameEngineState,
    battleSquaddie: BattleSquaddie
): p5.Image => {
    let teamIconImage: p5.Image = null

    const team = gameEngineState.battleOrchestratorState.battleState.teams.find(
        (team) =>
            team.battleSquaddieIds.includes(battleSquaddie.battleSquaddieId)
    )
    if (
        isValidValue(team) &&
        isValidValue(team.iconResourceKey) &&
        team.iconResourceKey !== ""
    ) {
        teamIconImage = gameEngineState.resourceHandler.getResource(
            team.iconResourceKey
        )
    }
    return teamIconImage
}

const drawActionPoints = (
    summaryHUDState: SummaryHUDState,
    gameEngineState: GameEngineState,
    graphicsContext: GraphicsBuffer
) => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            summaryHUDState.battleSquaddieId
        )
    )
    const { actionPointsRemaining } = SquaddieService.getNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })

    const barFillColor = {
        hsb: [
            HUE_BY_SQUADDIE_AFFILIATION[
                squaddieTemplate.squaddieId.affiliation
            ] || HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.UNKNOWN],
            ACTION_POINTS_DISPLAY.bar.foregroundFillColor.saturation,
            ACTION_POINTS_DISPLAY.bar.foregroundFillColor.brightness,
        ],
    }

    DrawBattleHUD.drawHorizontalDividedBar({
        graphicsContext,
        drawArea: RectAreaService.new({
            left:
                summaryHUDState.summaryWindow.area.left +
                ScreenDimensions.SCREEN_WIDTH / 12,
            height: ACTION_POINTS_DISPLAY.bar.height,
            width: ACTION_POINTS_DISPLAY.bar.width,
            top:
                summaryHUDState.summaryWindow.area.top +
                ACTION_POINTS_DISPLAY.topOffset,
        }),
        currentAmount: actionPointsRemaining,
        maxAmount: 3,
        strokeWeight: ACTION_POINTS_DISPLAY.bar.strokeWeight,
        colors: {
            ...ACTION_POINTS_DISPLAY.bar.colors,
            foregroundFillColor: barFillColor,
        },
    })
}

const drawHitPoints = (
    summaryHUDState: SummaryHUDState,
    gameEngineState: GameEngineState,
    graphicsContext: GraphicsBuffer
) => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            summaryHUDState.battleSquaddieId
        )
    )
    const { currentHitPoints, maxHitPoints } = SquaddieService.getHitPoints({
        squaddieTemplate,
        battleSquaddie,
    })

    const barFillColor = {
        hsb: [
            HUE_BY_SQUADDIE_AFFILIATION[
                squaddieTemplate.squaddieId.affiliation
            ] || HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.UNKNOWN],
            HIT_POINTS_DISPLAY.bar.foregroundFillColor.saturation,
            HIT_POINTS_DISPLAY.bar.foregroundFillColor.brightness,
        ],
    }

    DrawBattleHUD.drawHorizontalDividedBar({
        graphicsContext,
        drawArea: RectAreaService.new({
            left:
                summaryHUDState.summaryWindow.area.left +
                ScreenDimensions.SCREEN_WIDTH / 12,
            height: HIT_POINTS_DISPLAY.bar.height,
            width: HIT_POINTS_DISPLAY.bar.width,
            top:
                summaryHUDState.summaryWindow.area.top +
                HIT_POINTS_DISPLAY.topOffset,
        }),
        currentAmount: currentHitPoints,
        maxAmount: maxHitPoints,
        strokeWeight: 2,
        colors: {
            ...HIT_POINTS_DISPLAY.bar.colors,
            foregroundFillColor: barFillColor,
        },
    })
}
