import { TActionTilePosition } from "../actionTilePosition"
import {
    TileAttributeLabel,
    TileAttributeLabelNewParameters,
    TileAttributeLabelService,
} from "./tileAttributeLabel"
import { RectAreaService } from "../../../../../ui/rectArea"
import { ScreenLocation } from "../../../../../utils/mouseConfig"
import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import { ResourceRepository } from "../../../../../resource/resourceRepository.ts"

export interface TileAttributeLabelStack {
    labels: TileAttributeLabel[]
    bottom: number
    tilePosition: TActionTilePosition
}

export const TileAttributeLabelStackService = {
    new: ({
        bottom,
        tilePosition,
    }: {
        bottom: number
        tilePosition: TActionTilePosition
    }): TileAttributeLabelStack => {
        return {
            labels: [],
            bottom,
            tilePosition,
        }
    },
    add: ({
        stack,
        newTile,
    }: {
        stack: TileAttributeLabelStack
        newTile: TileAttributeLabelNewParameters
    }) => {
        const newTileAttributeLabel = TileAttributeLabelService.new(newTile)
        let topOfTheStack = stack.bottom
        if (stack.labels.length >= 1) {
            const topLabel = stack.labels.slice(-1)[0]
            const topLabelArea = TileAttributeLabelService.getArea(topLabel)
            topOfTheStack = RectAreaService.top(topLabelArea)
        }

        TileAttributeLabelService.setLocation({
            label: newTileAttributeLabel,
            bottom: topOfTheStack,
            tilePosition: stack.tilePosition,
        })
        stack.labels.push(newTileAttributeLabel)
        return newTileAttributeLabel
    },
    removeAllLabels: (stack: TileAttributeLabelStack) => {
        stack.labels = []
    },
    mouseMoved: ({
        stack,
        mouseLocation,
    }: {
        stack: TileAttributeLabelStack
        mouseLocation: ScreenLocation
    }) => {
        stack.labels.forEach((label) => {
            TileAttributeLabelService.mouseMoved({
                label,
                mouseLocation,
            })
        })
    },
    draw: ({
        stack,
        graphicsBuffer,
        resourceRepository,
    }: {
        stack: TileAttributeLabelStack
        graphicsBuffer: GraphicsBuffer
        resourceRepository: ResourceRepository
    }) => {
        stack.labels.forEach((label) => {
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceRepository,
            })
        })
        stack.labels.forEach((label, index, array) => {
            if (index == 0) {
                TileAttributeLabelService.setLocation({
                    label,
                    tilePosition: stack.tilePosition,
                    bottom: stack.bottom,
                })
                return
            }
            TileAttributeLabelService.setLocation({
                label,
                tilePosition: stack.tilePosition,
                bottom: RectAreaService.top(
                    TileAttributeLabelService.getArea(array[index - 1])
                ),
            })
        })
    },
}
