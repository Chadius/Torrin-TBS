import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import { TextBox } from "../../../ui/textBox/textBox"
import { SequenceComposite } from "../../../utils/behaviorTree/composite/sequence/sequence"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { Damage, SquaddieService } from "../../../squaddie/squaddieService"
import {
    DebugModeCreateDebugModeTitle,
    DebugModeMenuShouldCreateTitle,
} from "./debugModeTitle"
import { ExecuteAllComposite } from "../../../utils/behaviorTree/composite/executeAll/executeAll"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { DrawTextBoxesAction } from "../../../ui/textBox/drawTextBoxesAction"
import { isValidValue } from "../../../utils/objectValidityCheck"
import { Button } from "../../../ui/button/button"
import { ButtonStatusChangeEventByButtonId } from "../../../ui/button/logic/base"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import {
    MousePress,
    MouseRelease,
    ScreenLocation,
} from "../../../utils/mouseConfig"
import {
    DebugModeMenuCreateToggleModeMenuButton,
    DebugModeMenuShouldCreateToggleModeMenuButton,
} from "./toggleMenuButton"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { Rectangle, RectangleService } from "../../../ui/rectangle/rectangle"
import { DrawRectanglesAction } from "../../../ui/rectangle/drawRectanglesAction"
import {
    DebugModeMenuCreateToggleBehaviorOverrideNoActionButton,
    DebugModeMenuShouldCreateToggleBehaviorOverrideNoActionButton,
} from "./toggleBehaviorOverrideNoActionButton"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../../ui/constants"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import { Label, LabelService } from "../../../ui/label"
import { RectArea, RectAreaService } from "../../../ui/rectArea"

export interface DebugModeMenuLayout {
    titleText: {
        fontSize: number
        fontColor: [number, number, number]
        top: number
        left: number
        right: number
        bottom: number
        period: number
    }
    toggleMenuButton: {
        drawingArea: {
            top: number
            left: number
            width: number
            height: number
        }
        fontColor: [number, number, number]
        padding: number
        textToggleOn: string
        textToggleOnHover: string
        textToggleOff: string
        textToggleOffHover: string
        fontSize: number
        toggleOffStatusStyle: {
            fillColor: [number, number, number]
            strokeColor: [number, number, number]
            strokeWeight: number
        }
        toggleOnStatusStyle: {
            fillColor: [number, number, number]
            strokeColor: [number, number, number]
            strokeWeight: number
        }
        toggleOffHoverStatusStyle: {
            fillColor: [number, number, number]
            strokeColor: [number, number, number]
            strokeWeight: number
        }
        toggleOnHoverStatusStyle: {
            fillColor: [number, number, number]
            strokeColor: [number, number, number]
            strokeWeight: number
        }
    }
    behaviorOverride: {
        offset: {
            left: number
            top: number
        }
        noAction: {
            textToggleOn: string
            textToggleOnHover: string
            textToggleOff: string
            textToggleOffHover: string
            drawingArea: {
                top: number
                left: number
                width: number
                height: number
            }
            fontSize: number
        }
        button: {
            fontColor: [number, number, number]
            padding: number
            fontSize: number
            toggleOffStatusStyle: {
                fillColor: [number, number, number]
                strokeColor: [number, number, number]
                strokeWeight: number
            }
            toggleOnStatusStyle: {
                fillColor: [number, number, number]
                strokeColor: [number, number, number]
                strokeWeight: number
            }
            toggleOffHoverStatusStyle: {
                fillColor: [number, number, number]
                strokeColor: [number, number, number]
                strokeWeight: number
            }
            toggleOnHoverStatusStyle: {
                fillColor: [number, number, number]
                strokeColor: [number, number, number]
                strokeWeight: number
            }
        }
    }
    menuBackground: {
        area: {
            left: number
            top: number
            height: number
            width: number
        }
        strokeWeight: number
        fillColor: [number, number, number, number]
        strokeColor: [number, number, number]
    }
}

export interface DebugModeMenuContext {
    isMenuOpen: boolean
    lastTitleTextUpdate: number | undefined
    buttonStatusChangeEventDataBlob: ButtonStatusChangeEventByButtonId
    behaviorOverrides: { noAction: boolean }
}

export interface DebugModeMenuUIObjects {
    menuBackground: Rectangle | undefined
    debugModeTitle: TextBox | undefined
    toggleMenuButton: Button | undefined
    behaviorOverrideToggleNoActionButton: Button | undefined
    reduceSquaddiesTo1HPButton: Label | undefined
}

export interface DebugModeFlags {
    behaviorOverrides: {
        noActions: boolean
    }
}

export interface DebugModeMenu {
    data: ComponentDataBlob<
        DebugModeMenuLayout,
        DebugModeMenuContext,
        DebugModeMenuUIObjects
    >
    drawUITask: BehaviorTreeTask | undefined
}

