import { DataBlob, DataBlobService } from "./dataBlob"

export class ComponentDataBlob<Layout, Context, UIObjects> implements DataBlob {
    data: {
        data: {
            layout: Layout
            context: Context
            uiObjects: UIObjects
            [key: string]: any
        }
    }

    constructor() {
        this.data = {
            data: {
                uiObjects: undefined,
                layout: undefined,
                context: undefined,
            },
        }
    }

    getLayout(): Layout {
        return DataBlobService.get<Layout>(this.data, "layout")
    }

    setLayout(layout: Layout): void {
        return DataBlobService.add<Layout>(this.data, "layout", layout)
    }

    getUIObjects(): UIObjects {
        return DataBlobService.get<UIObjects>(this.data, "uiObjects")
    }

    setUIObjects(uiObjects: UIObjects): void {
        return DataBlobService.add<UIObjects>(this.data, "uiObjects", uiObjects)
    }

    getContext(): Context {
        return DataBlobService.get<Context>(this.data, "context")
    }

    setContext(context: Context): void {
        return DataBlobService.add<Context>(this.data, "context", context)
    }
}
