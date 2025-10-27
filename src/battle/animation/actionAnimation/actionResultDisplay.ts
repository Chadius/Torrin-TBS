import { TextBox, TextBoxService } from "../../../ui/textBox/textBox"
import { RectAreaService } from "../../../ui/rectArea"
import { Rectangle, RectangleService } from "../../../ui/rectangle/rectangle"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { WINDOW_SPACING } from "../../../ui/constants"
import { TextGraphicalHandlingService } from "../../../utils/graphics/textGraphicalHandlingService"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"

export interface ActionResultDisplay {
    damageTextBox: TextBox | undefined
    absorbedTextBox: TextBox | undefined
    textBackgroundRectangle: Rectangle | undefined
}

const constants = {
    colors: {
        damage: [0, 70, 10] as [number, number, number],
        healing: [120, 70, 10] as [number, number, number],
        absorption: [200, 50, 30] as [number, number, number],
        background: [2, 90, 127] as [number, number, number],
    },
    textSize: 18,
    lineHeight: 20,
    padding: WINDOW_SPACING.SPACING1,
    strokeWeight: 1,
}

export const ActionResultDisplayService = {
    new: ({
        damageTaken,
        damageAbsorbed,
        healingReceived,
        left,
        top,
        hue,
        graphicsContext,
    }: {
        damageTaken?: number
        damageAbsorbed?: number
        healingReceived?: number
        left: number
        top: number
        hue: number
        graphicsContext: GraphicsBuffer
    }): ActionResultDisplay => {
        let damageTextBox: TextBox | undefined = undefined
        let absorbedTextBox: TextBox | undefined = undefined
        let currentTop = top

        if (healingReceived && healingReceived > 0) {
            damageTextBox = createTextBox({
                text: `+${healingReceived} HP`,
                left,
                top: currentTop,
                color: constants.colors.healing,
                graphicsContext,
            })
        } else if (damageTaken && damageTaken > 0) {
            damageTextBox = createTextBox({
                text: `${damageTaken} HP`,
                left,
                top: currentTop,
                color: constants.colors.damage,
                graphicsContext,
            })
        }

        if (damageAbsorbed && damageAbsorbed > 0) {
            currentTop -= constants.lineHeight
            absorbedTextBox = createTextBox({
                text: `${damageAbsorbed} absorbed`,
                left,
                top: currentTop,
                color: constants.colors.absorption,
                graphicsContext,
            })
        }

        const textBackgroundRectangle = createBackgroundRectangle({
            damageTextBox,
            absorbedTextBox,
            hue,
        })

        return {
            damageTextBox,
            absorbedTextBox,
            textBackgroundRectangle,
        }
    },

    draw: (
        display: ActionResultDisplay | undefined,
        graphicsContext: GraphicsBuffer
    ) => {
        if (display == undefined) return

        if (display.textBackgroundRectangle) {
            RectangleService.draw(
                display.textBackgroundRectangle,
                graphicsContext
            )
        }

        if (display.absorbedTextBox) {
            TextBoxService.draw(display.absorbedTextBox, graphicsContext)
        }

        if (display.damageTextBox) {
            TextBoxService.draw(display.damageTextBox, graphicsContext)
        }
    },
}

const createTextBox = ({
    text,
    left,
    top,
    color,
    graphicsContext,
}: {
    text: string
    left: number
    top: number
    color: [number, number, number]
    graphicsContext: GraphicsBuffer
}): TextBox => {
    const textFit = TextGraphicalHandlingService.fitTextWithinSpace({
        text,
        currentContainerWidth: ScreenDimensions.SCREEN_WIDTH * 0.5,
        graphics: graphicsContext,
        fontDescription: {
            preferredFontSize: constants.textSize,
            strokeWeight: constants.strokeWeight,
        },
        mitigations: [{ maximumNumberOfLines: 1 }],
    })

    return TextBoxService.new({
        text,
        fontSize: constants.textSize,
        fontColor: color,
        area: RectAreaService.new({
            left,
            top,
            width: textFit.maximumWidthOfText + constants.padding,
            height: constants.lineHeight,
        }),
    })
}

const createBackgroundRectangle = ({
    damageTextBox,
    absorbedTextBox,
    hue,
}: {
    damageTextBox: TextBox | undefined
    absorbedTextBox: TextBox | undefined
    hue: number
}): Rectangle | undefined => {
    if (!damageTextBox && !absorbedTextBox) return undefined

    let topMostBox = damageTextBox
    let bottomMostBox = damageTextBox

    if (absorbedTextBox) {
        topMostBox = absorbedTextBox
        if (!bottomMostBox) bottomMostBox = absorbedTextBox
    }

    if (!topMostBox) return undefined

    let maxWidth = 0
    if (damageTextBox) {
        maxWidth = Math.max(maxWidth, RectAreaService.width(damageTextBox.area))
    }
    if (absorbedTextBox) {
        maxWidth = Math.max(
            maxWidth,
            RectAreaService.width(absorbedTextBox.area)
        )
    }

    return RectangleService.new({
        area: RectAreaService.new({
            left: RectAreaService.left(topMostBox.area) - constants.padding,
            right:
                RectAreaService.left(topMostBox.area) +
                maxWidth +
                constants.padding,
            top: RectAreaService.top(topMostBox.area) - constants.padding / 2,
            bottom: bottomMostBox
                ? RectAreaService.bottom(bottomMostBox.area) +
                  constants.padding / 2
                : RectAreaService.bottom(topMostBox.area) +
                  constants.padding / 2,
        }),
        fillColor: [hue, ...constants.colors.background],
        noStroke: true,
    })
}
