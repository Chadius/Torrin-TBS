import { RectArea } from "../../ui/rectArea"
import {
    ColorDescription,
    GraphicsBuffer,
} from "../../utils/graphics/graphicsRenderer"

export const DrawBattleHUD = {
    drawHorizontalDividedBar: ({
        graphicsContext,
        drawArea,
        currentAmount,
        maxAmount,
        colors,
        strokeWeight,
    }: {
        currentAmount: number
        maxAmount: number
        drawArea: RectArea
        graphicsContext: GraphicsBuffer
        colors: {
            strokeColor: ColorDescription
            foregroundFillColor: ColorDescription
            backgroundFillColor: ColorDescription
        }
        strokeWeight: number
    }) => {
        return drawHorizontalDividedBar({
            graphicsContext,
            drawArea,
            currentAmount,
            maxAmount,
            colors,
            strokeWeight,
        })
    },
}

const drawHorizontalDividedBar = ({
    graphicsContext,
    drawArea,
    currentAmount,
    maxAmount,
    colors,
    strokeWeight,
}: {
    currentAmount: number
    maxAmount: number
    drawArea: RectArea
    graphicsContext: GraphicsBuffer
    colors: {
        strokeColor: ColorDescription
        foregroundFillColor: ColorDescription
        backgroundFillColor: ColorDescription
    }
    strokeWeight: number
}) => {
    const drawContainerOutline = ({
        graphicsContext,
        drawArea,
        colors,
        strokeWeight,
    }: {
        drawArea: RectArea
        graphicsContext: GraphicsBuffer
        colors: {
            strokeColor: ColorDescription
            foregroundFillColor: ColorDescription
            backgroundFillColor: ColorDescription
        }
        strokeWeight: number
    }) => {
        graphicsContext.stroke(
            colors.strokeColor.hsb[0],
            colors.strokeColor.hsb[1],
            colors.strokeColor.hsb[2]
        )
        graphicsContext.fill(
            colors.backgroundFillColor.hsb[0],
            colors.backgroundFillColor.hsb[1],
            colors.backgroundFillColor.hsb[2]
        )
        graphicsContext.strokeWeight(strokeWeight)
        graphicsContext.rect(
            drawArea.left,
            drawArea.top,
            drawArea.width,
            drawArea.height
        )
    }

    const drawCurrentAmountBar = ({
        graphicsContext,
        drawArea,
        currentAmount,
        maxAmount,
        colors,
    }: {
        currentAmount: number
        maxAmount: number
        drawArea: RectArea
        graphicsContext: GraphicsBuffer
        colors: {
            strokeColor: ColorDescription
            foregroundFillColor: ColorDescription
            backgroundFillColor: ColorDescription
        }
    }) => {
        graphicsContext.noStroke()
        graphicsContext.fill(
            colors.foregroundFillColor.hsb[0],
            colors.foregroundFillColor.hsb[1],
            colors.foregroundFillColor.hsb[2]
        )
        const width: number = (currentAmount * drawArea.width) / maxAmount
        graphicsContext.rect(
            drawArea.left,
            drawArea.top,
            width,
            drawArea.height
        )
    }

    const drawBarDivisions = ({
        graphicsContext,
        drawArea,
        currentAmount,
        maxAmount,
        colors,
        strokeWeight,
    }: {
        currentAmount: number
        maxAmount: number
        drawArea: RectArea
        graphicsContext: GraphicsBuffer
        colors: {
            strokeColor: ColorDescription
            foregroundFillColor: ColorDescription
            backgroundFillColor: ColorDescription
        }
        strokeWeight: number
    }) => {
        graphicsContext.noStroke()
        graphicsContext.fill(
            colors.backgroundFillColor.hsb[0],
            colors.backgroundFillColor.hsb[1],
            colors.backgroundFillColor.hsb[2]
        )
        for (let i = 1; i < currentAmount; i++) {
            const horizontalOffsetFromLeft: number =
                (i * drawArea.width) / maxAmount
            graphicsContext.rect(
                drawArea.left + horizontalOffsetFromLeft,
                drawArea.top,
                strokeWeight,
                drawArea.height
            )
        }
    }

    graphicsContext.push()

    drawContainerOutline({ graphicsContext, drawArea, colors, strokeWeight })
    drawCurrentAmountBar({
        currentAmount,
        maxAmount,
        graphicsContext,
        drawArea,
        colors,
    })
    drawBarDivisions({
        currentAmount,
        maxAmount,
        graphicsContext,
        drawArea,
        colors,
        strokeWeight,
    })

    graphicsContext.pop()
}
