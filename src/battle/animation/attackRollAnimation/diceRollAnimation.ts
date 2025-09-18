import { RectArea, RectAreaService } from "../../../ui/rectArea"
import {
    RollResult,
    RollResultService,
} from "../../calculator/actionCalculator/rollResult"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { Label, LabelService } from "../../../ui/label"
import {
    DegreeOfSuccess,
    TDegreeOfSuccess,
} from "../../calculator/actionCalculator/degreeOfSuccess"
import {
    IndividualDieAnimation,
    IndividualDieAnimationService,
} from "./individualDieAnimation"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../../ui/constants"

const FIRST_DIE_ANIMATION_TIME_MS = 500
const MORE_DICE_ANIMATION_TIME_MS = 1000
const SHOW_RESULT_ANIMATION_TIME_MS = 1250

const notificationLayout = {
    leftOffsetFromDrawArea: 150,
    textBoxMargin: [0, 0, 0, 8],
    fontColor: [10, 10, 10],
    fillColor: [0, 0, 100, 120],
}

const degreeOfSuccessLayout = {
    fontSize: 16,
    cornerRadius: [0, 2, 2, 0],
    width: 200,
}

const extremeRollNotificationLayout = {
    fontSize: 24,
    width: 80,
    rightMargin: WINDOW_SPACING.SPACING1,
}

export interface DiceRollAnimation {
    dice: IndividualDieAnimation[]
    drawArea: RectArea
    notifications: {
        extremeRoll: Label | undefined
        degreeOfSuccess: Label | undefined
    }
    degreeOfSuccess: TDegreeOfSuccess

    animationStartTime: number | undefined
}

export const DiceRollAnimationService = {
    FIRST_DIE_ANIMATION_TIME_MS,
    MORE_DICE_ANIMATION_TIME_MS,
    SHOW_RESULT_ANIMATION_TIME_MS,
    new: ({
        rollResult,
        degreeOfSuccess,
        drawArea,
    }: {
        rollResult: RollResult
        degreeOfSuccess: TDegreeOfSuccess
        drawArea: RectArea
    }): DiceRollAnimation => {
        const diceAnimations = rollResult.occurred
            ? rollResult.rolls.map((rolledNumber, dieIndex) =>
                  IndividualDieAnimationService.new({
                      result: rolledNumber,
                      dieIndex,
                      drawArea,
                  })
              )
            : []

        const extremeRollNotificationLabel = createExtremeRollNotification({
            rollResult,
            drawArea,
        })
        const degreeOfSuccessLabel = createDegreeOfSuccessNotification({
            degreeOfSuccess,
            drawArea,
            extremeRollNotificationLabel,
        })

        return {
            dice: diceAnimations,
            notifications: {
                extremeRoll: extremeRollNotificationLabel,
                degreeOfSuccess: degreeOfSuccessLabel,
            },
            drawArea,
            degreeOfSuccess,
            animationStartTime: undefined,
        }
    },
    draw: ({
        graphicsBuffer,
        diceRollAnimation,
    }: {
        graphicsBuffer: GraphicsBuffer
        diceRollAnimation: DiceRollAnimation | undefined
    }) => {
        if (diceRollAnimation == undefined) return
        if (diceRollAnimation.animationStartTime == undefined) {
            diceRollAnimation.animationStartTime = Date.now()
        }

        const timeElapsed = Date.now() - diceRollAnimation.animationStartTime

        if (timeElapsed < FIRST_DIE_ANIMATION_TIME_MS) return
        drawTheFirstDie({ diceRollAnimation, graphicsBuffer })

        if (timeElapsed < MORE_DICE_ANIMATION_TIME_MS) return
        drawTheRemainingDie({ diceRollAnimation, graphicsBuffer })

        if (timeElapsed < SHOW_RESULT_ANIMATION_TIME_MS) return
        drawExtremeRollNotification({ diceRollAnimation, graphicsBuffer })
        drawDegreeOfSuccessNotification({ diceRollAnimation, graphicsBuffer })
    },
}

const drawTheFirstDie = ({
    diceRollAnimation,
    graphicsBuffer,
}: {
    diceRollAnimation: DiceRollAnimation
    graphicsBuffer: GraphicsBuffer
}) => {
    IndividualDieAnimationService.draw({
        individualDie: diceRollAnimation.dice[0],
        graphicsBuffer,
    })
}

