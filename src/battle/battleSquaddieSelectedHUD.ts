import {HorizontalAnchor, RectArea, RectAreaHelper, VerticalAnchor} from "../ui/rectArea";
import {Rectangle, RectangleHelper} from "../ui/rectangle";
import {getResultOrThrowError, isResult} from "../utils/ResultOrError";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {ImageUI} from "../ui/imageUI";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {UseActionButton} from "../squaddie/useActionButton";
import {BattleSquaddie} from "./battleSquaddie";
import {SquaddieAction} from "../squaddie/action";
import {SquaddieEndTurnAction} from "./history/squaddieEndTurnAction";
import {
    SquaddieInstructionInProgress,
    SquaddieInstructionInProgressHandler
} from "./history/squaddieInstructionInProgress";
import {TextBox, TextBoxHelper} from "../ui/textBox";
import {
    CanPlayerControlSquaddieRightNow,
    GetArmorClass,
    GetHitPoints,
    GetNumberOfActionPoints
} from "../squaddie/squaddieService";
import {Label, LabelHelper} from "../ui/label";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING2} from "../ui/constants";
import {convertMapCoordinatesToWorldCoordinates} from "../hexMap/convertCoordinates";
import {BattleOrchestratorState} from "./orchestrator/battleOrchestratorState";
import {KeyButtonName, KeyWasPressed} from "../utils/keyboardConfig";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {ButtonStatus} from "../ui/button";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {MissionMapSquaddieLocationHandler} from "../missionMap/squaddieLocation";
import {BattlePhase} from "./orchestratorComponents/battlePhaseTracker";

export const FILE_MESSAGE_DISPLAY_DURATION = 2000;

enum ActionValidityCheck {
    IS_VALID = "IS_VALID",
    SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTION_POINTS = "SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTION_POINTS",
    PLAYER_CANNOT_CONTROL_SQUADDIE = "PLAYER_CANNOT_CONTROL_SQUADDIE",
    SAVING_GAME = "SAVING_GAME",
    LOADING_GAME = "LOADING_GAME",
}

export class BattleSquaddieSelectedHUD {
    selectedBattleSquaddieId: string;
    affiliateIcon?: ImageUI;
    selectedAction: SquaddieAction | SquaddieEndTurnAction;
    useActionButtons: UseActionButton[];
    loadGameButton: Label;
    saveGameButton: Label;
    nextSquaddieButton: Label;
    nextBattleSquaddieIds: string[];
    squaddieIdTextBox: TextBox;
    invalidCommandWarningTextBox: TextBox;

    constructor() {
        this.reset();
    }

    private _background: Rectangle;

    get background(): Rectangle {
        return this._background;
    }

    mouseClickedNoSquaddieSelected() {
        this.selectedBattleSquaddieId = "";
    }

    selectSquaddieAndDrawWindow({battleId, repositionWindow, state}: {
                                    battleId: string,
                                    repositionWindow?: {
                                        mouseX: number,
                                        mouseY: number
                                    },
                                    state: BattleOrchestratorState,
                                }
    ) {
        this.selectedBattleSquaddieId = battleId;
        TextBoxHelper.stop(this.invalidCommandWarningTextBox);

        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(this.selectedBattleSquaddieId))

        const {windowDimensions, squaddieAffiliationHue} = this.setBackgroundWindowAndGetWindowDimensions(
            squaddieTemplate.squaddieId.affiliation,
            repositionWindow ? repositionWindow.mouseY : undefined
        );

