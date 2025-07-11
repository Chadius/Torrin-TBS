import { Label, LabelService } from "../../../ui/label"
import { RectAreaService } from "../../../ui/rectArea"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { BattleCamera } from "../../battleCamera"
import { isValidValue } from "../../../utils/objectValidityCheck"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { CoordinateSystem } from "../../../hexMap/hexCoordinate/hexCoordinate"
import {
    DIALOGUE_FONT_STYLE_CONSTANTS,
    WARNING_POPUP_TEXT_CONSTANTS,
} from "../../../cutscene/dialogue/constants"
import { HEX_TILE_WIDTH } from "../../../graphicsConstants"
import { TextHandlingService } from "../../../utils/graphics/textHandlingService"
import { ScreenLocation } from "../../../utils/mouseConfig"

export interface PopupWindow {
    status: PopupWindowStatus
    label: Label
    worldLocation: {
        x: number
        y: number
    }
    camera?: BattleCamera
    setStatusInactiveTimestamp?: number
    coordinateSystem: CoordinateSystem
}

export enum PopupWindowStatus {
    INACTIVE = "INACTIVE",
    ACTIVE = "ACTIVE",
}

export const PopupWindowService = {
    new: ({
        status,
        label,
        camera,
        coordinateSystem,
    }: {
        status?: PopupWindowStatus
        label?: Label
        camera?: BattleCamera
        coordinateSystem?: CoordinateSystem
    }): PopupWindow =>
        newPopupWindow({ status, label, camera, coordinateSystem }),
    newWarningWindow: ({
        text,
        camera,
        screenLocation,
        coordinateSystem,
    }: {
        text: string
        camera: BattleCamera
        screenLocation: ScreenLocation
        coordinateSystem: CoordinateSystem
    }): PopupWindow => {
        const worldCoordinates =
            ConvertCoordinateService.convertScreenLocationToWorldLocation({
                screenLocation,
                cameraLocation: camera.getWorldLocation(),
            })
        const coordinates =
            coordinateSystem === CoordinateSystem.SCREEN
                ? screenLocation
                : { x: worldCoordinates.x, y: worldCoordinates.y }

        const popupWidth = TextHandlingService.approximateLengthOfLineOfText({
            text,
            strokeWeight:
                DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.strokeWeight,
            fontSize:
                DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.fontSizeRange
                    .preferred,
        })

        return PopupWindowService.new({
            coordinateSystem,
            label: LabelService.new({
                fontSize:
                    DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.fontSizeRange
                        .preferred,
                fontColor:
                    DIALOGUE_FONT_STYLE_CONSTANTS.WARNING_POPUP.fontColor,
                textBoxMargin: WARNING_POPUP_TEXT_CONSTANTS.label.textBoxMargin,
                fillColor: WARNING_POPUP_TEXT_CONSTANTS.label.fillColor,
                text,
                area: RectAreaService.new({
                    centerX: coordinates.x,
                    top: coordinates.y + HEX_TILE_WIDTH / 2,
                    width: popupWidth,
                    height: WARNING_POPUP_TEXT_CONSTANTS.minHeight,
                }),
            }),
        })
    },
    changeStatus: (popup: PopupWindow, status: PopupWindowStatus) => {
        popup.status = status
    },
    setCamera: (popup: PopupWindow, camera: BattleCamera) => {
        popup.camera = camera
    },
    draw: (popup: PopupWindow, graphicsContext: GraphicsBuffer) => {
        if (
            isValidValue(popup.setStatusInactiveTimestamp) &&
            Date.now() >= popup.setStatusInactiveTimestamp
        ) {
            popup.status = PopupWindowStatus.INACTIVE
        }

        if (popup.status !== PopupWindowStatus.ACTIVE) {
            return
        }

        if (
            popup.coordinateSystem === CoordinateSystem.WORLD &&
            isValidValue(popup.camera)
        ) {
            movePopupOnScreen(popup, popup.camera)
        }
        LabelService.draw(popup.label, graphicsContext)
    },
    setInactiveAfterTimeElapsed: (
        popup: PopupWindow,
        millisecondDelay: number
    ) => {
        popup.setStatusInactiveTimestamp = Date.now() + millisecondDelay
    },
    setCoordinateSystem: (
        popup: PopupWindow,
        coordinateSystem: CoordinateSystem
    ) => {
        popup.coordinateSystem = coordinateSystem
    },
}

const conformXCoordinateToScreen = (left: number, popup: PopupWindow) => {
    const width = RectAreaService.width(popup.label.rectangle.area)
    if (left < 0) {
        left = 0
    } else if (left + width >= ScreenDimensions.SCREEN_WIDTH) {
        left = ScreenDimensions.SCREEN_WIDTH - width
    }
    return left
}

const conformYCoordinateToScreen = (top: number, popup: PopupWindow) => {
    const height = RectAreaService.height(popup.label.rectangle.area)
    if (top < 0) {
        top = 0
    } else if (top + height >= ScreenDimensions.SCREEN_HEIGHT) {
        top = ScreenDimensions.SCREEN_HEIGHT - height
    }
    return top
}

const movePopupOnScreen = (popup: PopupWindow, camera: BattleCamera) => {
    const screenCoordinates =
        ConvertCoordinateService.convertWorldLocationToScreenLocation({
            worldLocation: {
                x: popup.worldLocation.x,
                y: popup.worldLocation.y,
            },
            cameraLocation: camera.getWorldLocation(),
        })

    const xCoordinate = conformXCoordinateToScreen(screenCoordinates.x, popup)
    const yCoordinate = conformYCoordinateToScreen(screenCoordinates.y, popup)

    const textBoxXOffset =
        RectAreaService.left(popup.label.textBox.area) -
        RectAreaService.left(popup.label.rectangle.area)
    const textBoxYOffset =
        RectAreaService.top(popup.label.textBox.area) -
        RectAreaService.top(popup.label.rectangle.area)

    RectAreaService.move(popup.label.rectangle.area, {
        left: xCoordinate,
        top: yCoordinate,
    })
    RectAreaService.move(popup.label.textBox.area, {
        left: xCoordinate + textBoxXOffset,
        top: yCoordinate + textBoxYOffset,
    })
}

const newPopupWindow = ({
    status,
    label,
    camera,
    coordinateSystem,
}: {
    status?: PopupWindowStatus
    label?: Label
    camera?: BattleCamera
    coordinateSystem?: CoordinateSystem
}): PopupWindow => {
    const labelToAdd =
        label ??
        LabelService.new({
            area: RectAreaService.new({
                left: 0,
                right: 100,
                top: 0,
                bottom: 100,
            }),
            fontColor: [0, 0, 100],
            fontSize: 10,
            text: "",
            textBoxMargin: 0,
        })

    const fallbackCoordinateSystem: CoordinateSystem = isValidValue(camera)
        ? CoordinateSystem.WORLD
        : CoordinateSystem.SCREEN

    return {
        status: status ?? PopupWindowStatus.INACTIVE,
        label: labelToAdd,
        worldLocation: {
            x: RectAreaService.left(labelToAdd.rectangle.area),
            y: RectAreaService.top(labelToAdd.rectangle.area),
        },
        camera,
        coordinateSystem:
            coordinateSystem !== CoordinateSystem.UNKNOWN
                ? coordinateSystem
                : fallbackCoordinateSystem,
    }
}
