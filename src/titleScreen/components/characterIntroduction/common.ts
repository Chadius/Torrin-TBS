import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { ImageUI } from "../../../ui/imageUI/imageUI"
import { TitleScreenUIObjects } from "../../titleScreen"
import { TextBox } from "../../../ui/textBox/textBox"

export class TitleScreenIsCharacterIntroductionImageLoaded
    implements BehaviorTreeTask
{
    dataBlob: DataBlob
    uiObjectKey: string

    constructor(dataBlob: DataBlob, uiObjectKey: string) {
        this.dataBlob = dataBlob
        this.uiObjectKey = uiObjectKey
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const characterIntroduction: {
            icon: ImageUI
        } = uiObjects[this.uiObjectKey as keyof typeof uiObjects] as {
            icon: ImageUI
        }
        return characterIntroduction?.icon?.isImageLoaded()
    }

    clone(): TitleScreenIsCharacterIntroductionImageLoaded {
        return new TitleScreenIsCharacterIntroductionImageLoaded(
            this.dataBlob,
            this.uiObjectKey
        )
    }
}

export class TitleScreenIsCharacterIntroductionImageInitialized
    implements BehaviorTreeTask
{
    dataBlob: DataBlob
    uiObjectKey: string

    constructor(dataBlob: DataBlob, uiObjectKey: string) {
        this.dataBlob = dataBlob
        this.uiObjectKey = uiObjectKey
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const characterIntroduction: {
            icon: ImageUI
        } = uiObjects[this.uiObjectKey as keyof typeof uiObjects] as {
            icon: ImageUI
        }
        return characterIntroduction?.icon != undefined
    }

    clone(): TitleScreenIsCharacterIntroductionImageInitialized {
        return new TitleScreenIsCharacterIntroductionImageInitialized(
            this.dataBlob,
            this.uiObjectKey
        )
    }
}

export class TitleScreenAreCharacterIntroductionElementsLoaded
    implements BehaviorTreeTask
{
    dataBlob: DataBlob
    uiObjectKeys: string[]

    constructor(dataBlob: DataBlob, uiObjectKeys: string[]) {
        this.dataBlob = dataBlob
        this.uiObjectKeys = uiObjectKeys
    }

    clone(): TitleScreenAreCharacterIntroductionElementsLoaded {
        return new TitleScreenAreCharacterIntroductionElementsLoaded(
            this.dataBlob,
            this.uiObjectKeys
        )
    }

    run(): boolean {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

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