const drawTheRemainingDie = ({
    diceRollAnimation,
    graphicsBuffer,
}: {
    diceRollAnimation: DiceRollAnimation
    graphicsBuffer: GraphicsBuffer
}) => {
    IndividualDieAnimationService.draw({
        individualDie: diceRollAnimation.dice[1],
        graphicsBuffer,
    })
}

const drawExtremeRollNotification = ({
    diceRollAnimation,
    graphicsBuffer,
}: {
    diceRollAnimation: DiceRollAnimation
    graphicsBuffer: GraphicsBuffer
}) => {
    LabelService.draw(
        diceRollAnimation.notifications.extremeRoll,
        graphicsBuffer
    )
}

const drawDegreeOfSuccessNotification = ({
    diceRollAnimation,
    graphicsBuffer,
}: {
    diceRollAnimation: DiceRollAnimation
    graphicsBuffer: GraphicsBuffer
}) => {
    LabelService.draw(
        diceRollAnimation.notifications.degreeOfSuccess,
        graphicsBuffer
    )
}

const createExtremeRollNotification = ({
    rollResult,
    drawArea,
}: {
    rollResult: RollResult
    drawArea: RectArea
}) => {
    if (!rollResult.occurred || rollResult.rolls.length == 0) return
    const isMaxRoll = rollResult.rolls.every(
        (dieAnimation) => dieAnimation == RollResultService.DIE_SIZE
    )
    const isMinRoll = rollResult.rolls.every(
        (dieAnimation) => dieAnimation == 1
    )

    if (!isMaxRoll && !isMinRoll) return

    return LabelService.new({
        textBoxMargin: notificationLayout.textBoxMargin,
        text: isMaxRoll ? "MAX!" : "botch",
        fontSize: extremeRollNotificationLayout.fontSize,
        fontColor: notificationLayout.fontColor,
        fillColor: notificationLayout.fillColor,
        area: RectAreaService.new({
            left:
                notificationLayout.leftOffsetFromDrawArea +
                RectAreaService.left(drawArea),
            bottom: RectAreaService.bottom(drawArea),
            height: RectAreaService.height(drawArea),
            width: extremeRollNotificationLayout.width,
        }),
        noStroke: true,
        horizAlign: HORIZONTAL_ALIGN.LEFT,
        vertAlign: VERTICAL_ALIGN.CENTER,
    })
}

const createDegreeOfSuccessNotification = ({
    degreeOfSuccess,
    drawArea,
    extremeRollNotificationLabel,
}: {
    degreeOfSuccess: TDegreeOfSuccess
    drawArea: RectArea
    extremeRollNotificationLabel: Label | undefined
}): Label | undefined => {
    if (degreeOfSuccess == DegreeOfSuccess.NONE) return

    const readableDegreeOfSuccess = {
        [DegreeOfSuccess.NONE]: "",
        [DegreeOfSuccess.CRITICAL_FAILURE]: "Critical Failure",
        [DegreeOfSuccess.FAILURE]: "Failure",
        [DegreeOfSuccess.SUCCESS]: "Success",
        [DegreeOfSuccess.CRITICAL_SUCCESS]: "Critical Success",
    }

    return LabelService.new({
        textBoxMargin: notificationLayout.textBoxMargin,
        text: readableDegreeOfSuccess[
            degreeOfSuccess as keyof typeof readableDegreeOfSuccess
        ],
        fontSize: degreeOfSuccessLayout.fontSize,
        fontColor: notificationLayout.fontColor,
        fillColor: notificationLayout.fillColor,
        area: RectAreaService.new({
            left: extremeRollNotificationLabel
                ? RectAreaService.right(
                      extremeRollNotificationLabel.rectangle.area
                  ) + extremeRollNotificationLayout.rightMargin
                : notificationLayout.leftOffsetFromDrawArea +
                  RectAreaService.left(drawArea),
            bottom: RectAreaService.bottom(drawArea),
            height: RectAreaService.height(drawArea),
            width: degreeOfSuccessLayout.width,
        }),
        horizAlign: HORIZONTAL_ALIGN.LEFT,
        vertAlign: VERTICAL_ALIGN.CENTER,
        noStroke: true,
    })
}
