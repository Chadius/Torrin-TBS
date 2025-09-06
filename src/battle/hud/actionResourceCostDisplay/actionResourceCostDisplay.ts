import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { ActionResourceCost } from "../../../action/actionResourceCost"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ACTION_POINT_METER_FILL_COLOR } from "../../../ui/colors"

export interface ActionResourceCostDisplay {
    actionResourceCost: ActionResourceCost
    drawingArea: RectArea
}

const Layout = {
    background: {
        fillColor: [0, 0, 0],
        strokeColor: [0, 0, 0],
        strokeWeight: 1,
    },
    pip: {
        fillColor: ACTION_POINT_METER_FILL_COLOR,
        noStroke: true,
        margin: 2,
        pip0: {
            widthRatio: 0.3,
            heightRatio: 0.9,
        },
        pip1: {
            widthRatio: 0.9,
            heightRatio: 0.8,
        },
        pip2: {
            widthRatio: 0.9,
            heightRatio: 0.8,
        },
    },
}

export const ActionResourceCostDisplayService = {
    new: ({
        objectRepository,
        actionTemplateId,
        drawingArea,
    }: {
        objectRepository: ObjectRepository
        actionTemplateId: string
        drawingArea: RectArea
    }): ActionResourceCostDisplay => {
        if (!objectRepository) {
            throw new Error(
                "[ActionResourceCostDisplayService.new] objectRepository must be defined"
            )
        }
        if (!actionTemplateId) {
            throw new Error(
                "[ActionResourceCostDisplayService.new] actionTemplateId must be defined"
            )
        }
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )

        return {
            actionResourceCost: actionTemplate.resourceCost,
            drawingArea,
        }
    },
    draw: ({
        actionResourceCostDisplay,
        graphicsContext,
    }: {
        actionResourceCostDisplay: ActionResourceCostDisplay
        graphicsContext: GraphicsBuffer
    }) => {
        graphicsContext.push()
        drawBackground({ actionResourceCostDisplay, graphicsContext })
        drawActionPoints({ actionResourceCostDisplay, graphicsContext })
        graphicsContext.pop()
    },
}

const drawBackground = ({
    actionResourceCostDisplay,
    graphicsContext,
}: {
    actionResourceCostDisplay: ActionResourceCostDisplay
    graphicsContext: GraphicsBuffer
}) => {
    graphicsContext.strokeWeight(Layout.background.strokeWeight)
    graphicsContext.fill(
        Layout.background.fillColor[0],
        Layout.background.fillColor[1],
        Layout.background.fillColor[2]
    )
    graphicsContext.rect(
        RectAreaService.left(actionResourceCostDisplay.drawingArea),
        RectAreaService.top(actionResourceCostDisplay.drawingArea),
        RectAreaService.width(actionResourceCostDisplay.drawingArea),
        RectAreaService.height(actionResourceCostDisplay.drawingArea)
    )
}

const drawActionPoints = ({
    actionResourceCostDisplay,
    graphicsContext,
}: {
    actionResourceCostDisplay: ActionResourceCostDisplay
    graphicsContext: GraphicsBuffer
}) => {
    if (actionResourceCostDisplay.actionResourceCost.actionPoints <= 0) return

    if (Layout.pip.noStroke) graphicsContext.noStroke()
    graphicsContext.fill(
        Layout.pip.fillColor[0],
        Layout.pip.fillColor[1],
        Layout.pip.fillColor[2]
    )

    let left = RectAreaService.left(actionResourceCostDisplay.drawingArea)
    let pipWidth = RectAreaService.width(actionResourceCostDisplay.drawingArea)
    let pipHeight = RectAreaService.height(
        actionResourceCostDisplay.drawingArea
    )
    let pipBottom = RectAreaService.bottom(
        actionResourceCostDisplay.drawingArea
    )

    for (
        let i = 0;
        i <
        Math.min(actionResourceCostDisplay.actionResourceCost.actionPoints, 3);
        i++
    ) {
        switch (i) {
            case 0:
                pipWidth = pipWidth * Layout.pip.pip0.widthRatio
                pipHeight = pipHeight * Layout.pip.pip0.heightRatio
                break
            case 1:
                pipWidth = pipWidth * Layout.pip.pip1.widthRatio
                pipHeight = pipHeight * Layout.pip.pip1.heightRatio
                break
            case 2:
                pipWidth = pipWidth * Layout.pip.pip2.widthRatio
                pipHeight = pipHeight * Layout.pip.pip2.heightRatio
                break
        }

        graphicsContext.rect(left, pipBottom - pipHeight, pipWidth, pipHeight)

        left = left + pipWidth + Layout.pip.margin
    }
}
