import {
    BattleSaveState,
    BattleSaveStateService,
} from "../../battle/history/battleSaveState"

export const SAVE_FILENAME: string = "torrins-trial-save.json"
export const SAVE_CONTENT_TYPE: string = "application/json"

export const SaveFile = {
    DownloadToBrowser: ({
        content,
        fileName,
        contentType,
    }: {
        content: string
        fileName: string
        contentType: string
    }) => {
        let a = document.createElement("a")
        let file = new Blob([content], { type: contentType })
        a.href = URL.createObjectURL(file)
        a.download = fileName
        a.click()
    },
    RetrieveFileContent: async (): Promise<BattleSaveState> => {
        return await OpenFileDialogToSelectAFile()
    },
}

async function OpenFileDialogToSelectAFile() {
    return new Promise<BattleSaveState>((resolve, reject) => {
        const input = document.createElement("input")
        input.type = "file"

        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files[0]
            const reader = new FileReader()
            reader.onload = (event: any) => {
                const dataString: string = event.target.result
                try {
                    const saveState: BattleSaveState =
                        BattleSaveStateService.parseJsonIntoBattleSaveStateData(
                            dataString
                        )
                    resolve(saveState)
                } catch (e) {
                    console.error(`Failed to load saveState`)
                    console.error(e)
                    reject(new Error(`Failed to load saveState`))
                }
            }
            reader.readAsText(file, "UTF-8")
        }
        input.oncancel = (_) => {
            reject(new Error("user canceled"))
        }
        input.click()
    })
}
