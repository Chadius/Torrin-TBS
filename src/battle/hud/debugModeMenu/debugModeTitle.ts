import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import {
    DebugModeMenuContext,
    DebugModeMenuLayout,
    DebugModeMenuUIObjects,
} from "./debugModeMenu"
import { TextBoxService } from "../../../ui/textBox/textBox"
import { RectAreaService } from "../../../ui/rectArea"

export class DebugModeMenuShouldCreateTitle implements BehaviorTreeTask {
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
        const debugModeTitle = uiObjects.debugModeTitle
        if (!debugModeTitle) {
            return true
        }

        const layout: DebugModeMenuLayout = this.dataBlob.getLayout()
        const context: DebugModeMenuContext = this.dataBlob.getContext()
        return (
            context.lastTitleTextUpdate === undefined ||
            Date.now() - context.lastTitleTextUpdate >= layout.titleText.period
        )
    }
}

export class DebugModeCreateDebugModeTitle implements BehaviorTreeTask {
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
        const layout = this.dataBlob.getLayout()
        const context: DebugModeMenuContext = this.dataBlob.getContext()
        context.lastTitleTextUpdate = Date.now()
        this.dataBlob.setContext(context)
        const uiObjects: DebugModeMenuUIObjects = this.dataBlob.getUIObjects()

        const animationFrame =
            Math.floor(Date.now() / layout.titleText.period) % 4

        let layoutAnimationInfo:
            | {
                  top: number
                  right: number
              }
            | {
                  right: number
                  bottom: number
              }
            | {
                  left: number
                  bottom: number
              }
            | {
                  left: number
                  top: number
              }
        switch (animationFrame) {
            case 1:
                layoutAnimationInfo = {
                    right: layout.titleText.right,
                    top: layout.titleText.top,
                }
                break
            case 2:
                layoutAnimationInfo = {
                    right: layout.titleText.right,
                    bottom: layout.titleText.bottom,
                }
                break
            case 3:
                layoutAnimationInfo = {
                    left: layout.titleText.left,
                    bottom: layout.titleText.bottom,
                }
                break
            default:
                layoutAnimationInfo = {
                    left: layout.titleText.left,
                    top: layout.titleText.top,
                }
        }

        uiObjects.debugModeTitle = TextBoxService.new({
            text: "DEBUG MODE",
            ...layout.titleText,
            area: RectAreaService.new({
                ...layoutAnimationInfo,
                width: 300,
                height: 100,
            }),
        })

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}
