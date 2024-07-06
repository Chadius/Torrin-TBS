import { RectArea, RectAreaService } from "../../../ui/rectArea"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { SquaddieService } from "../../../squaddie/squaddieService"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../graphicsConstants"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { BattleSquaddie } from "../../battleSquaddie"
import { TextBox, TextBoxService } from "../../../ui/textBox"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../../ui/constants"
import p5 from "p5"
import { isValidValue } from "../../../utils/validityCheck"
import { SquaddieEmotion } from "../../animation/actionAnimation/actionAnimationConstants"
import { ImageUI } from "../../../ui/imageUI"
import { DrawBattleHUD } from "../drawBattleHUD"

const SQUADDIE_SUMMARY_PANEL_STYLE = {
    height: 100,
    color: {
        saturation: 10,
        brightness: 20,
    },
}

const ACTION_POINTS_STYLE = {
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

const HIT_POINTS_STYLE = {
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

const SQUADDIE_ID_STYLE = {
    topOffset: 8,
    bottomOffset: 40,
    textSize: 20,
    fontColor: {
        saturation: 7,
        brightness: 192,
    },
}

const SQUADDIE_PORTRAIT_STYLE = {
    top: 0,
    left: 0,
    width: 64,
    height: 64,
}

export interface SquaddieSummaryPanel {
    battleSquaddieId: string
    windowArea: RectArea

    windowHue?: number
    squaddiePortrait?: ImageUI
    actionPointsTextBox?: TextBox
    hitPointsTextBox?: TextBox
    squaddieIdTextBox?: TextBox
}

export const SquaddieSummaryPanelService = {
    new: ({
        startingColumn,
        battleSquaddieId,
    }: {
        startingColumn: number
        battleSquaddieId: string
    }): SquaddieSummaryPanel => {
        return {
            battleSquaddieId,
            windowArea: RectAreaService.new({
                top:
                    ScreenDimensions.SCREEN_HEIGHT -
                    SQUADDIE_SUMMARY_PANEL_STYLE.height,
                height: SQUADDIE_SUMMARY_PANEL_STYLE.height,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                startColumn: startingColumn > 8 ? 8 : startingColumn,
                endColumn: startingColumn > 8 ? 11 : startingColumn + 3,
            }),
        }
    },
    update: ({
        objectRepository,
        gameEngineState,
        squaddieSummaryPanel,
    }: {
        objectRepository: ObjectRepository
        resourceHandler: ResourceHandler
        gameEngineState: GameEngineState
        squaddieSummaryPanel: SquaddieSummaryPanel
    }) => {
        maybeRecreateUIElements({
            squaddieSummaryPanel,
            objectRepository,
            gameEngineState,
        })
    },
    draw: ({
        graphicsBuffer,
        gameEngineState,
        squaddieSummaryPanel,
    }: {
        graphicsBuffer: GraphicsBuffer
        gameEngineState: GameEngineState
        squaddieSummaryPanel: SquaddieSummaryPanel
    }) => {
        drawSummarySquaddieWindow({
            squaddieSummaryPanel,
            graphicsBuffer,
            gameEngineState,
        })

        if (squaddieSummaryPanel.squaddiePortrait) {
            squaddieSummaryPanel.squaddiePortrait.draw(graphicsBuffer)
        }
        TextBoxService.draw(
            squaddieSummaryPanel.squaddieIdTextBox,
            graphicsBuffer
        )

        drawActionPoints(squaddieSummaryPanel, gameEngineState, graphicsBuffer)
        drawHitPoints(squaddieSummaryPanel, gameEngineState, graphicsBuffer)
        TextBoxService.draw(
            squaddieSummaryPanel.actionPointsTextBox,
            graphicsBuffer
        )
        TextBoxService.draw(
            squaddieSummaryPanel.hitPointsTextBox,
            graphicsBuffer
        )
    },
    isMouseHoveringOver: ({
        mouseLocation,
        squaddieSummaryPanel,
    }: {
        mouseLocation: { x: number; y: number }
        squaddieSummaryPanel: SquaddieSummaryPanel
    }): boolean => {
        return RectAreaService.isInside(
            squaddieSummaryPanel.windowArea,
            mouseLocation.x,
            mouseLocation.y
        )
    },
}

const maybeRecreateUIElements = ({
    squaddieSummaryPanel,
    objectRepository,
    gameEngineState,
}: {
    squaddieSummaryPanel: SquaddieSummaryPanel
    objectRepository: ObjectRepository
    gameEngineState: GameEngineState
}) => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            squaddieSummaryPanel.battleSquaddieId
        )
    )

    squaddieSummaryPanel.windowHue =
        HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation]

    generateSquaddiePortrait({
        squaddieSummaryPanel,
        gameEngineState,
    })

    createSquaddieIdUIElements(squaddieSummaryPanel, squaddieTemplate)

    createActionPointsUIElements(
        squaddieTemplate,
        battleSquaddie,
        squaddieSummaryPanel
    )

    createHitPointsUIElements(
        squaddieTemplate,
        battleSquaddie,
        squaddieSummaryPanel
    )
}