export const DebugModeMenuService = {
    new: (): DebugModeMenu => {
        const dataBlob: ComponentDataBlob<
            DebugModeMenuLayout,
            DebugModeMenuContext,
            DebugModeMenuUIObjects
        > = new ComponentDataBlob()
        const menuBackground: RectArea = RectAreaService.new({
            left: 900,
            top: 250,
            height: 150,
            width: 300,
        })
        dataBlob.setLayout({
            titleText: {
                fontSize: 36,
                fontColor: [330, 60, 86],
                top: 0,
                left: 0,
                right: 1280,
                bottom: 768,
                period: 2000,
            },
            toggleMenuButton: {
                drawingArea: {
                    top: 200,
                    left: 1000,
                    width: 150,
                    height: 40,
                },
                fontColor: [0, 0, 0],
                padding: 5,
                textToggleOn: "Debug Menu Open",
                textToggleOnHover: "close",
                textToggleOff: "Debug Menu",
                textToggleOffHover: "open",
                fontSize: 16,
                toggleOffStatusStyle: {
                    fillColor: [330, 20, 130],
                    strokeColor: [0, 0, 0],
                    strokeWeight: 2,
                },
                toggleOffHoverStatusStyle: {
                    fillColor: [330, 20, 200],
                    strokeColor: [0, 0, 0],
                    strokeWeight: 2,
                },
                toggleOnStatusStyle: {
                    fillColor: [330, 20, 200],
                    strokeColor: [0, 100, 0],
                    strokeWeight: 2,
                },
                toggleOnHoverStatusStyle: {
                    fillColor: [330, 20, 100],
                    strokeColor: [0, 100, 0],
                    strokeWeight: 2,
                },
            },
            behaviorOverride: {
                offset: {
                    left: WINDOW_SPACING.SPACING1,
                    top: WINDOW_SPACING.SPACING1,
                },
                noAction: {
                    textToggleOn: "CPU cannot Act",
                    textToggleOnHover: "enable CPU",
                    textToggleOff: "CPU can Act",
                    textToggleOffHover: "disable CPU",
                    drawingArea: {
                        top: 0,
                        left: 0,
                        width: 150,
                        height: 40,
                    },
                    fontSize: 10,
                },
                button: {
                    fontColor: [0, 0, 0],
                    padding: 5,
                    fontSize: 16,
                    toggleOffStatusStyle: {
                        fillColor: [330, 60, 86],
                        strokeColor: [0, 0, 0],
                        strokeWeight: 2,
                    },
                    toggleOffHoverStatusStyle: {
                        fillColor: [330, 60, 106],
                        strokeColor: [0, 0, 0],
                        strokeWeight: 2,
                    },
                    toggleOnStatusStyle: {
                        fillColor: [330, 60, 126],
                        strokeColor: [0, 100, 0],
                        strokeWeight: 2,
                    },
                    toggleOnHoverStatusStyle: {
                        fillColor: [330, 60, 106],
                        strokeColor: [0, 100, 0],
                        strokeWeight: 2,
                    },
                },
            },
            menuBackground: {
                area: menuBackground,
                strokeWeight: 1,
                fillColor: [0, 0, 0, 128],
                strokeColor: [0, 0, 0],
            },
        })
        dataBlob.setContext({
            lastTitleTextUpdate: undefined,
            buttonStatusChangeEventDataBlob: DataBlobService.new(),
            isMenuOpen: false,
            behaviorOverrides: { noAction: false },
        })
        dataBlob.setUIObjects({
            debugModeTitle: undefined,
            toggleMenuButton: undefined,
            behaviorOverrideToggleNoActionButton: undefined,
            reduceSquaddiesTo1HPButton: LabelService.new({
                text: "all down to 1 HP",
                horizAlign: HORIZONTAL_ALIGN.CENTER,
                vertAlign: VERTICAL_ALIGN.CENTER,
                fontSize: 12,
                fontColor: [0, 0, 0],
                area: RectAreaService.new({
                    baseRectangle: menuBackground,
                    top: 50 + WINDOW_SPACING.SPACING1,
                    left: WINDOW_SPACING.SPACING1,
                    width: 150,
                    height: 40,
                }),
                fillColor: [330, 60, 86],
                strokeColor: [0, 0, 0],
                strokeWeight: 2,
                textBoxMargin: 5,
            }),
            menuBackground: undefined,
        })

        return {
            data: dataBlob,
            drawUITask: undefined,
        }
    },
    draw: ({
        debugModeMenu,
        graphicsContext,
    }: {
        debugModeMenu: DebugModeMenu
        graphicsContext: GraphicsBuffer
    }) => {
        if (!isValidValue(debugModeMenu.drawUITask)) {
            debugModeMenu.drawUITask = createDrawUITask(
                debugModeMenu.data,
                graphicsContext
            )
        }
        debugModeMenu.drawUITask?.run()
        getButtons(debugModeMenu).forEach((button) => {
            DataBlobService.add<GraphicsBuffer>(
                button.buttonStyle.dataBlob,
                "graphicsContext",
                graphicsContext
            )
            button.draw()
        })
        if (
            debugModeMenu.data.getContext().isMenuOpen &&
            debugModeMenu.data.getUIObjects().reduceSquaddiesTo1HPButton !=
                undefined
        )
            LabelService.draw(
                debugModeMenu.data.getUIObjects().reduceSquaddiesTo1HPButton,
                graphicsContext
            )
    },
    mouseMoved: ({
        debugModeMenu,
        mouseLocation,
    }: {
        debugModeMenu: DebugModeMenu
        mouseLocation: ScreenLocation
    }) => {
        getButtons(debugModeMenu).forEach((button) => {
            button.mouseMoved({
                mouseLocation,
            })
        })
    },
    mousePressed: ({
        debugModeMenu,
        mousePress,
    }: {
        debugModeMenu: DebugModeMenu
        mousePress: MousePress
    }) => {
        getButtons(debugModeMenu).forEach((button) => {
            button.mousePressed({
                mousePress,
            })
        })

        const uiObjects: DebugModeMenuUIObjects =
            debugModeMenu.data.getUIObjects()

        const buttonActions = {
            toggleMenuButton: {
                uiObject: uiObjects.toggleMenuButton,
                ifClicked: () => toggleDebugMenu(debugModeMenu),
                wasClicked: false,
            },
            behaviorOverrideToggleNoActionButton: {
                uiObject: uiObjects.behaviorOverrideToggleNoActionButton,
                ifClicked: () => toggleBehaviorOverrideNoAction(debugModeMenu),
                wasClicked: false,
            },
        }

        Object.values(buttonActions)
            .filter((buttonInfo) => buttonInfo.uiObject != undefined)
            .forEach((buttonInfo) => {
                if (buttonInfo.uiObject == undefined) return
                buttonInfo.wasClicked =
                    buttonInfo.uiObject.getStatusChangeEvent()?.mousePress !=
                    undefined
                if (buttonInfo.wasClicked) {
                    buttonInfo.ifClicked()
                }
            })

        return Object.values(buttonActions)
            .map((buttonInfo) => buttonInfo.wasClicked)
            .includes(true)
    },
    mouseReleased: ({
        debugModeMenu,
        mouseRelease,
        repository,
    }: {
        debugModeMenu: DebugModeMenu
        mouseRelease: MouseRelease
        repository: ObjectRepository
    }) => {
        getButtons(debugModeMenu).forEach((button) => {
            button.mouseReleased({
                mouseRelease,
            })
        })

        const uiObjects: DebugModeMenuUIObjects =
            debugModeMenu.data.getUIObjects()

        if (
            uiObjects.reduceSquaddiesTo1HPButton?.rectangle.area != undefined &&
            RectAreaService.isInside(
                uiObjects.reduceSquaddiesTo1HPButton?.rectangle.area,
                mouseRelease.x,
                mouseRelease.y
            )
        ) {
            reduceAllLivingSquaddiesToOneHP(repository)
        }
    },
    getDebugModeFlags: (
        debugModeMenu: DebugModeMenu | undefined
    ): DebugModeFlags => {
        if (debugModeMenu == undefined) {
            return {
                behaviorOverrides: {
                    noActions: false,
                },
            }
        }

        const context = debugModeMenu.data.getContext()
        return {
            behaviorOverrides: {
                noActions: context.behaviorOverrides.noAction,
            },
        }
    },
}

