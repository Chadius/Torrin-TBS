import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { ImageUI } from "../../../ui/imageUI/imageUI"
import {
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenUIObjects,
} from "../../titleScreen"
import { TextBox } from "../../../ui/textBox/textBox"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"

export class TitleScreenIsCharacterIntroductionImageLoaded
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >
    uiObjectKey: string

    constructor(
        dataBlob: ComponentDataBlob<
            TitleScreenLayout,
            TitleScreenContext,
            TitleScreenUIObjects
        >,
        uiObjectKey: string
    ) {
        this.dataBlob = dataBlob
        this.uiObjectKey = uiObjectKey
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()
        const characterIntroduction: {
            icon: ImageUI
        } = uiObjects[this.uiObjectKey as keyof typeof uiObjects] as {
            icon: ImageUI
        }
        return characterIntroduction?.icon?.isImageLoaded()
    }
}

export class TitleScreenIsCharacterIntroductionImageInitialized
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >
    uiObjectKey: string

    constructor(
        dataBlob: ComponentDataBlob<
            TitleScreenLayout,
            TitleScreenContext,
            TitleScreenUIObjects
        >,
        uiObjectKey: string
    ) {
        this.dataBlob = dataBlob
        this.uiObjectKey = uiObjectKey
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()

        const characterIntroduction: {
            icon: ImageUI
        } = uiObjects[this.uiObjectKey as keyof typeof uiObjects] as {
            icon: ImageUI
        }
        return characterIntroduction?.icon != undefined
    }
}

export class TitleScreenAreCharacterIntroductionElementsLoaded
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >
    uiObjectKeys: string[]

    constructor(
        dataBlob: ComponentDataBlob<
            TitleScreenLayout,
            TitleScreenContext,
            TitleScreenUIObjects
        >,
        uiObjectKeys: string[]
    ) {
        this.dataBlob = dataBlob
        this.uiObjectKeys = uiObjectKeys
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()
        const allIconsAreLoaded: boolean = this.uiObjectKeys.every(
            (uiObjectKey) => {
                const characterIntroduction: {
                    icon: ImageUI
                } = uiObjects[uiObjectKey as keyof typeof uiObjects] as {
                    icon: ImageUI
                }
                return characterIntroduction?.icon?.isImageLoaded()
            }
        )

        const allTextBoxesAreLoaded: boolean = this.uiObjectKeys.every(
            (uiObjectKey) => {
                const characterIntroduction: {
                    descriptionText: TextBox
                } = uiObjects[uiObjectKey as keyof typeof uiObjects] as {
                    descriptionText: TextBox
                }
                return characterIntroduction?.descriptionText != undefined
            }
        )

        return allIconsAreLoaded && allTextBoxesAreLoaded
    }
}