const createActionPointsUIElements = (
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    squaddieSummaryPanel: SquaddieSummaryPanel
) => {
    const { actionPointsRemaining } = SquaddieService.getNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })

    squaddieSummaryPanel.actionPointsTextBox = TextBoxService.new({
        text: `Act: ${actionPointsRemaining}`,
        textSize: ACTION_POINTS_STYLE.text.height,
        fontColor: [
            HUE_BY_SQUADDIE_AFFILIATION[
                squaddieTemplate.squaddieId.affiliation
            ],
            ACTION_POINTS_STYLE.text.color.saturation,
            ACTION_POINTS_STYLE.text.color.brightness,
        ],
        vertAlign: VERTICAL_ALIGN.CENTER,
        horizAlign: HORIZONTAL_ALIGN.RIGHT,
        area: RectAreaService.new({
            left:
                squaddieSummaryPanel.windowArea.left + WINDOW_SPACING.SPACING1,
            height: ACTION_POINTS_STYLE.bar.height,
            width: ScreenDimensions.SCREEN_WIDTH / 12 - WINDOW_SPACING.SPACING2,
            top:
                squaddieSummaryPanel.windowArea.top +
                ACTION_POINTS_STYLE.topOffset,
        }),
    })
}

const createSquaddieIdUIElements = (
    squaddieSummaryPanel: SquaddieSummaryPanel,
    squaddieTemplate: SquaddieTemplate
) => {
    squaddieSummaryPanel.squaddieIdTextBox = TextBoxService.new({
        text: `${squaddieTemplate.squaddieId.name}`,
        textSize: SQUADDIE_ID_STYLE.textSize,
        fontColor: [
            HUE_BY_SQUADDIE_AFFILIATION[
                squaddieTemplate.squaddieId.affiliation
            ],
            SQUADDIE_ID_STYLE.fontColor.saturation,
            SQUADDIE_ID_STYLE.fontColor.brightness,
        ],
        vertAlign: VERTICAL_ALIGN.CENTER,
        horizAlign: HORIZONTAL_ALIGN.CENTER,
        area: RectAreaService.new({
            left:
                squaddieSummaryPanel.windowArea.left +
                SQUADDIE_PORTRAIT_STYLE.width +
                WINDOW_SPACING.SPACING1,
            height: SQUADDIE_ID_STYLE.bottomOffset,
            right:
                RectAreaService.right(squaddieSummaryPanel.windowArea) -
                WINDOW_SPACING.SPACING1,
            top:
                squaddieSummaryPanel.windowArea.top +
                SQUADDIE_ID_STYLE.topOffset,
        }),
    })
}

const createHitPointsUIElements = (
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    squaddieSummaryPanel: SquaddieSummaryPanel
) => {
    const { currentHitPoints, maxHitPoints } = SquaddieService.getHitPoints({
        squaddieTemplate,
        battleSquaddie,
    })
    squaddieSummaryPanel.hitPointsTextBox = TextBoxService.new({
        text: `HP: ${currentHitPoints} / ${maxHitPoints}`,
        textSize: HIT_POINTS_STYLE.text.height,
        fontColor: [
            HUE_BY_SQUADDIE_AFFILIATION[
                squaddieTemplate.squaddieId.affiliation
            ],
            HIT_POINTS_STYLE.text.color.saturation,
            HIT_POINTS_STYLE.text.color.brightness,
        ],
        vertAlign: VERTICAL_ALIGN.CENTER,
        horizAlign: HORIZONTAL_ALIGN.RIGHT,
        area: RectAreaService.new({
            left:
                squaddieSummaryPanel.windowArea.left + WINDOW_SPACING.SPACING1,
            height: HIT_POINTS_STYLE.bar.height,
            width: ScreenDimensions.SCREEN_WIDTH / 12 - WINDOW_SPACING.SPACING2,
            top:
                squaddieSummaryPanel.windowArea.top +
                HIT_POINTS_STYLE.topOffset,
        }),
    })
}