const createDrawUITask = (
    data: ComponentDataBlob<
        DebugModeMenuLayout,
        DebugModeMenuContext,
        DebugModeMenuUIObjects
    >,
    graphicsContext: GraphicsBuffer
) => {
    return new ExecuteAllComposite(data, [
        new SequenceComposite(data, [
            new DebugModeMenuShouldCreateBackgroundPanel(data),
            new DebugModeMenuCreateBackgroundPanel(data),
        ]),
        new SequenceComposite(data, [
            new DebugModeMenuIsOpenTask(data),
            new DrawRectanglesAction(
                data,
                // @ts-ignore ComponentDataBlob is a subclass of DataBlob
                (
                    data: ComponentDataBlob<
                        DebugModeMenuLayout,
                        DebugModeMenuContext,
                        DebugModeMenuUIObjects
                    >
                ) => {
                    const uiObjects = data.getUIObjects()
                    return [uiObjects.menuBackground].filter(
                        (x) => x != undefined
                    )
                },
                (_) => graphicsContext
            ),
        ]),
        new SequenceComposite(data, [
            new DebugModeMenuShouldCreateTitle(data),
            new DebugModeCreateDebugModeTitle(data),
        ]),
        new SequenceComposite(data, [
            new DebugModeMenuShouldCreateToggleModeMenuButton(data),
            new DebugModeMenuCreateToggleModeMenuButton(data),
        ]),
        new SequenceComposite(data, [
            new DebugModeMenuIsOpenTask(data),
            new DebugModeMenuShouldCreateToggleBehaviorOverrideNoActionButton(
                data
            ),
            new DebugModeMenuCreateToggleBehaviorOverrideNoActionButton(data),
        ]),
        new DrawTextBoxesAction(
            data,
            // @ts-ignore ComponentDataBlob is a subclass of DataBlob
            (
                data: ComponentDataBlob<
                    DebugModeMenuLayout,
                    DebugModeMenuContext,
                    DebugModeMenuUIObjects
                >
            ) => {
                const uiObjects = data.getUIObjects()
                return [uiObjects.debugModeTitle].filter((x) => x != undefined)
            },
            (_) => graphicsContext
        ),
    ])
}

