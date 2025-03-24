import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { ComponentDataBlob } from "../../utils/dataBlob/componentDataBlob"
import {
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenUIObjects,
} from "../titleScreen"

export class TitleScreenP5InstanceIsReady implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >

    constructor(
        data: ComponentDataBlob<
            TitleScreenLayout,
            TitleScreenContext,
            TitleScreenUIObjects
        >
    ) {
        this.dataBlob = data
    }

    run(): boolean {
        const layout: TitleScreenLayout = this.dataBlob.getLayout()
        return !!layout?.htmlGenerator
    }
}

export class TitleScreenDrawExternalLinkButton implements BehaviorTreeTask {
    dataBlob: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >
    externalLinkKey: string

    constructor(
        data: ComponentDataBlob<
            TitleScreenLayout,
            TitleScreenContext,
            TitleScreenUIObjects
        >,
        externalLinkKey: string
    ) {
        this.dataBlob = data
        this.externalLinkKey = externalLinkKey
    }

    run(): boolean {
        const layout: TitleScreenLayout = this.dataBlob.getLayout()
        if (!layout?.htmlGenerator) return false
        if (!layout.htmlGenerator.createA) return true

        const uiObjects: TitleScreenUIObjects = this.dataBlob.getUIObjects()
        if (uiObjects.externalLinks[this.externalLinkKey]) return true
        uiObjects.externalLinks[this.externalLinkKey] =
            layout.htmlGenerator.createA(
                layout.externalLinks[this.externalLinkKey].href,
                layout.externalLinks[this.externalLinkKey].html,
                layout.externalLinks[this.externalLinkKey].target
            )
        uiObjects.externalLinks[this.externalLinkKey]?.position(
            layout.externalLinks[this.externalLinkKey].screenLocation.x,
            layout.externalLinks[this.externalLinkKey].screenLocation.y
        )
        return true
    }
}
