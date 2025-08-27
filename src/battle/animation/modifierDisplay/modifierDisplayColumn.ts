import { Label, LabelService } from "../../../ui/label"
import { isValidValue } from "../../../utils/objectValidityCheck"
import { RectAreaService } from "../../../ui/rectArea"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { GOLDEN_RATIO, VERTICAL_ALIGN } from "../../../ui/constants"
import { TextFormatService } from "../../../utils/graphics/textFormatService"

export type ModifierDisplayColumnData = {
    amount?: number
    description: string
}

export enum ModifierDisplayColumnPosition {
    LEFT = "LEFT",
    RIGHT = "RIGHT",
}

const ModifierDisplayDataLayout = {
    fontSize: 16,
    fontColorBasedOnValue: {
        negative: [10, 5, 80],
        neutral: [10, 5, 85],
        positive: [10, 5, 90],
    },
    fillColor: [0, 0, 100, 96],
    textBoxMargin: [8],
    area: {
        startColumnByPosition: {
            [ModifierDisplayColumnPosition.LEFT]: 3,
            [ModifierDisplayColumnPosition.RIGHT]: 7,
        },
        endColumnByPosition: {
            [ModifierDisplayColumnPosition.LEFT]: 4,
            [ModifierDisplayColumnPosition.RIGHT]: 8,
        },
        height: 32,
    },
}

export interface ModifierDisplayColumn {
    labels: Label[]
    animationStartTime: number
}

const MODIFIER_DISPLAY_TOP =
    ScreenDimensions.SCREEN_HEIGHT / GOLDEN_RATIO +
    ScreenDimensions.SCREEN_HEIGHT * 0.1
const MODIFIER_DISPLAY_DELAY = 500
const MODIFIER_DISPLAY_SHOW_ALL_DELAY = 500

export const ModifierDisplayColumnService = {
    MODIFIER_DISPLAY_DELAY: MODIFIER_DISPLAY_DELAY,
    new: ({
        modifiers,
        sortOrderLeastToGreatest,
        position,
    }: {
        modifiers: ModifierDisplayColumnData[]
        sortOrderLeastToGreatest: boolean
        position: ModifierDisplayColumnPosition
    }): ModifierDisplayColumn => {
        const modifiersThatCanBeSorted = modifiers
            .filter(
                (modifier) =>
                    isValidValue(modifier.amount) && modifier.amount != 0
            )
            .sort((a, b) =>
                sortOrderLeastToGreatest
                    ? a.amount - b.amount
                    : b.amount - a.amount
            )
        const modifiersThatCannotBeSorted = modifiers.filter(
            (modifier) => !isValidValue(modifier.amount)
        )

        const labels: Label[] = [
            ...modifiersThatCannotBeSorted,
            ...modifiersThatCanBeSorted,
        ].map((modifier, index) =>
            createLabel({ modifier: modifier, index: index, position })
        )

        return {
            labels,
            animationStartTime: undefined,
        }
    },
    draw: ({
        modifierDisplay,
        graphicsBuffer,
    }: {
        modifierDisplay: ModifierDisplayColumn
        graphicsBuffer: GraphicsBuffer
    }) => {
        if (!modifierDisplay) return
        if (modifierDisplay.animationStartTime == undefined)
            modifierDisplay.animationStartTime = Date.now()
        const timeElapsed: number =
            Date.now() - modifierDisplay.animationStartTime
        const showAllLines = timeElapsed > MODIFIER_DISPLAY_SHOW_ALL_DELAY
        const numberOfLinesToShow = showAllLines
            ? modifierDisplay.labels.length
            : Math.min(
                  timeElapsed / MODIFIER_DISPLAY_DELAY + 1,
                  modifierDisplay.labels.length
              )

        modifierDisplay.labels
            .slice(0, numberOfLinesToShow)
            .forEach((label) => {
                LabelService.draw(label, graphicsBuffer)
            })
    },
}

const createLabel = ({
    modifier,
    index,
    position,
}: {
    modifier: ModifierDisplayColumnData
    index: number
    position: ModifierDisplayColumnPosition
}): Label => {
    let fontColor = ModifierDisplayDataLayout.fontColorBasedOnValue.neutral
    switch (true) {
        case modifier.amount < 0:
            fontColor = ModifierDisplayDataLayout.fontColorBasedOnValue.negative
            break
        case modifier.amount > 0:
            fontColor = ModifierDisplayDataLayout.fontColorBasedOnValue.positive
            break
    }

    return LabelService.new({
        text: formatModifierDisplayData(modifier),
        fontSize: ModifierDisplayDataLayout.fontSize,
        fontColor,
        fillColor: ModifierDisplayDataLayout.fillColor,
        textBoxMargin: ModifierDisplayDataLayout.textBoxMargin,
        noStroke: true,
        area: RectAreaService.new({
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn:
                ModifierDisplayDataLayout.area.startColumnByPosition[position],
            endColumn:
                ModifierDisplayDataLayout.area.endColumnByPosition[position],
            top:
                MODIFIER_DISPLAY_TOP +
                index * ModifierDisplayDataLayout.area.height,
            height: ModifierDisplayDataLayout.area.height,
        }),
        vertAlign: VERTICAL_ALIGN.CENTER,
    })
}

const formatModifierDisplayData = (
    modifier: ModifierDisplayColumnData
): string => {
    const amountText =
        modifier.amount != undefined
            ? TextFormatService.padPlusOnPositiveNumber(modifier.amount) + " "
            : ""
    return `${amountText}${modifier.description}`
}
