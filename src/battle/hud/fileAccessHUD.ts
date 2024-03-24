import {Button, ButtonStatus} from "../../ui/button";
import {MouseButton} from "../../utils/mouseConfig";
import {BattleHUDState} from "./battleHUDState";
import {RectArea, RectAreaService} from "../../ui/rectArea";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {Label, LabelService} from "../../ui/label";
import {WINDOW_SPACING1} from "../../ui/constants";
import {isValidValue} from "../../utils/validityCheck";
import {SaveSaveStateService} from "../../dataLoader/saveSaveState";
import {LoadSaveStateService} from "../../dataLoader/loadSaveState";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {OrchestratorUtilities} from "../orchestratorComponents/orchestratorUtils";

export enum FileAccessHUDMessage {
    SAVE_SUCCESS = "Saved!",
    SAVE_FAILED = "Save Failed",
    SAVE_IN_PROGRESS = "Saving...",
    LOAD_SUCCESS = "Loaded!",
    LOAD_FAILED = "Load Failed",
    LOAD_IN_PROGRESS = "Loading...",
}

export const FileAccessHUDDesign = {
    MESSAGE_DISPLAY_DURATION: 2000,
    LOAD_BUTTON: {
        AREA: {
            startColumn: 10,
            endColumn: 12,
            top: 10,
            bottom: 100,
        },
        READY_RECTANGLE: {
            fillColor: [10, 2, 192],
            strokeColor: [16, 16, 16],
            strokeWeight: 2,
        },
        ACTIVE_RECTANGLE: {
            fillColor: [10, 2, 192],
            strokeColor: [16, 16, 16],
            strokeWeight: 4,
        },
        HOVER_RECTANGLE: {
            fillColor: [10, 2, 224],
            strokeColor: [16, 16, 16],
            strokeWeight: 2,
        },
        DISABLED_RECTANGLE: {
            fillColor: [128, 128, 64],
            strokeColor: [16, 16, 16],
            strokeWeight: 2,
        },
        FONT_COLOR: [20, 5, 16],
        PADDING: WINDOW_SPACING1,
        TEXT: "Load",
        TEXT_SIZE: 10
    },
    SAVE_BUTTON: {
        AREA: {
            startColumn: 8,
            endColumn: 10,
            top: 10,
            bottom: 100,
        },
        READY_RECTANGLE: {
            fillColor: [10, 2, 192],
            strokeColor: [16, 16, 16],
            strokeWeight: 2,
        },
        ACTIVE_RECTANGLE: {
            fillColor: [10, 2, 192],
            strokeColor: [16, 16, 16],
            strokeWeight: 4,
        },
        HOVER_RECTANGLE: {
            fillColor: [10, 2, 224],
            strokeColor: [16, 16, 16],
            strokeWeight: 2,
        },
        DISABLED_RECTANGLE: {
            fillColor: [128, 128, 64],
            strokeColor: [16, 16, 16],
            strokeWeight: 2,
        },
        FONT_COLOR: [20, 5, 16],
        PADDING: WINDOW_SPACING1,
        TEXT: "Save",
        TEXT_SIZE: 10
    },
    MESSAGE_LABEL: {
        AREA: {
            startColumn: 6,
            endColumn: 8,
            top: 10,
            bottom: 100,
        },
        RECTANGLE: {
            noFill: true,
            noStroke: true,
        },
        FONT_COLOR: [0, 0, 0],
        PADDING: WINDOW_SPACING1,
        TEXT_SIZE: 10
    },
}

export interface FileAccessHUD {
    saveButton: Button;
    saveButtonCachedStatus: ButtonStatus;
    loadButton: Button;
    loadButtonCachedStatus: ButtonStatus;
    messageLabel: Label;
    messageDisplayStartTime: number;
    message: string;
}

