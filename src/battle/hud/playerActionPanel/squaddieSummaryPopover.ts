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
import { TARGET_CANCEL_BUTTON_TOP } from "../../orchestratorComponents/battlePlayerSquaddieTarget"
import { ACTOR_TEXT_WINDOW } from "../../animation/actionAnimation/actorTextWindow"

const SQUADDIE_SUMMARY_POPOVER_STYLE = {
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

export enum SquaddieSummaryPopoverPosition {
    SELECT_MAIN = "SELECT_MAIN",
    SELECT_TARGET = "SELECT_TARGET",
    ANIMATE_SQUADDIE_ACTION = "ANIMATE_SQUADDIE_ACTION",
}

export interface SquaddieSummaryPopover {
    battleSquaddieId: string
    windowArea: RectArea
    position: SquaddieSummaryPopoverPosition

    expirationTime?: number
    windowHue?: number
    squaddiePortrait?: ImageUI
    actionPointsTextBox?: TextBox
    hitPointsTextBox?: TextBox
    squaddieIdTextBox?: TextBox
}

export const SquaddieSummaryPopoverService = {
    new: ({
        startingColumn,
        battleSquaddieId,
        position,
        expirationTime,
    }: {
        startingColumn: number
        battleSquaddieId: string
        position: SquaddieSummaryPopoverPosition
        expirationTime?: number
    }): SquaddieSummaryPopover => {
        const popover: SquaddieSummaryPopover = {
            battleSquaddieId,
            position,
            windowArea: RectAreaService.new({
                top:
                    ScreenDimensions.SCREEN_HEIGHT -
                    WINDOW_SPACING.SPACING1 -
                    SQUADDIE_SUMMARY_POPOVER_STYLE.height,
                height: SQUADDIE_SUMMARY_POPOVER_STYLE.height,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                startColumn: startingColumn > 8 ? 8 : startingColumn,
                endColumn: startingColumn > 8 ? 11 : startingColumn + 3,
            }),
            expirationTime,
        }

        changePopoverPosition({
            squaddieSummaryPopover: popover,
            position,
            forceReposition: true,
        })

        return popover
    },
    update: ({
        objectRepository,
        gameEngineState,
        squaddieSummaryPopover,
    }: {
        objectRepository: ObjectRepository
        resourceHandler: ResourceHandler
        gameEngineState: GameEngineState
        squaddieSummaryPopover: SquaddieSummaryPopover
    }) => {
        maybeRecreateUIElements({
            squaddieSummaryPopover,
            objectRepository,
            gameEngineState,
        })
    },
    draw: ({
        graphicsBuffer,
        gameEngineState,
        squaddieSummaryPopover,
    }: {
        graphicsBuffer: GraphicsBuffer
        gameEngineState: GameEngineState
        squaddieSummaryPopover: SquaddieSummaryPopover
    }) => {
        drawSummarySquaddieWindow({
            squaddieSummaryPopover,
            graphicsBuffer,
            gameEngineState,
        })

        if (squaddieSummaryPopover.squaddiePortrait) {
            squaddieSummaryPopover.squaddiePortrait.draw(graphicsBuffer)
        }
        TextBoxService.draw(
            squaddieSummaryPopover.squaddieIdTextBox,
            graphicsBuffer
        )

        drawActionPoints(
            squaddieSummaryPopover,
            gameEngineState,
            graphicsBuffer
        )
        drawHitPoints(squaddieSummaryPopover, gameEngineState, graphicsBuffer)
        TextBoxService.draw(
            squaddieSummaryPopover.actionPointsTextBox,
            graphicsBuffer
        )
        TextBoxService.draw(
            squaddieSummaryPopover.hitPointsTextBox,
            graphicsBuffer
        )
    },
    isMouseHoveringOver: ({
        mouseLocation,
        squaddieSummaryPopover,
    }: {
        mouseLocation: { x: number; y: number }
        squaddieSummaryPopover: SquaddieSummaryPopover
    }): boolean => {
        return RectAreaService.isInside(
            squaddieSummaryPopover.windowArea,
            mouseLocation.x,
            mouseLocation.y
        )
    },
    willExpireOverTime: ({
        squaddieSummaryPopover,
    }: {
        squaddieSummaryPopover: SquaddieSummaryPopover
    }): boolean => {
        return isValidValue(squaddieSummaryPopover.expirationTime)
    },
    changePopoverPosition: ({
        popover,
        position,
    }: {
        popover: SquaddieSummaryPopover
        position: SquaddieSummaryPopoverPosition
    }) => {
        changePopoverPosition({
            squaddieSummaryPopover: popover,
            position,
        })
    },
}

const maybeRecreateUIElements = ({
    squaddieSummaryPopover,
    objectRepository,
    gameEngineState,
}: {
    squaddieSummaryPopover: SquaddieSummaryPopover
    objectRepository: ObjectRepository
    gameEngineState: GameEngineState
}) => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            squaddieSummaryPopover.battleSquaddieId
        )
    )

    squaddieSummaryPopover.windowHue =
        HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation]

    generateSquaddiePortrait({
        squaddieSummaryPopover: squaddieSummaryPopover,
        gameEngineState,
    })

    createSquaddieIdUIElements(squaddieSummaryPopover, squaddieTemplate)

    createActionPointsUIElements(
        squaddieTemplate,
        battleSquaddie,
        squaddieSummaryPopover
    )

    createHitPointsUIElements(
        squaddieTemplate,
        battleSquaddie,
        squaddieSummaryPopover
    )
}

