import { ObjectRepository } from "../../../../objectRepository"
import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../../../../resource/resourceHandler"
import { TextBox } from "../../../../../ui/textBox/textBox"
import { Rectangle } from "../../../../../ui/rectangle/rectangle"
import { ImageUI } from "../../../../../ui/imageUI/imageUI"
import { RectArea, RectAreaService } from "../../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../../ui/constants"
import { BehaviorTreeTask } from "../../../../../utils/behaviorTree/task"
import {
    DataBlob,
    DataBlobService,
} from "../../../../../utils/dataBlob/dataBlob"
import { ShouldUpdateSquaddieSelectorPanelButton } from "./behaviorTreeTask/shouldUpdateSquaddieSelectorPanelButton"
import { UpdateSquaddieSelectorPanelButtonPortrait } from "./behaviorTreeTask/updateSquaddieSelectorPanelButtonPortrait"
import { SequenceComposite } from "../../../../../utils/behaviorTree/composite/sequence/sequence"
import { ExecuteAllComposite } from "../../../../../utils/behaviorTree/composite/executeAll/executeAll"
import { DrawTextBoxesAction } from "../../../../../ui/textBox/drawTextBoxesAction"
import { DrawImagesAction } from "../../../../../ui/imageUI/drawImagesAction"
import { UpdateSquaddieSelectorPanelButtonDrawingArea } from "./behaviorTreeTask/updateSquaddieSelectorPanelButtonDrawingArea"
import { UpdateSquaddieSelectorPanelButtonName } from "./behaviorTreeTask/updateSquaddieSelectorPanelButtonName"
import { DoesObjectHaveKeyExistCondition } from "../../../../../utils/behaviorTree/condition/doesObjectHaveKeyExistCondition"
import { DrawRectanglesAction } from "../../../../../ui/rectangle/drawRectanglesAction"
import { UpdateSquaddieSelectorPanelButtonBackground } from "./behaviorTreeTask/updateSquaddieSelectorPanelButtonBackground"
import { MouseButton, MousePress } from "../../../../../utils/mouseConfig"
import { SquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import { ActionTilePositionService } from "../../tile/actionTilePosition"

interface SelectedStatusLayout {
    borderColor: [number, number, number]
    borderWeight: number
    outerMargin: number
    height: number
}

interface ButtonLayout {
    backgroundColor: [number, number, number]
    font: {
        strokeWeight: number
        color: [number, number, number]
        sizeRange: {
            preferred: number
            minimum: number
        }
    }
    portrait: RectArea
}

export interface SquaddieSelectorPanelButtonLayout {
    selectedSquaddieButton: ButtonLayout
    controllableSquaddieButton: ButtonLayout
    uncontrollableSquaddieButton: ButtonLayout
    notSelectedBorder: SelectedStatusLayout
    selectedBorder: SelectedStatusLayout
}

export interface SquaddieSelectorPanelButtonObjects {
    drawingArea: RectArea
    squaddieName: TextBox | undefined
    background: Rectangle | undefined
    mapIcon: ImageUI | undefined
    graphicsContext?: GraphicsBuffer
    resourceHandler?: ResourceHandler
}

export interface SquaddieSelectorPanelButtonContext {
    battleSquaddieId: string
    squaddieIndex: number
}

export interface SquaddieSelectorPanelButtonStatus {
    current: {
        squaddieIsControllable: boolean | undefined
        squaddieIsSelected: boolean | undefined
    }
    previous: {
        squaddieIsControllable: boolean | undefined
        squaddieIsSelected: boolean | undefined
    }
}

export interface SquaddieSelectorPanelButton extends DataBlob {
    updateBehavior?: BehaviorTreeTask
    drawingBehavior?: BehaviorTreeTask
    data: {
        context?: SquaddieSelectorPanelButtonContext
        layout?: SquaddieSelectorPanelButtonLayout
        uiObjects?: SquaddieSelectorPanelButtonObjects
        status?: SquaddieSelectorPanelButtonStatus
    }
}

export const SquaddieSelectorPanelButtonService = {
    new: ({
        battleSquaddieId,
        squaddieIndex,
        squaddieIsControllable,
        squaddieIsSelected,
    }: {
        battleSquaddieId: string
        squaddieIndex: number
        squaddieIsControllable?: boolean
        squaddieIsSelected?: boolean
    }): SquaddieSelectorPanelButton => {
        const data: DataBlob = DataBlobService.new()
        DataBlobService.add<SquaddieSelectorPanelButtonLayout>(
            data,
            "layout",
            createLayout()
        )

        DataBlobService.add<SquaddieSelectorPanelButtonContext>(
            data,
            "context",
            {
                battleSquaddieId,
                squaddieIndex,
            }
        )

        DataBlobService.add<SquaddieSelectorPanelButtonStatus>(data, "status", {
            current: {
                squaddieIsControllable,
                squaddieIsSelected,
            },
            previous: {
                squaddieIsControllable: undefined,
                squaddieIsSelected: undefined,
            },
        })

        return <SquaddieSelectorPanelButton>{
            data: data.data,
        }
    },
    draw: ({
        button,
        graphicsContext,
        resourceHandler,
        objectRepository,
    }: {
        button: SquaddieSelectorPanelButton
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
        objectRepository: ObjectRepository
    }) => {
        if (!button.updateBehavior) {
            button.updateBehavior = createUpdateBehaviorTree({
                data: button,
                objectRepository,
                graphicsContext,
            })
        }
        if (!button.drawingBehavior) {
            button.drawingBehavior = createDrawingBehaviorTree({
                data: button,
                graphicsContext,
                resourceHandler,
            })
        }

        button.updateBehavior.run()
        button.drawingBehavior.run()
    },
    isSelected: (button: SquaddieSelectorPanelButton): boolean => {
        const status = DataBlobService.get<SquaddieSelectorPanelButtonStatus>(
            button,
            "status"
        )
        return status.current?.squaddieIsSelected == true
    },
    isControllable: (button: SquaddieSelectorPanelButton): boolean => {
        const status = DataBlobService.get<SquaddieSelectorPanelButtonStatus>(
            button,
            "status"
        )
        return status.current?.squaddieIsControllable == true
    },
    updateStatus: ({
        button,
        squaddieIsSelected,
        squaddieIsControllable,
    }: {
        button: SquaddieSelectorPanelButton
        squaddieIsControllable?: boolean
        squaddieIsSelected?: boolean
    }) => {
        const status = DataBlobService.get<SquaddieSelectorPanelButtonStatus>(
            button,
            "status"
        )

        status.current.squaddieIsSelected =
            squaddieIsSelected ?? status.current.squaddieIsSelected
        status.current.squaddieIsControllable =
            squaddieIsControllable ?? status.current.squaddieIsControllable

        DataBlobService.add<SquaddieSelectorPanelButtonStatus>(
            button,
            "status",
            status
        )
    },
    getStatus: (button: SquaddieSelectorPanelButton) => {
        const status = DataBlobService.get<SquaddieSelectorPanelButtonStatus>(
            button,
            "status"
        )

        return {
            squaddieIsSelected: status?.current?.squaddieIsSelected,
            squaddieIsControllable: status?.current?.squaddieIsControllable,
        }
    },
    getBattleSquaddieId: (button: SquaddieSelectorPanelButton): string => {
        const context = DataBlobService.get<SquaddieSelectorPanelButtonContext>(
            button,
            "context"
        )
        return context?.battleSquaddieId
    },
    getDrawingArea: (button: SquaddieSelectorPanelButton) =>
        button.data.uiObjects?.drawingArea,
    isMouseSelecting: ({
        button,
        mouseClick,
    }: {
        button: SquaddieSelectorPanelButton
        mouseClick: MousePress
    }): boolean => {
        if (mouseClick.button != MouseButton.ACCEPT) return false
        let uiObjects: SquaddieSelectorPanelButtonObjects =
            DataBlobService.get<SquaddieSelectorPanelButtonObjects>(
                button,
                "uiObjects"
            )
        if (uiObjects?.drawingArea == undefined) return false
        if (button.data.uiObjects?.drawingArea == undefined) return false

        return RectAreaService.isInside(
            button.data.uiObjects.drawingArea,
            mouseClick.x,
            mouseClick.y
        )
    },
}

const createLayout = (): SquaddieSelectorPanelButtonLayout => {
    const notSelectedBorder: SelectedStatusLayout = {
        borderColor: [0, 0, 0],
        borderWeight: 1,
        height: 32,
        outerMargin: WINDOW_SPACING.SPACING1,
    }

    const backgroundColor =
        ActionTilePositionService.getBackgroundColorByAffiliation(
            SquaddieAffiliation.PLAYER
        )

    const fontColor: [number, number, number] = [backgroundColor[0], 7, 80]

    const selectedBorder: SelectedStatusLayout = {
        borderColor: [backgroundColor[0], 80, 30],
        borderWeight: 4,
        height: 40,
        outerMargin: 0,
    }

    const selectedSquaddieButton: ButtonLayout = {
        backgroundColor: [
            backgroundColor[0],
            backgroundColor[1],
            backgroundColor[2] + 30,
        ],
        font: {
            strokeWeight: 2,
            color: [fontColor[0], 80, 20],
            sizeRange: {
                preferred: 14,
                minimum: 6,
            },
        },
        portrait: RectAreaService.new({
            left: 0,
            top: 0,
            width: 32,
            height: 32,
        }),
    }

    const controllableSquaddieButton: ButtonLayout = {
        backgroundColor: [
            backgroundColor[0],
            backgroundColor[1],
            backgroundColor[2] + 20,
        ],
        font: {
            strokeWeight: 2,
            color: [fontColor[0], fontColor[1], fontColor[2]],
            sizeRange: {
                preferred: 12,
                minimum: 6,
            },
        },
        portrait: selectedSquaddieButton.portrait,
    }

    const uncontrollableSquaddieButton: ButtonLayout = {
        backgroundColor: [
            backgroundColor[0],
            backgroundColor[1],
            backgroundColor[2] - 10,
        ],
        font: {
            strokeWeight: 2,
            color: fontColor,
            sizeRange: {
                preferred: 12,
                minimum: 6,
            },
        },
        portrait: selectedSquaddieButton.portrait,
    }

    return {
        selectedSquaddieButton,
        controllableSquaddieButton,
        uncontrollableSquaddieButton,
        notSelectedBorder,
        selectedBorder,
    }
}

const createDrawingBehaviorTree = ({
    data,
    graphicsContext,
    resourceHandler,
}: {
    data: SquaddieSelectorPanelButton
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}): BehaviorTreeTask => {
    const drawBackgroundAction = new DrawRectanglesAction(
        data,
        (data: DataBlob): Rectangle[] => {
            const uiObjects =
                DataBlobService.get<SquaddieSelectorPanelButtonObjects>(
                    data,
                    "uiObjects"
                )
            return [uiObjects.background].filter((x) => x != undefined)
        },
        (_: DataBlob): GraphicsBuffer => {
            return graphicsContext
        }
    )

    const drawTextBoxTreeAction = new DrawTextBoxesAction(
        data,
        (dataBlob: DataBlob) => {
            const uiObjects =
                DataBlobService.get<SquaddieSelectorPanelButtonObjects>(
                    dataBlob,
                    "uiObjects"
                )
            return [uiObjects.squaddieName].filter((x) => x != undefined)
        },
        (_) => {
            return graphicsContext
        }
    )

    const drawImagesAction = new DrawImagesAction(
        data,
        (dataBlob: DataBlob) => {
            const uiObjects =
                DataBlobService.get<SquaddieSelectorPanelButtonObjects>(
                    dataBlob,
                    "uiObjects"
                )

            return [uiObjects.mapIcon].filter((x) => x != undefined)
        },
        (_: DataBlob) => {
            return graphicsContext
        },
        (_: DataBlob) => {
            return resourceHandler
        }
    )

    return new ExecuteAllComposite(data, [
        drawBackgroundAction,
        drawTextBoxTreeAction,
        drawImagesAction,
    ])
}

const createUpdateBehaviorTree = ({
    data,
    objectRepository,
    graphicsContext,
}: {
    data: SquaddieSelectorPanelButton
    objectRepository: ObjectRepository
    graphicsContext: GraphicsBuffer
}): BehaviorTreeTask => {
    return new SequenceComposite(data, [
        new ShouldUpdateSquaddieSelectorPanelButton(data),
        new ExecuteAllComposite(data, [
            new UpdateSquaddieSelectorPanelButtonDrawingArea(data),
            new UpdateSquaddieSelectorPanelButtonBackground(data),
            new UpdateSquaddieSelectorPanelButtonPortrait(
                data,
                objectRepository
            ),
            new SequenceComposite(data, [
                new DoesObjectHaveKeyExistCondition({
                    data,
                    dataObjectName: "uiObjects",
                    objectKey: "mapIcon",
                }),
                new UpdateSquaddieSelectorPanelButtonName(
                    data,
                    objectRepository,
                    graphicsContext
                ),
            ]),
        ]),
    ])
}