export const FileAccessHUDService = {
    new: ({}: {}): FileAccessHUD => {
        const fileAccessHUD: FileAccessHUD = {
            loadButton: undefined,
            loadButtonCachedStatus: undefined,
            saveButton: undefined,
            saveButtonCachedStatus: undefined,
            messageLabel: undefined,
            messageDisplayStartTime: undefined,
            message: undefined,
        };
        createUIObjects(fileAccessHUD);
        return fileAccessHUD;
    },
    mouseMoved: (
        {
            fileAccessHUD,
            mouseX,
            mouseY,
        }
            : {
            fileAccessHUD: FileAccessHUD,
            mouseX: number,
            mouseY: number,
        }
    ) => {
        fileAccessHUD.loadButton.mouseMoved(mouseX, mouseY, undefined);
        fileAccessHUD.saveButton.mouseMoved(mouseX, mouseY, undefined);
    },
    mouseClicked: (
        {
            fileAccessHUD,
            mouseButton,
            mouseX,
            mouseY,
            battleHUDState,
        }
            : {
            fileAccessHUD: FileAccessHUD,
            mouseButton: MouseButton,
            mouseX: number,
            mouseY: number,
            battleHUDState: BattleHUDState
        }
    ) => {
        fileAccessHUD.loadButton.mouseClicked(mouseX, mouseY, {fileAccessHUD, battleHUDState});
        fileAccessHUD.saveButton.mouseClicked(mouseX, mouseY, {fileAccessHUD, battleHUDState});
    },
    updateBasedOnGameEngineState: (fileAccessHUD: FileAccessHUD, gameEngineState: GameEngineState) => {
        if (
            !gameEngineState.battleOrchestratorState.battleState.battlePhaseState
            || gameEngineState.battleOrchestratorState.battleState.battlePhaseState.currentAffiliation !== BattlePhase.PLAYER
        ) {
            return disableButtonsAndCacheStatus(fileAccessHUD);
        }

        if (OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)) {
            return disableButtonsAndCacheStatus(fileAccessHUD);
        }

        return changeButtonStatusBasedOnMessage(fileAccessHUD);
    },
    updateButtonStatus: (fileAccessHUD: FileAccessHUD, battleHUDState: BattleHUDState) => {
        changeButtonStatusBasedOnMessage(fileAccessHUD);
    },
    updateStatusMessage: (fileAccessHUD: FileAccessHUD, battleHUDState: BattleHUDState): string => {
        return updateStatusMessage(fileAccessHUD, battleHUDState);
    }
}

const updateStatusMessage = (fileAccessHUD: FileAccessHUD, battleHUDState: BattleHUDState): string => {
    switch (didCurrentMessageExpire(fileAccessHUD)) {
        case true:
            if (SaveSaveStateService.didUserRequestSaveAndSaveHasConcluded(battleHUDState.saveSaveState)) {
                SaveSaveStateService.userFinishesRequestingSave(battleHUDState.saveSaveState);
            }
            clearMessage(battleHUDState, fileAccessHUD);
            break;
        default:
            const messageToShow = calculateMessageToShow(battleHUDState, fileAccessHUD);
            updateMessageLabel(fileAccessHUD, messageToShow);
            break;
    }
    return fileAccessHUD.message;
}

const battleIsCurrentlySavingOrLoading = (caller: { fileAccessHUD: FileAccessHUD; battleHUDState: BattleHUDState }) =>
    caller.battleHUDState.saveSaveState.savingInProgress
    || caller.battleHUDState.loadSaveState.userRequestedLoad
    || caller.battleHUDState.loadSaveState.applicationStartedLoad;

const clickedOnLoadButton = (
    mouseX: number,
    mouseY: number,
    button: Button,
    caller: {
        fileAccessHUD: FileAccessHUD,
        battleHUDState: BattleHUDState
    }
): {} => {
    if (battleIsCurrentlySavingOrLoading(caller)) {
        return;
    }
    LoadSaveStateService.userRequestsLoad(caller.battleHUDState.loadSaveState);
    disableButtonsAndClearCache(caller.fileAccessHUD);
    return undefined;
}

const clickedOnSaveButton = (
    mouseX: number,
    mouseY: number,
    button: Button,
    caller: {
        fileAccessHUD: FileAccessHUD,
        battleHUDState: BattleHUDState
    }
): {} => {
    if (battleIsCurrentlySavingOrLoading(caller)) {
        return;
    }
    SaveSaveStateService.userRequestsSave(caller.battleHUDState.saveSaveState);
    disableButtonsAndClearCache(caller.fileAccessHUD);
    return undefined;
}

