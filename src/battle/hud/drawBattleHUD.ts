import {RectArea} from "../../ui/rectArea";
import {ColorDescription, GraphicsContext} from "../../utils/graphics/graphicsContext";

export const DrawBattleHUD = {
    drawHorizontalDividedBar: ({graphicsContext, drawArea, currentAmount, maxAmount, colors, strokeWeight}: {
        currentAmount: number,
        maxAmount: number,
        drawArea: RectArea,
        graphicsContext: GraphicsContext,
        colors: {
            strokeColor: ColorDescription,
            foregroundFillColor: ColorDescription,
            backgroundFillColor: ColorDescription,
        },
        strokeWeight: number
    }) => {
        return drawHorizontalDividedBar({graphicsContext, drawArea, currentAmount, maxAmount, colors, strokeWeight});
    }
};

const drawHorizontalDividedBar = ({graphicsContext, drawArea, currentAmount, maxAmount, colors, strokeWeight}: {
    currentAmount: number,
    maxAmount: number,
    drawArea: RectArea,
    graphicsContext: GraphicsContext,
    colors: {
        strokeColor: ColorDescription,
        foregroundFillColor: ColorDescription,
        backgroundFillColor: ColorDescription,
    },
    strokeWeight: number
}) => {
    const drawContainerOutline = ({graphicsContext, drawArea, colors, strokeWeight}: {
        drawArea: RectArea,
        graphicsContext: GraphicsContext,
        colors: {
            strokeColor: ColorDescription,
            foregroundFillColor: ColorDescription,
            backgroundFillColor: ColorDescription,
        },
        strokeWeight: number
    }) => {
        graphicsContext.stroke(colors.strokeColor);
        graphicsContext.fill(colors.backgroundFillColor);
        graphicsContext.strokeWeight(strokeWeight);
        graphicsContext.rect(drawArea.left, drawArea.top, drawArea.width, drawArea.height);
    }

    const drawCurrentAmountBar = ({graphicsContext, drawArea, currentAmount, maxAmount, colors}: {
        currentAmount: number,
        maxAmount: number,
        drawArea: RectArea,
        graphicsContext: GraphicsContext,
        colors: {
            strokeColor: ColorDescription,
            foregroundFillColor: ColorDescription,
            backgroundFillColor: ColorDescription,
        }
    }) => {
        graphicsContext.noStroke();
        graphicsContext.fill(colors.foregroundFillColor);
        const width: number = currentAmount * drawArea.width / maxAmount;
        graphicsContext.rect(drawArea.left, drawArea.top, width, drawArea.height);
    }

    const drawBarDivisions = ({graphicsContext, drawArea, currentAmount, maxAmount, colors, strokeWeight}: {
        currentAmount: number,
        maxAmount: number,
        drawArea: RectArea,
        graphicsContext: GraphicsContext,
        colors: {
            strokeColor: ColorDescription,
            foregroundFillColor: ColorDescription,
            backgroundFillColor: ColorDescription,
        },
        strokeWeight: number
    }) => {
        graphicsContext.noStroke();
        graphicsContext.fill(colors.backgroundFillColor);
        for (let i = 1; i < currentAmount; i++) {
            const horizontalOffsetFromLeft: number = i * drawArea.width / maxAmount;
            graphicsContext.rect(
                drawArea.left + horizontalOffsetFromLeft,
                drawArea.top,
                strokeWeight,
                drawArea.height,
            )
        }
    }

    graphicsContext.push();

    drawContainerOutline({graphicsContext, drawArea, colors, strokeWeight});
    drawCurrentAmountBar({currentAmount, maxAmount, graphicsContext, drawArea, colors});
    drawBarDivisions({currentAmount, maxAmount, graphicsContext, drawArea, colors, strokeWeight});

    graphicsContext.pop();
}