        this.generateAffiliateIcon(squaddieTemplate, state);
        this.generateUseActionButtons(squaddieTemplate, battleSquaddie, squaddieAffiliationHue, windowDimensions);
        this.generateSaveAndLoadGameButton(windowDimensions);
        this.generateNextSquaddieButton(windowDimensions);
        this.generateSquaddieIdText(squaddieTemplate);
    }

    createWindowPosition(mouseY: number) {
        const windowTop: number = (mouseY < (ScreenDimensions.SCREEN_HEIGHT * 0.8)) ? ScreenDimensions.SCREEN_HEIGHT * 0.8 : 10;
        const windowHeight: number = (ScreenDimensions.SCREEN_HEIGHT * 0.2) - 10;
        const windowDimensions = RectAreaHelper.new({
            left: 10,
            right: ScreenDimensions.SCREEN_WIDTH - 10,
            top: windowTop,
            height: windowHeight
        });

        return {
            windowTop,
            windowHeight,
            windowDimensions
        }
    }

    public isMouseInsideHUD(mouseX: number, mouseY: number): boolean {
        return this.didMouseClickOnHUD(mouseX, mouseY);
    }

    public didMouseClickOnHUD(mouseX: number, mouseY: number): boolean {
        return RectAreaHelper.isInside(this._background.area, mouseX, mouseY);
    }

    public shouldDrawTheHUD(): boolean {
        return !!this.selectedBattleSquaddieId;
    }

    public getSelectedBattleSquaddieId(): string {
        return this.selectedBattleSquaddieId;
    }

    draw(squaddieCurrentlyActing: SquaddieInstructionInProgress, state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        if (!this.shouldDrawTheHUD()) {
            return;
        }
        RectangleHelper.draw(this._background, graphicsContext);
        this.drawSquaddieID(state, graphicsContext);
        this.drawSquaddieAttributes(state, graphicsContext);
        this.drawNumberOfActionPoints(state, graphicsContext);
        this.drawSquaddieActions(graphicsContext);
        this.drawUncontrollableSquaddieWarning(state);
        this.drawDifferentSquaddieWarning(squaddieCurrentlyActing, state);
        this.drawFileAccessWarning(state);
        TextBoxHelper.draw(this.invalidCommandWarningTextBox, graphicsContext);
        if (this.shouldDrawNextButton(state)) {
            LabelHelper.draw(this.nextSquaddieButton, graphicsContext);
        }
        if (this.shouldDrawSaveAndLoadButton(state)) {
            LabelHelper.draw(this.saveGameButton, graphicsContext);
            LabelHelper.draw(this.loadGameButton, graphicsContext);
        }
    }

    getUseActionButtons(): UseActionButton[] {
        return this.useActionButtons ? [...this.useActionButtons] : [];
    }

    wasAnyActionSelected(): boolean {
        return this.selectedAction !== undefined;
    }

    getSelectedAction(): SquaddieAction | SquaddieEndTurnAction {
        return this.selectedAction;
    }

    keyPressed(keyCode: number, state: BattleOrchestratorState) {
        if (this._background === undefined) {
            this.setBackgroundWindowAndGetWindowDimensions(SquaddieAffiliation.UNKNOWN, 0);
        }

        const pressedTheNextSquaddieKey: boolean = this.shouldDrawNextButton(state) && KeyWasPressed(KeyButtonName.NEXT_SQUADDIE, keyCode);
        if (pressedTheNextSquaddieKey) {
            this.selectNextSquaddie(state);
        }
    }

    mouseClicked(mouseX: number, mouseY: number, state: BattleOrchestratorState) {
        if (
            state.battleState.gameSaveFlags.savingInProgress
            || state.battleState.gameSaveFlags.loadingInProgress
            || state.battleState.gameSaveFlags.loadRequested
        ) {
            return;
        }

        const selectedUseActionButton = this.useActionButtons.find((button) =>
            RectAreaHelper.isInside(button.buttonArea, mouseX, mouseY)
        );

        if (selectedUseActionButton) {
            const actionToCheck = selectedUseActionButton.endTurnAction || selectedUseActionButton.action;
            const actionValidityCheck = this.checkIfActionIsValid(
                actionToCheck,
                state
            );
            if (actionValidityCheck === ActionValidityCheck.IS_VALID) {
                this.selectedAction = actionToCheck;
                return;
            }
            this.warnUserNotEnoughActionPointsToPerformAction(selectedUseActionButton.action);
        }

        const clickedOnNextButton: boolean = this.shouldDrawNextButton(state) && RectAreaHelper.isInside(this.nextSquaddieButton.rectangle.area, mouseX, mouseY);
        if (clickedOnNextButton) {
            this.selectNextSquaddie(state);
        }

        if (this.shouldDrawSaveAndLoadButton(state) && RectAreaHelper.isInside(this.saveGameButton.rectangle.area, mouseX, mouseY)) {
            this.markGameToBeSaved(state);
        }
        if (this.shouldDrawSaveAndLoadButton(state) && RectAreaHelper.isInside(this.loadGameButton.rectangle.area, mouseX, mouseY)) {
            this.markGameToBeLoaded(state);
        }
    }

    mouseMoved(mouseX: number, mouseY: number, state: BattleOrchestratorState) {
        this.useActionButtons.forEach((button) => {
            if (RectAreaHelper.isInside(button.buttonArea, mouseX, mouseY)) {
                button.status = ButtonStatus.HOVER;
            } else {
                button.status = ButtonStatus.READY;
            }
        });
    }

    reset() {
        this.selectedBattleSquaddieId = "";
        this.affiliateIcon = undefined;
        this.selectedAction = undefined;
        this.useActionButtons = undefined;
        this.invalidCommandWarningTextBox = TextBoxHelper.new({
            text: "",
            textSize: 0,
            fontColor: [0, 0, 0],
            area: RectAreaHelper.new({
                left: 0, top: 0, width: 0, height: 0,
            }),
            duration: 0,
        });
        this.nextBattleSquaddieIds = [];
    }

    shouldDrawNextButton(state: BattleOrchestratorState): boolean {
        const numberOfPlayerControllableSquaddiesWhoCanCurrentlyAct: number = state.squaddieRepository.getBattleSquaddieIterator().filter((info) => {
            return this.isSquaddiePlayerControllableRightNow(info.battleSquaddieId, state) === true
        }).length;

        const selectedSquaddieIsPlayerControllableRightNow: boolean = this.selectedBattleSquaddieId && this.isSquaddiePlayerControllableRightNow(this.selectedBattleSquaddieId, state);

        if (selectedSquaddieIsPlayerControllableRightNow && numberOfPlayerControllableSquaddiesWhoCanCurrentlyAct > 1) {
            return true;
        }

        return !selectedSquaddieIsPlayerControllableRightNow && numberOfPlayerControllableSquaddiesWhoCanCurrentlyAct > 0;
    }

    shouldDrawSaveAndLoadButton(state: BattleOrchestratorState): boolean {
        if (
            !state.battleState.battlePhaseState
            || state.battleState.battlePhaseState.currentAffiliation !== BattlePhase.PLAYER
        ) {
            return false;
        }

        if (
            state.battleState.squaddieCurrentlyActing
            && state.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound
            && state.battleState.squaddieCurrentlyActing.squaddieActionsForThisRound.actions.length > 0
        ) {
            return false;
        }

        return true;
    }

    markGameToBeSaved(state: BattleOrchestratorState): void {
        state.battleState.gameSaveFlags.savingInProgress = true;
    }

    markGameToBeLoaded(state: BattleOrchestratorState): void {
        state.battleState.gameSaveFlags.loadRequested = true;
    }

    private generateUseActionButtons(
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
        squaddieAffiliationHue: number,
        windowDimensions: RectArea
    ) {
        this.useActionButtons = [];
        squaddieTemplate.actions.forEach((action: SquaddieAction, index: number) => {
            this.useActionButtons.push(
                new UseActionButton({
                    buttonArea: RectAreaHelper.new({
                        baseRectangle: windowDimensions,
                        anchorLeft: HorizontalAnchor.LEFT,
                        anchorTop: VerticalAnchor.CENTER,
                        vertAlign: VERT_ALIGN_CENTER,
                        left: windowDimensions.width * (6 + index) / 12,
                        width: (windowDimensions.width / 12) - 16,
                        height: this._background.area.height * 0.5,
                    }),
                    action: action,
                    hue: squaddieAffiliationHue,
                })
            );
        });

        this.useActionButtons.push(
            new UseActionButton({
                hue: squaddieAffiliationHue,
                buttonArea: RectAreaHelper.new({
                    baseRectangle: windowDimensions,
                    anchorLeft: HorizontalAnchor.RIGHT,
                    anchorTop: VerticalAnchor.CENTER,
                    left: -1 * ((windowDimensions.width / 11) - 32),
                    vertAlign: VERT_ALIGN_CENTER,
                    width: (windowDimensions.width / 12) - 16,
                    height: this._background.area.height - 32,
                }),
                endTurnAction: new SquaddieEndTurnAction({}),
            })
        );
    }

    private generateAffiliateIcon(squaddieTemplate: SquaddieTemplate, state: BattleOrchestratorState) {
        let affiliateIconImage: GraphicImage;
        switch (squaddieTemplate.squaddieId.affiliation) {
            case SquaddieAffiliation.PLAYER:
                affiliateIconImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate_icon_crusaders"))
                break;
            case SquaddieAffiliation.ENEMY:
                affiliateIconImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate_icon_infiltrators"))
                break;
            case SquaddieAffiliation.ALLY:
                affiliateIconImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate_icon_western"))
                break;
            case SquaddieAffiliation.NONE:
                affiliateIconImage = getResultOrThrowError(state.resourceHandler.getResource("affiliate_icon_none"))
                break;
            default:
                affiliateIconImage = null;
                break;
        }
        if (affiliateIconImage) {
            this.affiliateIcon = new ImageUI({
                graphic: affiliateIconImage,
                area: RectAreaHelper.new({
                    left: this._background.area.left + 20,
                    top: this._background.area.top + 10,
                    width: 32,
                    height: 32,
                })
            })
        } else {
            this.affiliateIcon = null;
        }
    }

    private drawSquaddieID(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(this.selectedBattleSquaddieId));

        if (this.affiliateIcon) {
            this.affiliateIcon.draw(graphicsContext);
        }

        TextBoxHelper.draw(this.squaddieIdTextBox, graphicsContext);
    }

    private drawNumberOfActionPoints(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(this.selectedBattleSquaddieId));
        const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie});

        graphicsContext.push();

        const mainActionIconWidth: number = 25;
        const actionIconLeft: number = this._background.area.left + 20;

        graphicsContext.fill({color: "#dedede"});
        graphicsContext.stroke({color: "#1f1f1f"});
        const actionBackground: RectArea = RectAreaHelper.new({
            left: actionIconLeft,
            height: mainActionIconWidth * 3,
            width: 40,
            top: this._background.area.top + 45,
        })
        graphicsContext.fill({color: "#1f1f1f"});
        graphicsContext.stroke({color: "#1f1f1f"});
        graphicsContext.strokeWeight(2);
        graphicsContext.rect(actionBackground.left, actionBackground.top, actionBackground.width, actionBackground.height);

        graphicsContext.fill({color: "#dedede"});
        graphicsContext.rect(
            actionBackground.left,
            RectAreaHelper.bottom(actionBackground) - mainActionIconWidth * actionPointsRemaining,
            actionBackground.width,
            mainActionIconWidth * actionPointsRemaining);

        const actionLineMarking: RectArea = RectAreaHelper.new({
            left: actionBackground.left,
            width: 0,
            top: actionBackground.top,
            height: actionBackground.height,
        });

        [1, 2].filter(i => actionPointsRemaining >= i).forEach(i => {
            const verticalDistance: number = i * actionBackground.height / 3;
            graphicsContext.line(
                actionBackground.left,
                RectAreaHelper.bottom(actionLineMarking) - verticalDistance,
                RectAreaHelper.right(actionBackground),
                RectAreaHelper.bottom(actionLineMarking) - verticalDistance,
            )
        });

        graphicsContext.pop();
    }

    private drawSquaddieActions(graphicsContext: GraphicsContext) {
        this.useActionButtons.forEach((button) => {
            button.draw(graphicsContext)
        });
    }

    private setBackgroundWindowAndGetWindowDimensions(affiliation: SquaddieAffiliation, mouseY?: number) {
        let windowDimensions: RectArea;
        if (mouseY !== undefined) {
            const windowInfo = this.createWindowPosition(mouseY);
            windowDimensions = windowInfo.windowDimensions;
        } else {
            if (this._background === undefined) {
                this.setBackgroundWindowAndGetWindowDimensions(SquaddieAffiliation.UNKNOWN, 0);
            }

            windowDimensions = this._background.area;
        }

        const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[affiliation];

        this._background = RectangleHelper.new({
            area: windowDimensions,
            fillColor: [squaddieAffiliationHue, 10, 30],
            strokeColor: [squaddieAffiliationHue, 10, 6],
            strokeWeight: 4,
        });

        return {
            windowDimensions,
            squaddieAffiliationHue
        };
    }

    private drawUncontrollableSquaddieWarning(state: BattleOrchestratorState) {
        if (!this.selectedBattleSquaddieId) {
            return;
        }
        const {
            battleSquaddie,
            squaddieTemplate
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(this.selectedBattleSquaddieId));

        const {
            squaddieHasThePlayerControlledAffiliation,
            squaddieCanCurrentlyAct,
            playerCanControlThisSquaddieRightNow,
        } = CanPlayerControlSquaddieRightNow({battleSquaddie, squaddieTemplate});

        if (playerCanControlThisSquaddieRightNow) {
            return;
        }

        let warningText: string = "";
        if (!squaddieHasThePlayerControlledAffiliation) {
            warningText = `You cannot control ${squaddieTemplate.squaddieId.name}`;
        } else if (!squaddieCanCurrentlyAct) {
            warningText = `No actions remaining for ${squaddieTemplate.squaddieId.name}`;
        }

        this.maybeCreateInvalidCommandWarningTextBox(warningText, undefined);

    }

    private drawFileAccessWarning(state: BattleOrchestratorState) {
        const WARNING_LOAD_FILE_FAILED = "Loading failed. Check logs.";
        if (state.battleState.gameSaveFlags.errorDuringLoading && this.invalidCommandWarningTextBox.text !== WARNING_LOAD_FILE_FAILED) {
            this.maybeCreateInvalidCommandWarningTextBox(WARNING_LOAD_FILE_FAILED, FILE_MESSAGE_DISPLAY_DURATION);
            state.battleState.gameSaveFlags.errorDuringLoading = false;
            return;
        }

        const WARNING_SAVE_FILE_FAILED = "Saving failed. Check logs.";
        if (state.battleState.gameSaveFlags.errorDuringSaving && this.invalidCommandWarningTextBox.text !== WARNING_SAVE_FILE_FAILED) {
            this.maybeCreateInvalidCommandWarningTextBox(WARNING_SAVE_FILE_FAILED, FILE_MESSAGE_DISPLAY_DURATION);
            state.battleState.gameSaveFlags.errorDuringSaving = false;
            return;
        }

        const WARNING_SAVE_FILE = "Saving...";
        if (state.battleState.gameSaveFlags.savingInProgress && this.invalidCommandWarningTextBox.text !== WARNING_SAVE_FILE) {
            this.maybeCreateInvalidCommandWarningTextBox(WARNING_SAVE_FILE, FILE_MESSAGE_DISPLAY_DURATION);
            return;

        }

        const WARNING_LOAD_FILE = "Loading...";
        if ((state.battleState.gameSaveFlags.loadingInProgress || state.battleState.gameSaveFlags.loadRequested) && this.invalidCommandWarningTextBox.text !== WARNING_LOAD_FILE) {
            this.maybeCreateInvalidCommandWarningTextBox(WARNING_LOAD_FILE, FILE_MESSAGE_DISPLAY_DURATION);
            return;
        }
    }

    private drawDifferentSquaddieWarning(squaddieCurrentlyActing: SquaddieInstructionInProgress, state: BattleOrchestratorState) {
        if (
            SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(squaddieCurrentlyActing)
        ) {
            return;
        }

        const {squaddieTemplate} = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(squaddieCurrentlyActing.squaddieActionsForThisRound.battleSquaddieId));
        const differentSquaddieWarningText: string = `Cannot act, wait for ${squaddieTemplate.squaddieId.name}`;

        if (
            this.selectedBattleSquaddieId === squaddieCurrentlyActing.squaddieActionsForThisRound.battleSquaddieId
        ) {
            if (
                this.invalidCommandWarningTextBox.text === differentSquaddieWarningText
            ) {
                TextBoxHelper.stop(this.invalidCommandWarningTextBox);
            }
            return;
        }

        this.maybeCreateInvalidCommandWarningTextBox(differentSquaddieWarningText, undefined);
    }

    private maybeCreateInvalidCommandWarningTextBox(differentSquaddieWarningText: string, duration: number | undefined) {
        if (
            this.invalidCommandWarningTextBox === undefined
            || TextBoxHelper.isDone(this.invalidCommandWarningTextBox)
            || this.invalidCommandWarningTextBox.text !== differentSquaddieWarningText
        ) {
            this.invalidCommandWarningTextBox = TextBoxHelper.new({
                text: differentSquaddieWarningText,
                textSize: 24,
                fontColor: [0, 0, 192],
                area: RectAreaHelper.new({
                    baseRectangle: this.background.area,
                    anchorLeft: HorizontalAnchor.MIDDLE,
                    margin: [0, 0, 30, 40],
                }),
                duration
            })
        }
    }

    private generateSquaddieIdText(squaddieTemplate: SquaddieTemplate) {
        this.squaddieIdTextBox = TextBoxHelper.new({
            text: squaddieTemplate.squaddieId.name,
            textSize: 24,
            fontColor: [HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation], 10, 192],
            area: RectAreaHelper.new({
                baseRectangle: this._background.area,
                anchorLeft: HorizontalAnchor.LEFT,
                anchorTop: VerticalAnchor.TOP,
                margin: [20, 0, 0, 70],
            })
        });
    }

    private warnUserNotEnoughActionPointsToPerformAction(action: SquaddieAction | SquaddieEndTurnAction): void {
        let warningText: string = '';
        if (action instanceof SquaddieEndTurnAction) {
            warningText = "Not enough actions to wait???";
        } else {
            warningText = `Need ${action.actionPointCost} action points`
        }

        this.maybeCreateInvalidCommandWarningTextBox(
            warningText,
            2000,
        );
    }

    private checkIfActionIsValid(action: SquaddieAction | SquaddieEndTurnAction, state: BattleOrchestratorState): ActionValidityCheck {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(this.selectedBattleSquaddieId));

        const canPlayerControlSquaddieRightNow = CanPlayerControlSquaddieRightNow({squaddieTemplate, battleSquaddie});
        if (!canPlayerControlSquaddieRightNow.playerCanControlThisSquaddieRightNow) {
            return ActionValidityCheck.PLAYER_CANNOT_CONTROL_SQUADDIE;
        }

        if (action instanceof SquaddieEndTurnAction) {
            return ActionValidityCheck.IS_VALID;
        }

        const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
        if (actionPointsRemaining < action.actionPointCost) {
            return ActionValidityCheck.SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTION_POINTS;
        }

        return ActionValidityCheck.IS_VALID
    }

    private drawSquaddieAttributes(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(this.selectedBattleSquaddieId));

        const textSize = 16;
        const fontColor = [100, 0, 80];
        const baseRectangle = RectAreaHelper.new({
            left: this.background.area.left,
            top: this.background.area.top,
            width: 100,
            height: 30,
        });

        const attributeLeftOffset = 100;
        const attributeTextTopMargin = 12;
        const attributeTextLeftMargin = 56;
        const attributeIconSize = 48;

        const hitPointsInfo = GetHitPoints({squaddieTemplate, battleSquaddie});
        const hitPointsDescription = `${hitPointsInfo.currentHitPoints} / ${hitPointsInfo.maxHitPoints}`;
        this.drawIconAndText({
            baseRectangle,
            fontColor,
            iconLeftOffset: attributeLeftOffset,
            iconResourceKey: "hit points icon",
            iconSize: attributeIconSize,
            text: hitPointsDescription,
            textLeftMargin: attributeTextLeftMargin,
            textSize,
            textTopMargin: attributeTextTopMargin,
            topOffset: 40,
            state,
            graphicsContext,
        });

        const armorClassInfo = GetArmorClass({squaddieTemplate, battleSquaddie});
        const armorClassDescription = `${armorClassInfo.normalArmorClass}`;
        this.drawIconAndText({
            baseRectangle,
            fontColor,
            iconLeftOffset: attributeLeftOffset,
            iconResourceKey: "armor class icon",
            iconSize: attributeIconSize,
            text: armorClassDescription,
            textLeftMargin: attributeTextLeftMargin,
            textSize,
            textTopMargin: attributeTextTopMargin,
            topOffset: 80,
            state,
            graphicsContext,
        });
    }

    private drawIconAndText({
                                iconResourceKey,
                                iconSize,
                                topOffset,
                                iconLeftOffset,
                                textTopMargin,
                                textLeftMargin,
                                textSize,
                                fontColor,
                                text,
                                baseRectangle,
                                state,
                                graphicsContext,
                            }: {
                                iconResourceKey: string,
                                iconSize: number,
                                topOffset: number,
                                iconLeftOffset: number,
                                textTopMargin: number,
                                textLeftMargin: number,
                                textSize: number,
                                fontColor: number[],
                                text: string,
                                baseRectangle: RectArea,
                                state: BattleOrchestratorState,
                                graphicsContext: GraphicsContext,
                            }
    ) {
        const textBox = TextBoxHelper.new({
            text,
            textSize,
            fontColor,
            area: RectAreaHelper.new({
                baseRectangle,
                top: topOffset + textTopMargin,
                left: iconLeftOffset + textLeftMargin,
            })
        });

        TextBoxHelper.draw(textBox, graphicsContext);

        const iconAttempt = state.resourceHandler.getResource(iconResourceKey);
        if (isResult(iconAttempt)) {
            const iconImage = new ImageUI({
                graphic: getResultOrThrowError(iconAttempt),
                area: RectAreaHelper.new({
                    baseRectangle,
                    top: topOffset,
                    left: iconLeftOffset,
                    width: iconSize,
                    height: iconSize,
                })
            });
            iconImage.draw(graphicsContext);
        }
    }

    private generateSaveAndLoadGameButton(windowDimensions: RectArea) {
        const saveButtonArea = RectAreaHelper.new({
            top: windowDimensions.top + WINDOW_SPACING1,
            height: windowDimensions.height / 2 - WINDOW_SPACING1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn: 3,
            endColumn: 3,
            margin: [0, WINDOW_SPACING1, WINDOW_SPACING1, 0],
        });

        const loadButtonArea = RectAreaHelper.new({
            top: RectAreaHelper.centerY(windowDimensions) + WINDOW_SPACING1,
            height: windowDimensions.height / 2 - WINDOW_SPACING2,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn: 3,
            endColumn: 3,
            margin: [0, WINDOW_SPACING1, WINDOW_SPACING2, 0],
        });

        this.saveGameButton = LabelHelper.new({
            text: "Save",
            textSize: 24,
            fillColor: [10, 2, 192],
            fontColor: [20, 5, 16],
            area: saveButtonArea,
            horizAlign: HORIZ_ALIGN_CENTER,
            vertAlign: VERT_ALIGN_CENTER,
            padding: WINDOW_SPACING1,
        });

        this.loadGameButton = LabelHelper.new({
            text: "Load",
            textSize: 24,
            fillColor: [10, 2, 192],
            fontColor: [20, 5, 16],
            area: loadButtonArea,
            horizAlign: HORIZ_ALIGN_CENTER,
            vertAlign: VERT_ALIGN_CENTER,
            padding: WINDOW_SPACING1,
        });
    }

    private generateNextSquaddieButton(windowDimensions: RectArea) {
        const nextButtonArea = RectAreaHelper.new({
            top: windowDimensions.top + WINDOW_SPACING1,
            bottom: RectAreaHelper.bottom(windowDimensions) - WINDOW_SPACING1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn: 4,
            endColumn: 4,
        });

        this.nextSquaddieButton = LabelHelper.new({
            text: "Next",
            textSize: 24,
            fillColor: [10, 2, 192],
            fontColor: [20, 5, 16],
            area: nextButtonArea,
            horizAlign: HORIZ_ALIGN_CENTER,
            vertAlign: VERT_ALIGN_CENTER,
            padding: WINDOW_SPACING1,
        });
    }

    private isSquaddiePlayerControllableRightNow = (battleSquaddieId: string, state: BattleOrchestratorState): boolean => {
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(battleSquaddieId));

        const {
            playerCanControlThisSquaddieRightNow
        } = CanPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        });

        return playerCanControlThisSquaddieRightNow;
    }

    private selectNextSquaddie(state: BattleOrchestratorState) {
        if (this.nextBattleSquaddieIds.length === 0) {
            this.nextBattleSquaddieIds = state.squaddieRepository.getBattleSquaddieIterator().filter((info) => {
                return this.isSquaddiePlayerControllableRightNow(info.battleSquaddieId, state) === true
            }).map((info) => info.battleSquaddieId);
        }

        if (this.nextBattleSquaddieIds.length === 0) {
            return;
        }

        const nextBattleSquaddieId: string = this.nextBattleSquaddieIds.find(id => id !== this.selectedBattleSquaddieId);
        this.nextBattleSquaddieIds = this.nextBattleSquaddieIds.filter(id => id != nextBattleSquaddieId);

        const selectedMapCoordinates = state.battleState.missionMap.getSquaddieByBattleId(nextBattleSquaddieId);
        if (MissionMapSquaddieLocationHandler.isValid(selectedMapCoordinates)) {
            const selectedWorldCoordinates = convertMapCoordinatesToWorldCoordinates(
                selectedMapCoordinates.mapLocation.q,
                selectedMapCoordinates.mapLocation.r
            );
            state.battleState.camera.pan({
                xDestination: selectedWorldCoordinates[0],
                yDestination: selectedWorldCoordinates[1],
                timeToPan: 500,
                respectConstraints: true,
            })
        }

        this.selectSquaddieAndDrawWindow({
            battleId: nextBattleSquaddieId,
            state,
        })
    }
}