const createUIObjects = (fileAccessHUD: FileAccessHUD) => {
    const loadButtonArea: RectArea = RectAreaService.new({
        screenWidth: ScreenDimensions.SCREEN_WIDTH,
        ...FileAccessHUDDesign.LOAD_BUTTON.AREA,
    });
    fileAccessHUD.loadButton = new Button({
        onMoveHandler(mouseX: number, mouseY: number, button: Button, caller: any): {} {
            return {};
        },
        readyLabel: LabelService.new({
            area: loadButtonArea,
            fontColor: FileAccessHUDDesign.LOAD_BUTTON.FONT_COLOR,
            padding: FileAccessHUDDesign.LOAD_BUTTON.PADDING,
            text: FileAccessHUDDesign.LOAD_BUTTON.TEXT,
            textSize: FileAccessHUDDesign.LOAD_BUTTON.TEXT_SIZE,
            fillColor: FileAccessHUDDesign.LOAD_BUTTON.READY_RECTANGLE.fillColor,
            strokeColor: FileAccessHUDDesign.LOAD_BUTTON.READY_RECTANGLE.strokeColor,
            strokeWeight: FileAccessHUDDesign.LOAD_BUTTON.READY_RECTANGLE.strokeWeight,
        }),
        activeLabel: LabelService.new({
            area: loadButtonArea,
            fontColor: FileAccessHUDDesign.LOAD_BUTTON.FONT_COLOR,
            padding: FileAccessHUDDesign.LOAD_BUTTON.PADDING,
            text: FileAccessHUDDesign.LOAD_BUTTON.TEXT,
            textSize: FileAccessHUDDesign.LOAD_BUTTON.TEXT_SIZE,
            fillColor: FileAccessHUDDesign.LOAD_BUTTON.ACTIVE_RECTANGLE.fillColor,
            strokeColor: FileAccessHUDDesign.LOAD_BUTTON.ACTIVE_RECTANGLE.strokeColor,
            strokeWeight: FileAccessHUDDesign.LOAD_BUTTON.ACTIVE_RECTANGLE.strokeWeight,
        }),
        disabledLabel: LabelService.new({
            area: loadButtonArea,
            fontColor: FileAccessHUDDesign.LOAD_BUTTON.FONT_COLOR,
            padding: FileAccessHUDDesign.LOAD_BUTTON.PADDING,
            text: FileAccessHUDDesign.LOAD_BUTTON.TEXT,
            textSize: FileAccessHUDDesign.LOAD_BUTTON.TEXT_SIZE,
            fillColor: FileAccessHUDDesign.LOAD_BUTTON.DISABLED_RECTANGLE.fillColor,
            strokeColor: FileAccessHUDDesign.LOAD_BUTTON.DISABLED_RECTANGLE.strokeColor,
            strokeWeight: FileAccessHUDDesign.LOAD_BUTTON.DISABLED_RECTANGLE.strokeWeight,
        }),
        hoverLabel: LabelService.new({
            area: loadButtonArea,
            fontColor: FileAccessHUDDesign.LOAD_BUTTON.FONT_COLOR,
            padding: FileAccessHUDDesign.LOAD_BUTTON.PADDING,
            text: FileAccessHUDDesign.LOAD_BUTTON.TEXT,
            textSize: FileAccessHUDDesign.LOAD_BUTTON.TEXT_SIZE,
            fillColor: FileAccessHUDDesign.LOAD_BUTTON.HOVER_RECTANGLE.fillColor,
            strokeColor: FileAccessHUDDesign.LOAD_BUTTON.HOVER_RECTANGLE.strokeColor,
            strokeWeight: FileAccessHUDDesign.LOAD_BUTTON.HOVER_RECTANGLE.strokeWeight,
        }),
        onClickHandler(mouseX: number, mouseY: number, button: Button, caller: {
            fileAccessHUD: FileAccessHUD,
            battleHUDState: BattleHUDState
        }): {} {
            return clickedOnLoadButton(mouseX, mouseY, button, caller);
        },
    });

    const saveButtonArea: RectArea = RectAreaService.new({
        screenWidth: ScreenDimensions.SCREEN_WIDTH,
        ...FileAccessHUDDesign.SAVE_BUTTON.AREA,
    });
    fileAccessHUD.saveButton = new Button({
        readyLabel: LabelService.new({
            area: saveButtonArea,
            fontColor: FileAccessHUDDesign.SAVE_BUTTON.FONT_COLOR,
            padding: FileAccessHUDDesign.SAVE_BUTTON.PADDING,
            text: FileAccessHUDDesign.SAVE_BUTTON.TEXT,
            textSize: FileAccessHUDDesign.SAVE_BUTTON.TEXT_SIZE,
            fillColor: FileAccessHUDDesign.SAVE_BUTTON.READY_RECTANGLE.fillColor,
            strokeColor: FileAccessHUDDesign.SAVE_BUTTON.READY_RECTANGLE.strokeColor,
            strokeWeight: FileAccessHUDDesign.SAVE_BUTTON.READY_RECTANGLE.strokeWeight,
        }),
        activeLabel: LabelService.new({
            area: saveButtonArea,
            fontColor: FileAccessHUDDesign.SAVE_BUTTON.FONT_COLOR,
            padding: FileAccessHUDDesign.SAVE_BUTTON.PADDING,
            text: FileAccessHUDDesign.SAVE_BUTTON.TEXT,
            textSize: FileAccessHUDDesign.SAVE_BUTTON.TEXT_SIZE,
            fillColor: FileAccessHUDDesign.SAVE_BUTTON.ACTIVE_RECTANGLE.fillColor,
            strokeColor: FileAccessHUDDesign.SAVE_BUTTON.ACTIVE_RECTANGLE.strokeColor,
            strokeWeight: FileAccessHUDDesign.SAVE_BUTTON.ACTIVE_RECTANGLE.strokeWeight,
        }),
        disabledLabel: LabelService.new({
            area: saveButtonArea,
            fontColor: FileAccessHUDDesign.SAVE_BUTTON.FONT_COLOR,
            padding: FileAccessHUDDesign.SAVE_BUTTON.PADDING,
            text: FileAccessHUDDesign.SAVE_BUTTON.TEXT,
            textSize: FileAccessHUDDesign.SAVE_BUTTON.TEXT_SIZE,
            fillColor: FileAccessHUDDesign.SAVE_BUTTON.DISABLED_RECTANGLE.fillColor,
            strokeColor: FileAccessHUDDesign.SAVE_BUTTON.DISABLED_RECTANGLE.strokeColor,
            strokeWeight: FileAccessHUDDesign.SAVE_BUTTON.DISABLED_RECTANGLE.strokeWeight,
        }),
        hoverLabel: LabelService.new({
            area: saveButtonArea,
            fontColor: FileAccessHUDDesign.SAVE_BUTTON.FONT_COLOR,
            padding: FileAccessHUDDesign.SAVE_BUTTON.PADDING,
            text: FileAccessHUDDesign.SAVE_BUTTON.TEXT,
            textSize: FileAccessHUDDesign.SAVE_BUTTON.TEXT_SIZE,
            fillColor: FileAccessHUDDesign.SAVE_BUTTON.HOVER_RECTANGLE.fillColor,
            strokeColor: FileAccessHUDDesign.SAVE_BUTTON.HOVER_RECTANGLE.strokeColor,
            strokeWeight: FileAccessHUDDesign.SAVE_BUTTON.HOVER_RECTANGLE.strokeWeight,
        }),
        onClickHandler(mouseX: number, mouseY: number, button: Button, caller: {
            fileAccessHUD: FileAccessHUD,
            battleHUDState: BattleHUDState
        }): {} {
            return clickedOnSaveButton(mouseX, mouseY, button, caller);
        },
    });
    createMessageLabel(fileAccessHUD);
}

