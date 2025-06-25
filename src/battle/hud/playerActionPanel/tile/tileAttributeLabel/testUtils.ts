import { vi } from "vitest"
import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import * as mocks from "../../../../../utils/test/mocks"
import {
    TileAttributeLabel,
    TileAttributeLabelService,
} from "./tileAttributeLabel"
import { RectAreaService } from "../../../../../ui/rectArea"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../../utils/test/mocks"

export const TileAttributeTestUtils = {
    mockGraphicsAndAddSpies: () => {
        let graphicsBuffer = new MockedP5GraphicsBuffer()
        let graphicsBufferSpies =
            MockedGraphicsBufferService.addSpies(graphicsBuffer)
        let resourceHandler = createMockResourceHandler(graphicsBuffer)
        return { graphicsBuffer, graphicsBufferSpies, resourceHandler }
    },
    createMockResourceHandler: (graphicsBuffer: GraphicsBuffer) =>
        createMockResourceHandler(graphicsBuffer),
    moveMouseOnLabel: (label: TileAttributeLabel) => {
        let labelBackgroundArea = TileAttributeLabelService.getArea(label)
        TileAttributeLabelService.mouseMoved({
            label,
            mouseLocation: {
                x: RectAreaService.centerX(labelBackgroundArea),
                y: RectAreaService.centerY(labelBackgroundArea),
            },
        })
    },
    moveMouseAwayFromLabel: (label: TileAttributeLabel) => {
        TileAttributeLabelService.mouseMoved({
            label,
            mouseLocation: {
                x: 9001,
                y: -9001,
            },
        })
    },
}

const createMockResourceHandler = (graphicsBuffer: GraphicsBuffer) => {
    let resourceHandler = mocks.mockResourceHandler(graphicsBuffer)
    resourceHandler.getResource = vi
        .fn()
        .mockReturnValue({ width: 32, height: 32 })
    return resourceHandler
}
