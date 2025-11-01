import {
    TileAttributeLabel,
    TileAttributeLabelService,
} from "./tileAttributeLabel"
import { RectAreaService } from "../../../../../ui/rectArea"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../../utils/test/mocks"
import { ResourceRepositoryTestUtilsService } from "../../../../../resource/resourceRepositoryTestUtils"

export const TileAttributeTestUtils = {
    mockGraphicsAndAddSpies: async () => {
        let graphicsBuffer = new MockedP5GraphicsBuffer()
        let graphicsBufferSpies =
            MockedGraphicsBufferService.addSpies(graphicsBuffer)
        let resourceRepository =
            await ResourceRepositoryTestUtilsService.getResourceRepositoryWithAllTestImages(
                { graphics: graphicsBuffer }
            )
        return { graphicsBuffer, graphicsBufferSpies, resourceRepository }
    },
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