const drawSummarySquaddieWindow = ({
    squaddieSummaryPanel,
    graphicsBuffer,
}: {
    graphicsBuffer: GraphicsBuffer
    squaddieSummaryPanel: SquaddieSummaryPanel
    gameEngineState: GameEngineState
}) => {
    graphicsBuffer.push()
    graphicsBuffer.fill(
        squaddieSummaryPanel.windowHue,
        SQUADDIE_SUMMARY_PANEL_STYLE.color.saturation,
        SQUADDIE_SUMMARY_PANEL_STYLE.color.brightness
    )
    graphicsBuffer.rect(
        RectAreaService.left(squaddieSummaryPanel.windowArea),
        RectAreaService.top(squaddieSummaryPanel.windowArea),
        RectAreaService.width(squaddieSummaryPanel.windowArea),
        RectAreaService.height(squaddieSummaryPanel.windowArea)
    )
    graphicsBuffer.pop()
}

const generateSquaddiePortrait = ({
    squaddieSummaryPanel,
    gameEngineState,
}: {
    squaddieSummaryPanel: SquaddieSummaryPanel
    gameEngineState: GameEngineState
}) => {
    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            squaddieSummaryPanel.battleSquaddieId
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
        squaddieSummaryPanel.squaddiePortrait = new ImageUI({
            graphic: portraitIcon,
            area: RectAreaService.new({
                left:
                    SQUADDIE_PORTRAIT_STYLE.left +
                    squaddieSummaryPanel.windowArea.left,
                top:
                    SQUADDIE_PORTRAIT_STYLE.top +
                    squaddieSummaryPanel.windowArea.top,
                width: SQUADDIE_PORTRAIT_STYLE.width,
                height: SQUADDIE_PORTRAIT_STYLE.height,
            }),
        })
    } else {
        squaddieSummaryPanel.squaddiePortrait = null
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
    squaddieSummaryPanel: SquaddieSummaryPanel,
    gameEngineState: GameEngineState,
    graphicsContext: GraphicsBuffer
) => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            squaddieSummaryPanel.battleSquaddieId
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
            ACTION_POINTS_STYLE.bar.foregroundFillColor.saturation,
            ACTION_POINTS_STYLE.bar.foregroundFillColor.brightness,
        ],
    }

    DrawBattleHUD.drawHorizontalDividedBar({
        graphicsContext,
        drawArea: RectAreaService.new({
            left:
                squaddieSummaryPanel.windowArea.left +
                ScreenDimensions.SCREEN_WIDTH / 12,
            height: ACTION_POINTS_STYLE.bar.height,
            width: ACTION_POINTS_STYLE.bar.width,
            top:
                squaddieSummaryPanel.windowArea.top +
                ACTION_POINTS_STYLE.topOffset,
        }),
        currentAmount: actionPointsRemaining,
        maxAmount: 3,
        strokeWeight: ACTION_POINTS_STYLE.bar.strokeWeight,
        colors: {
            ...ACTION_POINTS_STYLE.bar.colors,
            foregroundFillColor: barFillColor,
        },
    })
}

const drawHitPoints = (
    squaddieSummaryPanel: SquaddieSummaryPanel,
    gameEngineState: GameEngineState,
    graphicsContext: GraphicsBuffer
) => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            squaddieSummaryPanel.battleSquaddieId
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
            HIT_POINTS_STYLE.bar.foregroundFillColor.saturation,
            HIT_POINTS_STYLE.bar.foregroundFillColor.brightness,
        ],
    }

    DrawBattleHUD.drawHorizontalDividedBar({
        graphicsContext,
        drawArea: RectAreaService.new({
            left:
                squaddieSummaryPanel.windowArea.left +
                ScreenDimensions.SCREEN_WIDTH / 12,
            height: HIT_POINTS_STYLE.bar.height,
            width: HIT_POINTS_STYLE.bar.width,
            top:
                squaddieSummaryPanel.windowArea.top +
                HIT_POINTS_STYLE.topOffset,
        }),
        currentAmount: currentHitPoints,
        maxAmount: maxHitPoints,
        strokeWeight: 2,
        colors: {
            ...HIT_POINTS_STYLE.bar.colors,
            foregroundFillColor: barFillColor,
        },
    })
}