const createMessageLabel = (fileAccessHUD: FileAccessHUD) => {
    const messageLabelArea: RectArea = RectAreaService.new({
        screenWidth: ScreenDimensions.SCREEN_WIDTH,
        ...FileAccessHUDDesign.MESSAGE_LABEL.AREA,
    });
    fileAccessHUD.messageLabel = LabelService.new({
        area: messageLabelArea,
        noFill: FileAccessHUDDesign.MESSAGE_LABEL.RECTANGLE.noFill,
        noStroke: FileAccessHUDDesign.MESSAGE_LABEL.RECTANGLE.noStroke,
        padding: FileAccessHUDDesign.MESSAGE_LABEL.PADDING,
        text: fileAccessHUD.message,
        textSize: FileAccessHUDDesign.MESSAGE_LABEL.TEXT_SIZE,
        fontColor: FileAccessHUDDesign.MESSAGE_LABEL.FONT_COLOR
    });
};

const disableButtonsAndCacheStatus = (fileAccessHUD: FileAccessHUD) => {
    if (fileAccessHUD.loadButton.getStatus() !== ButtonStatus.DISABLED) {
        fileAccessHUD.loadButtonCachedStatus = fileAccessHUD.loadButton.getStatus();
        fileAccessHUD.loadButton.setStatus(ButtonStatus.DISABLED);
    }

    if (fileAccessHUD.saveButton.getStatus() !== ButtonStatus.DISABLED) {
        fileAccessHUD.saveButtonCachedStatus = fileAccessHUD.saveButton.getStatus();
        fileAccessHUD.saveButton.setStatus(ButtonStatus.DISABLED);
    }
};