const getButtons = (debugModeMenu: DebugModeMenu) => {
    const context = debugModeMenu.data.getContext()
    const uiObjects: DebugModeMenuUIObjects = debugModeMenu.data.getUIObjects()
    return [
        ...[uiObjects.toggleMenuButton],
        ...(context.isMenuOpen
            ? [
                  uiObjects.toggleMenuButton,
                  uiObjects.behaviorOverrideToggleNoActionButton,
              ]
            : []),
    ].filter((x) => x != undefined)
}

const toggleDebugMenu = (debugModeMenu: DebugModeMenu) => {
    const context: DebugModeMenuContext = debugModeMenu.data.getContext()
    context.isMenuOpen = !context.isMenuOpen
    debugModeMenu.data.setContext(context)

    const uiObjects: DebugModeMenuUIObjects = debugModeMenu.data.getUIObjects()
    const toggleMenuButton = uiObjects.toggleMenuButton
    if (context.isMenuOpen) {
        toggleMenuButton?.changeStatus({
            newStatus: ButtonStatus.TOGGLE_ON,
        })
    } else {
        toggleMenuButton?.changeStatus({
            newStatus: ButtonStatus.TOGGLE_OFF,
        })
    }
}

const toggleBehaviorOverrideNoAction = (debugModeMenu: DebugModeMenu) => {
    const context: DebugModeMenuContext = debugModeMenu.data.getContext()
    context.behaviorOverrides.noAction = !context.behaviorOverrides.noAction
    debugModeMenu.data.setContext(context)
}

const reduceAllLivingSquaddiesToOneHP = (
    repository: ObjectRepository | undefined
) => {
    if (!repository) return
    ObjectRepositoryService.getBattleSquaddieIterator(repository).forEach(
        (info) => {
            const { squaddieTemplate, battleSquaddie } =
                ObjectRepositoryService.getSquaddieByBattleId(
                    repository,
                    info.battleSquaddieId
                )

            const isAlive = SquaddieService.isSquaddieAlive({
                squaddieTemplate,
                battleSquaddie,
            })

            if (isAlive) {
                InBattleAttributesService.takeDamage({
                    inBattleAttributes: battleSquaddie.inBattleAttributes,
                    damageToTake:
                        battleSquaddie.inBattleAttributes.armyAttributes
                            .maxHitPoints - 1,
                    damageType: Damage.UNKNOWN,
                })
            }
        }
    )
}

class DebugModeMenuIsOpenTask implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        DebugModeMenuLayout,
        DebugModeMenuContext,
        DebugModeMenuUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            DebugModeMenuLayout,
            DebugModeMenuContext,
            DebugModeMenuUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const context: DebugModeMenuContext = this.dataBlob.getContext()
        return context.isMenuOpen
    }
}

class DebugModeMenuShouldCreateBackgroundPanel implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        DebugModeMenuLayout,
        DebugModeMenuContext,
        DebugModeMenuUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            DebugModeMenuLayout,
            DebugModeMenuContext,
            DebugModeMenuUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const uiObjects: DebugModeMenuUIObjects = this.dataBlob.getUIObjects()
        return !uiObjects.menuBackground
    }
}

class DebugModeMenuCreateBackgroundPanel implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        DebugModeMenuLayout,
        DebugModeMenuContext,
        DebugModeMenuUIObjects
    >

    constructor(
        dataBlob: ComponentDataBlob<
            DebugModeMenuLayout,
            DebugModeMenuContext,
            DebugModeMenuUIObjects
        >
    ) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const layout: DebugModeMenuLayout = this.dataBlob.getLayout()
        const uiObjects: DebugModeMenuUIObjects = this.dataBlob.getUIObjects()
        uiObjects.menuBackground = RectangleService.new({
            ...layout.menuBackground,
        })
        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}
