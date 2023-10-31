export const SAVE_VERSION: number = 0;
export const SAVE_FILENAME: string = "torrins-trial-save.json";
export const SAVE_CONTENT_TYPE: string = "application/json";

export const SaveFile = {
    DownloadToBrowser: (
        {content, fileName, contentType}:
            { content: string, fileName: string, contentType: string }) => {
        var a = document.createElement("a");
        var file = new Blob([content], {type: contentType});
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }
}