const createActionPointsUIElements = (
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    squaddieSummaryPopover: SquaddieSummaryPopover
) => {
    const { actionPointsRemaining } = SquaddieService.getNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })

    squaddieSummaryPopover.actionPointsTextBox = TextBoxService.new({
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
                squaddieSummaryPopover.windowArea.left +
                WINDOW_SPACING.SPACING1,
            height: ACTION_POINTS_STYLE.bar.height,
            width: ScreenDimensions.SCREEN_WIDTH / 12 - WINDOW_SPACING.SPACING2,
            top:
                squaddieSummaryPopover.windowArea.top +
                ACTION_POINTS_STYLE.topOffset,
        }),
    })
}

const createSquaddieIdUIElements = (
    squaddieSummaryPopover: SquaddieSummaryPopover,
    squaddieTemplate: SquaddieTemplate
) => {
    squaddieSummaryPopover.squaddieIdTextBox = TextBoxService.new({
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
                squaddieSummaryPopover.windowArea.left +
                SQUADDIE_PORTRAIT_STYLE.width +
                WINDOW_SPACING.SPACING1,
            height: SQUADDIE_ID_STYLE.bottomOffset,
            right:
                RectAreaService.right(squaddieSummaryPopover.windowArea) -
                WINDOW_SPACING.SPACING1,
            top:
                squaddieSummaryPopover.windowArea.top +
                SQUADDIE_ID_STYLE.topOffset,
        }),
    })
}

const createHitPointsUIElements = (
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    squaddieSummaryPopover: SquaddieSummaryPopover
) => {
    const { currentHitPoints, maxHitPoints } = SquaddieService.getHitPoints({
        squaddieTemplate,
        battleSquaddie,
    })
    squaddieSummaryPopover.hitPointsTextBox = TextBoxService.new({
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
                squaddieSummaryPopover.windowArea.left +
                WINDOW_SPACING.SPACING1,
            height: HIT_POINTS_STYLE.bar.height,
            width: ScreenDimensions.SCREEN_WIDTH / 12 - WINDOW_SPACING.SPACING2,
            top:
                squaddieSummaryPopover.windowArea.top +
                HIT_POINTS_STYLE.topOffset,
        }),
    })
}

const drawSummarySquaddieWindow = ({
    squaddieSummaryPopover,
    graphicsBuffer,
}: {
    graphicsBuffer: GraphicsBuffer
    squaddieSummaryPopover: SquaddieSummaryPopover
    gameEngineState: GameEngineState
}) => {
    graphicsBuffer.push()
    graphicsBuffer.fill(
        squaddieSummaryPopover.windowHue,
        SQUADDIE_SUMMARY_POPOVER_STYLE.color.saturation,
        SQUADDIE_SUMMARY_POPOVER_STYLE.color.brightness
    )
    graphicsBuffer.rect(
        RectAreaService.left(squaddieSummaryPopover.windowArea),
        RectAreaService.top(squaddieSummaryPopover.windowArea),
        RectAreaService.width(squaddieSummaryPopover.windowArea),
        RectAreaService.height(squaddieSummaryPopover.windowArea)
    )
    graphicsBuffer.pop()
}

