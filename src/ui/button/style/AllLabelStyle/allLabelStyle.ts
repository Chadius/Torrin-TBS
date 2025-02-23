import { DataBlob, DataBlobService } from "../../../../utils/dataBlob/dataBlob"
import { Label, LabelService } from "../../../label"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { ButtonStatus } from "../../buttonStatus"
import { ButtonStyle } from "../buttonStyle"
import { RectArea } from "../../../rectArea"
import { ButtonLogic } from "../../logic/base"

/***
 This button is a very simple button. It immediately switches between 4 labels based on the button's status. There is no transition time.
 */
export interface AllLabelButtonDataBlob extends DataBlob {
    data: {
        context?: AllLabelButtonContext
        layout: AllLabelButtonLayout
        uiObjects?: AllLabelButtonUIObjects
        graphicsContext?: GraphicsBuffer
    }
}

export interface AllLabelButtonLayout {
    labelByButtonStatus: {
        [status in ButtonStatus]: Label
    }
}

export interface AllLabelButtonUIObjects {
    buttonLabelsByStatus: {
        [status in ButtonStatus]: Label
    }
}

interface AllLabelButtonContext {
    buttonLogic: ButtonLogic
}

export class AllLabelButtonDrawTask implements ButtonStyle {
    dataBlob: AllLabelButtonDataBlob

    constructor({
        dataBlob,
        buttonLogic,
    }: {
        dataBlob: AllLabelButtonDataBlob
        buttonLogic: ButtonLogic
    }) {
        this.dataBlob = dataBlob

        DataBlobService.getOrCreateDefault<AllLabelButtonContext>(
            this.dataBlob,
            "context",
            {
                buttonLogic,
            }
        )
    }

    getArea(): RectArea {
        this.createUIObjects()
        let uiObjects = DataBlobService.get<AllLabelButtonUIObjects>(
            this.dataBlob,
            "uiObjects"
        )
        let context = DataBlobService.get<AllLabelButtonContext>(
            this.dataBlob,
            "context"
        )
        if (uiObjects == undefined || context == undefined) return undefined

        return uiObjects.buttonLabelsByStatus[context.buttonLogic.status]
            .rectangle.area
    }

    run(): boolean {
        this.createUIObjects()
        let uiObjects = DataBlobService.get<AllLabelButtonUIObjects>(
            this.dataBlob,
            "uiObjects"
        )
        let context = DataBlobService.get<AllLabelButtonContext>(
            this.dataBlob,
            "context"
        )
        let graphicsContext = DataBlobService.get<GraphicsBuffer>(
            this.dataBlob,
            "graphicsContext"
        )

        LabelService.draw(
            uiObjects.buttonLabelsByStatus[context.buttonLogic.status],
            graphicsContext
        )
        return true
    }

    clone(): AllLabelButtonDrawTask {
        let context = DataBlobService.get<AllLabelButtonContext>(
            this.dataBlob,
            "context"
        )

        return new AllLabelButtonDrawTask({
            dataBlob: this.dataBlob,
            buttonLogic: context.buttonLogic,
        })
    }

    private createUIObjects() {
        let uiObjects =
            DataBlobService.getOrCreateDefault<AllLabelButtonUIObjects>(
                this.dataBlob,
                "uiObjects",
                {
                    buttonLabelsByStatus: {
                        [ButtonStatus.READY]: undefined,
                        [ButtonStatus.HOVER]: undefined,
                        [ButtonStatus.ACTIVE]: undefined,
                        [ButtonStatus.DISABLED]: undefined,
                    },
                }
            )

        let layout = DataBlobService.get<AllLabelButtonLayout>(
            this.dataBlob,
            "layout"
        )
        ;[
            ButtonStatus.READY,
            ButtonStatus.HOVER,
            ButtonStatus.ACTIVE,
            ButtonStatus.DISABLED,
        ].forEach((status) => {
            if (!uiObjects.buttonLabelsByStatus[status]) {
                uiObjects.buttonLabelsByStatus[status] =
                    layout.labelByButtonStatus[status]
            }
        })

        DataBlobService.add<AllLabelButtonUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
    }
}
