import {BattleSaveState, BattleSaveStateHandler} from "../../battle/history/battleSaveState";
import {GameEngine} from "../../gameEngine/gameEngine";
import {GraphicsContext} from "../graphics/graphicsContext";

export const SAVE_VERSION: number = 1;
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
    },
    RetrieveFileContent: (callback: (saveState: BattleSaveState, gameEngine1: GameEngine, graphics: GraphicsContext) => void, gameEngine: GameEngine, graphics: GraphicsContext) => {
        SaveFile.OpenFileDialogToSelectAFile(callback, gameEngine, graphics);
    },
    OpenFileDialogToSelectAFile: (callback: (saveState: BattleSaveState, gameEngine1: GameEngine, graphics: GraphicsContext) => void, gameEngine: GameEngine, graphics: GraphicsContext) => {
        OpenFileDialogToSelectAFile(callback, gameEngine, graphics);
    }
}

function OpenFileDialogToSelectAFile(callback: (saveState: BattleSaveState, gameEngine1: GameEngine, graphics: GraphicsContext) => void, gameEngine: GameEngine, graphics: GraphicsContext) {
    var input = document.createElement('input');
    input.type = 'file';

    input.onchange = e => {
        var file = (e.target as HTMLInputElement).files[0];
        var reader = new FileReader();
        reader.readAsText(file, 'UTF-8');

        reader.onload = readerEvent => {
            var content: string = readerEvent.target.result as string; // this is the content!
            const data: BattleSaveState = BattleSaveStateHandler.parseJsonIntoBattleSaveStateData(content);
            callback(data, gameEngine, graphics);
        }

    }

    input.click();
}