const generateSquaddiePortrait = ({
    squaddieSummaryPopover,
    gameEngineState,
}: {
    squaddieSummaryPopover: SquaddieSummaryPopover
    gameEngineState: GameEngineState
}) => {
    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            squaddieSummaryPopover.battleSquaddieId
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
        squaddieSummaryPopover.squaddiePortrait = new ImageUI({
            graphic: portraitIcon,
            area: RectAreaService.new({
                left:
                    SQUADDIE_PORTRAIT_STYLE.left +
                    squaddieSummaryPopover.windowArea.left,
                top:
                    SQUADDIE_PORTRAIT_STYLE.top +
                    squaddieSummaryPopover.windowArea.top,
                width: SQUADDIE_PORTRAIT_STYLE.width,
                height: SQUADDIE_PORTRAIT_STYLE.height,
            }),
        })
    } else {
        squaddieSummaryPopover.squaddiePortrait = null
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
    squaddieSummaryPopover: SquaddieSummaryPopover,
    gameEngineState: GameEngineState,
    graphicsContext: GraphicsBuffer
) => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            squaddieSummaryPopover.battleSquaddieId
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
                squaddieSummaryPopover.windowArea.left +
                ScreenDimensions.SCREEN_WIDTH / 12,
            height: ACTION_POINTS_STYLE.bar.height,
            width: ACTION_POINTS_STYLE.bar.width,
            top:
                squaddieSummaryPopover.windowArea.top +
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
    squaddieSummaryPopover: SquaddieSummaryPopover,
    gameEngineState: GameEngineState,
    graphicsContext: GraphicsBuffer
) => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            squaddieSummaryPopover.battleSquaddieId
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
                squaddieSummaryPopover.windowArea.left +
                ScreenDimensions.SCREEN_WIDTH / 12,
            height: HIT_POINTS_STYLE.bar.height,
            width: HIT_POINTS_STYLE.bar.width,
            top:
                squaddieSummaryPopover.windowArea.top +
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

const changePopoverPosition = ({
    squaddieSummaryPopover,
    position,
    forceReposition,
}: {
    squaddieSummaryPopover: SquaddieSummaryPopover
    position: SquaddieSummaryPopoverPosition
    forceReposition?: boolean
}) => {
    if (!isValidValue(squaddieSummaryPopover)) {
        return
    }

    if (
        forceReposition !== true &&
        squaddieSummaryPopover.position === position
    ) {
        return
    }

    squaddieSummaryPopover.position = position

    switch (squaddieSummaryPopover.position) {
        case SquaddieSummaryPopoverPosition.SELECT_MAIN:
            RectAreaService.setBottom(
                squaddieSummaryPopover.windowArea,
                ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING1
            )
            break
        case SquaddieSummaryPopoverPosition.SELECT_TARGET:
            RectAreaService.setBottom(
                squaddieSummaryPopover.windowArea,
                TARGET_CANCEL_BUTTON_TOP - WINDOW_SPACING.SPACING1
            )
            break
        case SquaddieSummaryPopoverPosition.ANIMATE_SQUADDIE_ACTION:
            squaddieSummaryPopover.windowArea.top =
                ACTOR_TEXT_WINDOW.top +
                ACTOR_TEXT_WINDOW.height +
                WINDOW_SPACING.SPACING4
            break
    }

    repositionSquaddieUIElements(squaddieSummaryPopover)
}

const repositionSquaddieUIElements = (
    squaddieSummaryPopover: SquaddieSummaryPopover
) => {
    if (isValidValue(squaddieSummaryPopover.squaddiePortrait)) {
        squaddieSummaryPopover.squaddiePortrait.area.top =
            SQUADDIE_PORTRAIT_STYLE.top + squaddieSummaryPopover.windowArea.top
    }
    if (isValidValue(squaddieSummaryPopover.squaddieIdTextBox)) {
        squaddieSummaryPopover.squaddieIdTextBox.area.top =
            squaddieSummaryPopover.windowArea.top + SQUADDIE_ID_STYLE.topOffset
    }
    if (isValidValue(squaddieSummaryPopover.actionPointsTextBox)) {
        squaddieSummaryPopover.actionPointsTextBox.area.top =
            squaddieSummaryPopover.windowArea.top +
            ACTION_POINTS_STYLE.topOffset
    }
    if (isValidValue(squaddieSummaryPopover.hitPointsTextBox)) {
        squaddieSummaryPopover.hitPointsTextBox.area.top =
            squaddieSummaryPopover.windowArea.top + HIT_POINTS_STYLE.topOffset
    }
}
