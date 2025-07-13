import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import { TextBox } from "../../../ui/textBox/textBox"
import { SequenceComposite } from "../../../utils/behaviorTree/composite/sequence/sequence"
import {
    DebugModeCreateDebugModeTitle,
    DebugModeMenuShouldCreateTitle,
} from "./debugModeTitle"
import { ExecuteAllComposite } from "../../../utils/behaviorTree/composite/executeAll/executeAll"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { DrawTextBoxesAction } from "../../../ui/textBox/drawTextBoxesAction"
import { isValidValue } from "../../../utils/objectValidityCheck"

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
}

export interface DebugModeMenuContext {
    lastTitleTextUpdate: number
}

export interface DebugModeMenuUIObjects {
    debugModeTitle: TextBox
}

export interface DebugModeMenu {
    data: ComponentDataBlob<
        DebugModeMenuLayout,
        DebugModeMenuContext,
        DebugModeMenuUIObjects
    >
    drawUITask: BehaviorTreeTask
}

export const DebugModeMenuService = {
    new: (): DebugModeMenu => {
        const dataBlob: ComponentDataBlob<
            DebugModeMenuLayout,
            DebugModeMenuContext,
            DebugModeMenuUIObjects
        > = new ComponentDataBlob()
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
        })
        dataBlob.setContext({
            lastTitleTextUpdate: undefined,
        })
        dataBlob.setUIObjects({
            debugModeTitle: undefined,
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
            new DebugModeMenuShouldCreateTitle(data),
            new DebugModeCreateDebugModeTitle(data),
        ]),
        new DrawTextBoxesAction(
            data,
            (
                data: ComponentDataBlob<
                    DebugModeMenuLayout,
                    DebugModeMenuContext,
                    DebugModeMenuUIObjects
                >
            ) => {
                const uiObjects = data.getUIObjects()
                return [uiObjects.debugModeTitle].filter((x) => x)
            },
            (_) => graphicsContext
        ),
    ])
}