const disableButtonsAndClearCache = (fileAccessHUD: FileAccessHUD) => {
    fileAccessHUD.loadButtonCachedStatus = undefined;
    fileAccessHUD.loadButton.setStatus(ButtonStatus.DISABLED);

    fileAccessHUD.saveButtonCachedStatus = undefined;
    fileAccessHUD.saveButton.setStatus(ButtonStatus.DISABLED);
};

const restoreButtonStatusAndClearCache = (fileAccessHUD: FileAccessHUD) => {
    if (fileAccessHUD.loadButtonCachedStatus != undefined) {
        fileAccessHUD.loadButton.setStatus(fileAccessHUD.loadButtonCachedStatus);
    }
    fileAccessHUD.loadButtonCachedStatus = undefined;

    if (fileAccessHUD.saveButtonCachedStatus != undefined) {
        fileAccessHUD.saveButton.setStatus(fileAccessHUD.saveButtonCachedStatus);
    }
    fileAccessHUD.saveButtonCachedStatus = undefined;
};

const changeButtonStatusBasedOnMessage = (fileAccessHUD: FileAccessHUD) => {
    if (isValidValue(fileAccessHUD.message)) {
        disableButtonsAndCacheStatus(fileAccessHUD);
    } else {
        restoreButtonStatusAndClearCache(fileAccessHUD);
    }
};

function didCurrentMessageExpire(fileAccessHUD: FileAccessHUD) {
    const messageIsCurrentlySet: boolean = isValidValue(fileAccessHUD.message);
    const messageTimerIsSet: boolean = isValidValue(fileAccessHUD.messageDisplayStartTime);
    const messageExpired = Date.now() > fileAccessHUD.messageDisplayStartTime + FileAccessHUDDesign.MESSAGE_DISPLAY_DURATION;
    return messageIsCurrentlySet
        && messageTimerIsSet
        && messageExpired;
}

const calculateMessageToShow = (battleHUDState: BattleHUDState, fileAccessHUD: FileAccessHUD): string => {
    const messageChecks: { [key in FileAccessHUDMessage]?: boolean } = {
        [FileAccessHUDMessage.SAVE_IN_PROGRESS]: (battleHUDState.saveSaveState.userRequestedSave && battleHUDState.saveSaveState.savingInProgress),
        [FileAccessHUDMessage.SAVE_SUCCESS]: (battleHUDState.saveSaveState.userRequestedSave && !battleHUDState.saveSaveState.savingInProgress),
        [FileAccessHUDMessage.SAVE_FAILED]: (battleHUDState.saveSaveState.userRequestedSave && battleHUDState.saveSaveState.errorDuringSaving),
        [FileAccessHUDMessage.LOAD_IN_PROGRESS]: (battleHUDState.loadSaveState.userRequestedLoad && battleHUDState.loadSaveState.applicationStartedLoad),
        [FileAccessHUDMessage.LOAD_SUCCESS]: (battleHUDState.loadSaveState.userRequestedLoad && battleHUDState.loadSaveState.applicationCompletedLoad),
        [FileAccessHUDMessage.LOAD_FAILED]: (battleHUDState.loadSaveState.userRequestedLoad && battleHUDState.loadSaveState.applicationErroredWhileLoading),
    }

    const messagePriority = [
        FileAccessHUDMessage.SAVE_FAILED,
        FileAccessHUDMessage.SAVE_IN_PROGRESS,
        FileAccessHUDMessage.SAVE_SUCCESS,
        FileAccessHUDMessage.LOAD_FAILED,
        FileAccessHUDMessage.LOAD_IN_PROGRESS,
        FileAccessHUDMessage.LOAD_SUCCESS,
    ];

    return messagePriority.find(message =>
        messageChecks[message]
    );
};

const resetMessageTimer = (fileAccessHUD: FileAccessHUD) => {
    fileAccessHUD.messageDisplayStartTime = Date.now();
};
const updateMessageLabel = (fileAccessHUD: FileAccessHUD, messageToShow: string) => {
    if (!isValidValue(messageToShow)) {
        return;
    }

    if (fileAccessHUD.message === messageToShow) {
        return;
    }

    fileAccessHUD.message = messageToShow;
    createMessageLabel(fileAccessHUD);
    resetMessageTimer(fileAccessHUD);
};

const clearMessage = (battleHUDState: BattleHUDState, fileAccessHUD: FileAccessHUD) => {
    fileAccessHUD.message = undefined;
    fileAccessHUD.messageDisplayStartTime = undefined;
    createMessageLabel(fileAccessHUD);
};
