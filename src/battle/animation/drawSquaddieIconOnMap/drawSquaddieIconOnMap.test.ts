import { beforeEach, describe, expect, it, vi } from "vitest"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import * as mocks from "../../../utils/test/mocks"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { ImageUI, ImageUILoadingBehavior } from "../../../ui/imageUI/imageUI"
import { RectAreaService } from "../../../ui/rectArea"
import {
    DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT,
    DrawSquaddieIconOnMapUtilities,
} from "./drawSquaddieIconOnMap"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../graphicsConstants"
import { PULSE_COLOR_FORMULA, PulseColor } from "../../../hexMap/pulseColor"
import { BattleCamera } from "../../battleCamera"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"

describe("DrawSquaddieIconOnMap", () => {
    let graphicsContext: GraphicsBuffer
    let objectRepository: ObjectRepository
    let resourceHandler: ResourceHandler
    let imageUI: ImageUI

    beforeEach(() => {
        graphicsContext = new MockedP5GraphicsBuffer()
        objectRepository = ObjectRepositoryService.new()
        resourceHandler = mocks.mockResourceHandler(graphicsContext)
        resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)
        resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
        resourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 200, height: 100 })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            objectRepository,
            name: "playerSquaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            battleId: "playerBattleSquaddieId",
            templateId: "playerSquaddieTemplateId",
            actionTemplateIds: [],
        })

        imageUI = new ImageUI({
            imageLoadingBehavior: {
                resourceKey: "resourceKey",
                loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
            },
            area: RectAreaService.new({
                left: 10,
                top: 20,
                width: 0,
                height: 0,
            }),
        })
        imageUI.load(resourceHandler)

        ObjectRepositoryService.addImageUIByBattleSquaddieId({
            repository: objectRepository,
            battleSquaddieId: "playerBattleSquaddieId",
            imageUI: imageUI,
        })
    })

    describe("tintSquaddieMapIconWhenTheyCannotAct", () => {
        it("sets the tint on the image", () => {
            DrawSquaddieIconOnMapUtilities.tintSquaddieMapIconWhenTheyCannotAct(
                {
                    repository: objectRepository,
                    battleSquaddieId: "playerBattleSquaddieId",
                }
            )
            const squaddieAffiliationHue: number =
                HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.PLAYER]

            expect(imageUI.tintColor).toEqual([
                squaddieAffiliationHue,
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.mapIconTintWhenCannotAct
                    .saturation,
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.mapIconTintWhenCannotAct
                    .brightness,
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.mapIconTintWhenCannotAct.alpha,
            ])
        })
    })

    it("drawPulsingCircleAtMapCoordinate", () => {
        const graphicSpies =
            MockedGraphicsBufferService.addSpies(graphicsContext)
        const dateSpy = vi.spyOn(Date, "now").mockReturnValue(500)
        const camera = new BattleCamera(0, 0)
        DrawSquaddieIconOnMapUtilities.drawPulsingCircleAtMapCoordinate({
            graphicsContext,
            camera,
            mapCoordinate: { q: 0, r: 0 },
            circleInfo: DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.actorSquaddie,
        })

        const expectedCircleCenter =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate: { q: 0, r: 0 },
                cameraLocation: camera.getWorldLocation(),
            })

        expect(graphicSpies["circle"].mock.calls[0][0]).toEqual(
            expectedCircleCenter.x
        )
        expect(graphicSpies["circle"].mock.calls[0][1]).toEqual(
            expectedCircleCenter.y
        )
        expect(graphicSpies["fill"]).toBeCalled()

        MockedGraphicsBufferService.resetSpies(graphicSpies)
        dateSpy.mockRestore()
    })
})
