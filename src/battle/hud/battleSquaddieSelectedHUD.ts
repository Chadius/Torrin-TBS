import {HorizontalAnchor, RectArea, RectAreaService, VerticalAnchor} from "../../ui/rectArea";
import {Rectangle, RectangleHelper} from "../../ui/rectangle";
import {getResultOrThrowError, isResult} from "../../utils/ResultOrError";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../graphicsConstants";
import {ImageUI} from "../../ui/imageUI";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MakeDecisionButton} from "../../squaddie/makeDecisionButton";
import {BattleSquaddie} from "../battleSquaddie";
import {ActionEffectSquaddieTemplate} from "../../decision/actionEffectSquaddieTemplate";
import {ActionEffectEndTurn, ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";
import {CurrentlySelectedSquaddieDecision} from "../history/currentlySelectedSquaddieDecision";
import {TextBoxHelper} from "../../ui/textBox";
import {CanPlayerControlSquaddieRightNow, GetArmorClass, SquaddieService} from "../../squaddie/squaddieService";
import {Label, LabelHelper} from "../../ui/label";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING2} from "../../ui/constants";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {KeyButtonName, KeyWasPressed} from "../../utils/keyboardConfig";
import {GraphicImage, GraphicsContext} from "../../utils/graphics/graphicsContext";
import {ButtonStatus} from "../../ui/button";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {DrawBattleHUD} from "./drawBattleHUD";
import {
    BattleHUDGraphicsObject,
    BattleHUDGraphicsObjectsHelper,
    BattleHUDGraphicsObjectTextBoxTypes
} from "./graphicsObject";
import {isValidValue} from "../../utils/validityCheck";
import {OrchestratorUtilities} from "../orchestratorComponents/orchestratorUtils";
import {BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {BattleStateService} from "../orchestrator/battleState";

export const FILE_MESSAGE_DISPLAY_DURATION = 2000;

enum ActionValidityCheck {
    IS_VALID = "IS_VALID",
    SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTION_POINTS = "SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTION_POINTS",
    PLAYER_CANNOT_CONTROL_SQUADDIE = "PLAYER_CANNOT_CONTROL_SQUADDIE",
}

const ActionPointsTopOffset = 45;
const ActionPointsBarHeight = 20;
const ActionPointsTextHeight = 20;
const ActionPointsBarColors =
    {
        strokeColor: {color: "#1f1f1f"},
        foregroundFillColor: {color: "#dedede"},
        backgroundFillColor: {color: "#1f1f1f"},
    };

const HitPointsTopOffset = 70;
const HitPointsBarHeight = 25;
const HitPointsTextHeight = 20;
const HitPointsBarColors = {
    strokeColor: {color: "#1f1f1f"},
    foregroundFillColor: {color: "#000000"},
    backgroundFillColor: {color: "#1f1f1f"},
};

export const GetSquaddieTeamIconImage = (state: BattleOrchestratorState, battleSquaddie: BattleSquaddie): GraphicImage => {
    let affiliateIconImage: GraphicImage = null;

    const team = state.battleState.teams
        .find(team => team.battleSquaddieIds.includes(battleSquaddie.battleSquaddieId));
    if (
        isValidValue(team)
        && isValidValue(team.iconResourceKey)
        && team.iconResourceKey !== ""
    ) {
        affiliateIconImage = getResultOrThrowError(state.resourceHandler.getResource(team.iconResourceKey));
    }
    return affiliateIconImage;
};

export class BattleSquaddieSelectedHUD {
    selectedBattleSquaddieId: string;
    affiliateIcon?: ImageUI;
    selectedAction: {
        squaddieAction?: ActionEffectSquaddieTemplate,
        endTurnAction?: ActionEffectEndTurn,
    };
    makeDecisionButtons: MakeDecisionButton[];
    loadGameButton: Label;
    saveGameButton: Label;
    nextSquaddieButton: Label;
    endTurnButton: Label;
    nextBattleSquaddieIds: string[];
    graphicsObjects: BattleHUDGraphicsObject;

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
        if (this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX !== undefined) {
            TextBoxHelper.stop(this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX);
        }

        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, this.selectedBattleSquaddieId))

        const {windowDimensions, squaddieAffiliationHue} = this.setBackgroundWindowAndGetWindowDimensions(
            squaddieTemplate.squaddieId.affiliation,
            repositionWindow ? repositionWindow.mouseY : undefined
        );
        this.generateSaveAndLoadGameButton(windowDimensions);
        this.generateNextSquaddieButton(windowDimensions);
        this.generateEndTurnButton(windowDimensions);

        this.generateAffiliateIcon(battleSquaddie, state);
        this.generateUseActionButtons(squaddieTemplate, battleSquaddie, squaddieAffiliationHue, windowDimensions);

        this.generateSquaddieSpecificUITextBoxes(squaddieTemplate, battleSquaddie);
    }

    createWindowPosition(mouseY: number) {
        const windowTop: number = (mouseY < (ScreenDimensions.SCREEN_HEIGHT * 0.8)) ? ScreenDimensions.SCREEN_HEIGHT * 0.8 : 10;
        const windowHeight: number = (ScreenDimensions.SCREEN_HEIGHT * 0.2) - 10;
        const windowDimensions = RectAreaService.new({
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
        return RectAreaService.isInside(this._background.area, mouseX, mouseY);
    }

    public shouldDrawTheHUD(): boolean {
        return !!this.selectedBattleSquaddieId;
    }

    public getSelectedBattleSquaddieId(): string {
        return this.selectedBattleSquaddieId;
    }

    draw(squaddieCurrentlyActing: CurrentlySelectedSquaddieDecision, state: GameEngineState, graphicsContext: GraphicsContext) {
        if (!this.shouldDrawTheHUD()) {
            return;
        }
        RectangleHelper.draw(this._background, graphicsContext);
        this.drawSquaddieID(state.battleOrchestratorState, graphicsContext);
        this.drawSquaddieAttributes(state.battleOrchestratorState, graphicsContext);
        this.drawActionPoints(state.battleOrchestratorState, graphicsContext);
        this.drawHitPoints(state.battleOrchestratorState, graphicsContext);
        this.drawSquaddieActions(graphicsContext);
        this.drawUncontrollableSquaddieWarning(state.battleOrchestratorState);
        this.drawDifferentSquaddieWarning(squaddieCurrentlyActing, state.battleOrchestratorState);
        this.drawFileAccessWarning(state);
        if (this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX !== undefined) {
            TextBoxHelper.draw(this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX, graphicsContext);
        }
        if (this.shouldDrawNextButton(state.battleOrchestratorState)) {
            LabelHelper.draw(this.nextSquaddieButton, graphicsContext);
        }
        this.maybeDrawEndTurnButton(state.battleOrchestratorState, graphicsContext);
        if (this.shouldDrawSaveAndLoadButton(state.battleOrchestratorState)) {
            LabelHelper.draw(this.saveGameButton, graphicsContext);
            LabelHelper.draw(this.loadGameButton, graphicsContext);
        }
    }

    getUseActionButtons(): MakeDecisionButton[] {
        return this.makeDecisionButtons ? [...this.makeDecisionButtons] : [];
    }

    didPlayerSelectEndTurnAction(): boolean {
        return !!this.selectedAction.endTurnAction;
    }

    didPlayerSelectSquaddieAction(): boolean {
        return !!this.selectedAction.squaddieAction;
    }

    getSquaddieSquaddieAction(): ActionEffectSquaddieTemplate {
        return this.selectedAction.squaddieAction;
    }

    getSelectedAction(): ActionEffectSquaddieTemplate | ActionEffectEndTurn {
        return this.selectedAction.squaddieAction ? this.selectedAction.squaddieAction : this.selectedAction.endTurnAction;
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

    mouseClicked(mouseX: number, mouseY: number, state: GameEngineState) {
        if (
            state.gameSaveFlags.savingInProgress
            || state.gameSaveFlags.loadingInProgress
            || state.gameSaveFlags.loadRequested
        ) {
            return;
        }

        const selectedUseActionButton = this.makeDecisionButtons.find((button) =>
            RectAreaService.isInside(button.buttonArea, mouseX, mouseY)
        );

        if (selectedUseActionButton) {
            const actionValidityCheck = this.checkIfActionIsValid(
                selectedUseActionButton.actionEffectSquaddieTemplate,
                state.battleOrchestratorState,
            );
            if (actionValidityCheck === ActionValidityCheck.IS_VALID) {
                this.selectedAction.squaddieAction = selectedUseActionButton.actionEffectSquaddieTemplate;
                return;
            }
            this.warnUserNotEnoughActionPointsToPerformAction(selectedUseActionButton.actionEffectSquaddieTemplate);
        }

        const clickedOnNextButton: boolean = this.shouldDrawNextButton(state.battleOrchestratorState) && RectAreaService.isInside(this.nextSquaddieButton.rectangle.area, mouseX, mouseY);
        if (clickedOnNextButton) {
            this.selectNextSquaddie(state.battleOrchestratorState);
        }

        this.checkForEndTurnButtonClick(state.battleOrchestratorState, mouseX, mouseY);

        if (this.shouldDrawSaveAndLoadButton(state.battleOrchestratorState) && RectAreaService.isInside(this.saveGameButton.rectangle.area, mouseX, mouseY)) {
            this.markGameToBeSaved(state);
        }
        if (this.shouldDrawSaveAndLoadButton(state.battleOrchestratorState) && RectAreaService.isInside(this.loadGameButton.rectangle.area, mouseX, mouseY)) {
            this.markGameToBeLoaded(state);
        }
    }

    mouseMoved(mouseX: number, mouseY: number, state: BattleOrchestratorState) {
        this.makeDecisionButtons.forEach((button) => {
            if (RectAreaService.isInside(button.buttonArea, mouseX, mouseY)) {
                button.status = ButtonStatus.HOVER;
            } else {
                button.status = ButtonStatus.READY;
            }
        });
    }

    reset() {
        this.selectedBattleSquaddieId = "";
        this.affiliateIcon = undefined;
        this.selectedAction = {
            squaddieAction: undefined,
            endTurnAction: undefined,
        };
        this.makeDecisionButtons = undefined;
        this.nextBattleSquaddieIds = [];

        this.graphicsObjects = BattleHUDGraphicsObjectsHelper.new();
    }

    shouldDrawNextButton(state: BattleOrchestratorState): boolean {
        const numberOfPlayerControllableSquaddiesWhoCanCurrentlyAct: number = ObjectRepositoryService.getBattleSquaddieIterator(state.squaddieRepository).filter((info) => {
            return this.isSquaddiePlayerControllableRightNow(info.battleSquaddieId, state) === true
        }).length;

        const selectedSquaddieIsPlayerControllableRightNow: boolean = this.selectedBattleSquaddieId && this.isSquaddiePlayerControllableRightNow(this.selectedBattleSquaddieId, state);

        if (selectedSquaddieIsPlayerControllableRightNow && numberOfPlayerControllableSquaddiesWhoCanCurrentlyAct > 1) {
            return true;
        }

        return !selectedSquaddieIsPlayerControllableRightNow && numberOfPlayerControllableSquaddiesWhoCanCurrentlyAct > 0;
    }

    shouldDrawEndTurnButton(state: BattleOrchestratorState): boolean {
        const currentTeam = BattleStateService.getCurrentTeam(state.battleState, state.squaddieRepository);
        if (!isValidValue(currentTeam)) {
            return false;
        }
        return BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.squaddieRepository);
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
            && state.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase
            && state.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.decisions.length > 0
        ) {
            return false;
        }

        return true;
    }

    markGameToBeSaved(state: GameEngineState): void {
        state.gameSaveFlags.savingInProgress = true;
    }

    markGameToBeLoaded(state: GameEngineState): void {
        state.gameSaveFlags.loadRequested = true;
    }

    private generateUseActionButtons(
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
        squaddieAffiliationHue: number,
        windowDimensions: RectArea
    ) {
        this.makeDecisionButtons = [];
        squaddieTemplate.actions.forEach((action: ActionEffectSquaddieTemplate, index: number) => {
            this.makeDecisionButtons.push(
                new MakeDecisionButton({
                    buttonArea: RectAreaService.new({
                        baseRectangle: windowDimensions,
                        anchorLeft: HorizontalAnchor.LEFT,
                        anchorTop: VerticalAnchor.CENTER,
                        vertAlign: VERT_ALIGN_CENTER,
                        left: windowDimensions.width * (6.5 + index) / 12,
                        width: (windowDimensions.width / 12) - 16,
                        height: this._background.area.height * 0.5,
                    }),
                    actionEffectSquaddieTemplate: action,
                    hue: squaddieAffiliationHue,
                })
            );
        });
    }

    private generateAffiliateIcon(battleSquaddie: BattleSquaddie, state: BattleOrchestratorState) {
        let affiliateIconImage = GetSquaddieTeamIconImage(state, battleSquaddie);

        if (affiliateIconImage) {
            this.affiliateIcon = new ImageUI({
                graphic: affiliateIconImage,
                area: RectAreaService.new({
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
        if (this.affiliateIcon) {
            this.affiliateIcon.draw(graphicsContext);
        }

        TextBoxHelper.draw(this.graphicsObjects.textBoxes.SQUADDIE_ID, graphicsContext);
    }

    private drawActionPoints(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, this.selectedBattleSquaddieId));
        const {actionPointsRemaining} = SquaddieService.getNumberOfActionPoints({squaddieTemplate, battleSquaddie});

        graphicsContext.push();
        TextBoxHelper.draw(this.graphicsObjects.textBoxes[BattleHUDGraphicsObjectTextBoxTypes.ACTION_POINTS], graphicsContext);
        graphicsContext.pop();

        const barFillColor = {
            hsb: [
                HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation] || HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.UNKNOWN],
                2,
                60,
            ]
        }

        DrawBattleHUD.drawHorizontalDividedBar({
            graphicsContext,
            drawArea: RectAreaService.new({
                left: this.background.area.left + ScreenDimensions.SCREEN_WIDTH / 12,
                height: ActionPointsBarHeight,
                width: ScreenDimensions.SCREEN_WIDTH / 12,
                top: this.background.area.top + ActionPointsTopOffset,
            }),
            currentAmount: actionPointsRemaining,
            maxAmount: 3,
            strokeWeight: 2,
            colors: {...ActionPointsBarColors, foregroundFillColor: barFillColor},
        });
    }

    private drawHitPoints(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, this.selectedBattleSquaddieId));
        const {currentHitPoints, maxHitPoints} = SquaddieService.getHitPoints({squaddieTemplate, battleSquaddie});

        graphicsContext.push();
        TextBoxHelper.draw(this.graphicsObjects.textBoxes[BattleHUDGraphicsObjectTextBoxTypes.HIT_POINTS], graphicsContext);
        graphicsContext.pop();

        const barFillColor = {
            hsb: [
                HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation] || HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.UNKNOWN],
                70,
                70,
            ]
        }

        DrawBattleHUD.drawHorizontalDividedBar({
            graphicsContext,
            drawArea: RectAreaService.new({
                left: this.background.area.left + ScreenDimensions.SCREEN_WIDTH / 12,
                height: HitPointsBarHeight,
                width: ScreenDimensions.SCREEN_WIDTH / 12,
                top: this.background.area.top + HitPointsTopOffset,
            }),
            currentAmount: currentHitPoints,
            maxAmount: maxHitPoints,
            strokeWeight: 2,
            colors: {...HitPointsBarColors, foregroundFillColor: barFillColor},
        });
    }

    private drawSquaddieActions(graphicsContext: GraphicsContext) {
        this.makeDecisionButtons.forEach((button) => {
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
            fillColor: [squaddieAffiliationHue, 10, 20],
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
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, this.selectedBattleSquaddieId));

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

    private drawFileAccessWarning(state: GameEngineState) {
        const WARNING_LOAD_FILE_FAILED = "Loading failed. Check logs.";
        if (
            state.gameSaveFlags.errorDuringLoading
            && (
                this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX === undefined
                || this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX.text !== WARNING_LOAD_FILE_FAILED
            )
        ) {
            this.maybeCreateInvalidCommandWarningTextBox(WARNING_LOAD_FILE_FAILED, FILE_MESSAGE_DISPLAY_DURATION);
            state.gameSaveFlags.errorDuringLoading = false;
            return;
        }

        const WARNING_SAVE_FILE_FAILED = "Saving failed. Check logs.";
        if (
            state.gameSaveFlags.errorDuringSaving
            && (
                this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX === undefined
                || this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX.text !== WARNING_SAVE_FILE_FAILED
            )
        ) {
            this.maybeCreateInvalidCommandWarningTextBox(WARNING_SAVE_FILE_FAILED, FILE_MESSAGE_DISPLAY_DURATION);
            state.gameSaveFlags.errorDuringSaving = false;
            return;
        }

        const WARNING_SAVE_FILE = "Saving...";
        if (state.gameSaveFlags.savingInProgress
            && (
                this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX === undefined
                || this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX.text !== WARNING_SAVE_FILE
            )
        ) {
            this.maybeCreateInvalidCommandWarningTextBox(WARNING_SAVE_FILE, FILE_MESSAGE_DISPLAY_DURATION);
            return;

        }

        const WARNING_LOAD_FILE = "Loading...";
        if (
            (
                state.gameSaveFlags.loadingInProgress
                || state.gameSaveFlags.loadRequested
            )
            && (
                this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX === undefined
                || this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX.text !== WARNING_LOAD_FILE
            )
        ) {
            this.maybeCreateInvalidCommandWarningTextBox(WARNING_LOAD_FILE, FILE_MESSAGE_DISPLAY_DURATION);
            return;
        }
    }

    private drawDifferentSquaddieWarning(squaddieCurrentlyActing: CurrentlySelectedSquaddieDecision, state: BattleOrchestratorState) {
        if (!OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)) {
            return;
        }

        const {squaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.battleSquaddieId));
        const differentSquaddieWarningText: string = `Cannot act, wait for ${squaddieTemplate.squaddieId.name}`;

        if (
            this.selectedBattleSquaddieId === squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase.battleSquaddieId
        ) {
            if (
                this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX !== undefined
                && this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX.text === differentSquaddieWarningText
            ) {
                TextBoxHelper.stop(this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX);
            }
            return;
        }

        this.maybeCreateInvalidCommandWarningTextBox(differentSquaddieWarningText, undefined);
    }

    private maybeCreateInvalidCommandWarningTextBox(differentSquaddieWarningText: string, duration: number | undefined) {
        if (
            this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX === undefined
            || TextBoxHelper.isDone(this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX)
            || this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX.text !== differentSquaddieWarningText
        ) {
            this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX =
                TextBoxHelper.new({
                        text: differentSquaddieWarningText,
                        textSize: 24,
                        fontColor: [0, 0, 192],
                        area: RectAreaService.new({
                            baseRectangle: this.background.area,
                            anchorLeft: HorizontalAnchor.MIDDLE,
                            margin: [0, 0, 30, 40],
                        }),
                        duration
                    }
                );
        }
    }

    private generateSquaddieIdText(squaddieTemplate: SquaddieTemplate) {
        this.graphicsObjects.textBoxes.SQUADDIE_ID =
            TextBoxHelper.new({
                text: squaddieTemplate.squaddieId.name,
                textSize: 24,
                fontColor: [HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation], 10, 192],
                area: RectAreaService.new({
                    baseRectangle: this._background.area,
                    anchorLeft: HorizontalAnchor.LEFT,
                    anchorTop: VerticalAnchor.TOP,
                    margin: [20, 0, 0, 70],
                })
            });
    }

    private warnUserNotEnoughActionPointsToPerformAction(action: ActionEffectSquaddieTemplate): void {
        let warningText: string = '';
        warningText = `Need ${action.actionPointCost} action points`

        this.maybeCreateInvalidCommandWarningTextBox(
            warningText,
            2000,
        );
    }

    private canPlayerControlThisSquaddie(state: BattleOrchestratorState): boolean {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, this.selectedBattleSquaddieId));

        const canPlayerControlSquaddieRightNow = CanPlayerControlSquaddieRightNow({squaddieTemplate, battleSquaddie});
        return canPlayerControlSquaddieRightNow.playerCanControlThisSquaddieRightNow;
    }

    private checkIfActionIsValid(action: ActionEffectSquaddieTemplate, state: BattleOrchestratorState): ActionValidityCheck {
        if (!this.canPlayerControlThisSquaddie(state)) {
            return ActionValidityCheck.PLAYER_CANNOT_CONTROL_SQUADDIE;
        }

        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, this.selectedBattleSquaddieId));

        const {actionPointsRemaining} = SquaddieService.getNumberOfActionPoints({squaddieTemplate, battleSquaddie})
        if (actionPointsRemaining < action.actionPointCost) {
            return ActionValidityCheck.SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTION_POINTS;
        }

        return ActionValidityCheck.IS_VALID
    }

    private drawSquaddieAttributes(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, this.selectedBattleSquaddieId));

        const textSize = 16;
        const fontColor = [100, 0, 80];
        const baseRectangle = RectAreaService.new({
            left: this.background.area.left + 5 * ScreenDimensions.SCREEN_WIDTH / 24,
            top: this.background.area.top,
            width: 100,
            height: 30,
        });

        const attributeLeftOffset = 0;
        const attributeTextTopMargin = 12;
        const attributeTextLeftMargin = 56;
        const attributeIconSize = 48;

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
            topOffset: 0,
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
            area: RectAreaService.new({
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
                area: RectAreaService.new({
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
        const saveButtonArea = RectAreaService.new({
            top: windowDimensions.top + WINDOW_SPACING1,
            height: windowDimensions.height / 2 - WINDOW_SPACING1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn: 4,
            endColumn: 4,
            margin: [0, WINDOW_SPACING1, WINDOW_SPACING1, 0],
        });

        const loadButtonArea = RectAreaService.new({
            top: RectAreaService.centerY(windowDimensions) + WINDOW_SPACING1,
            height: windowDimensions.height / 2 - WINDOW_SPACING2,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn: 4,
            endColumn: 4,
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
        const nextButtonArea = RectAreaService.new({
            top: windowDimensions.top + WINDOW_SPACING1,
            height: RectAreaService.height(windowDimensions) / 3,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn: 5,
            endColumn: 5,
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
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.squaddieRepository, battleSquaddieId));

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
            this.nextBattleSquaddieIds = ObjectRepositoryService.getBattleSquaddieIterator(state.squaddieRepository).filter((info) => {
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

    private generateSquaddieSpecificUITextBoxes(squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie) {
        this.generateSquaddieIdText(squaddieTemplate);
        this.generateActionPointsText(squaddieTemplate, battleSquaddie);
        this.generateHitPointsText(squaddieTemplate, battleSquaddie);
    }

    private generateActionPointsText(squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie) {
        const {actionPointsRemaining} = SquaddieService.getNumberOfActionPoints({squaddieTemplate, battleSquaddie});

        this.graphicsObjects.textBoxes.ACTION_POINTS =
            TextBoxHelper.new({
                text: `Actions: ${actionPointsRemaining}`,
                textSize: 16,
                fontColor: [HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation], 7, 96],
                area: RectAreaService.new({
                    left: this.background.area.left + WINDOW_SPACING1,
                    height: ActionPointsBarHeight,
                    width: ScreenDimensions.SCREEN_WIDTH / 12 - WINDOW_SPACING1,
                    top: this.background.area.top + ActionPointsTopOffset + (ActionPointsBarHeight - ActionPointsTextHeight),
                })
            });
    }

    private generateHitPointsText(squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie) {
        const {currentHitPoints, maxHitPoints} = SquaddieService.getHitPoints({squaddieTemplate, battleSquaddie});

        this.graphicsObjects.textBoxes.HIT_POINTS =
            TextBoxHelper.new({
                text: `HP: ${currentHitPoints} / ${maxHitPoints}`,
                textSize: 16,
                fontColor: [HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation], 7, 128],
                area: RectAreaService.new({
                    left: this.background.area.left + WINDOW_SPACING1,
                    height: HitPointsBarHeight,
                    width: ScreenDimensions.SCREEN_WIDTH / 12 - WINDOW_SPACING1,
                    top: this.background.area.top + HitPointsTopOffset + (HitPointsBarHeight - HitPointsTextHeight),
                })
            });
    }

    private maybeDrawEndTurnButton(battleOrchestratorState: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        if (!this.shouldDrawEndTurnButton(battleOrchestratorState)) {
            return;
        }

        LabelHelper.draw(this.endTurnButton, graphicsContext);
    }

    private generateEndTurnButton(windowDimensions: RectArea) {
        const endTurnButtonArea = RectAreaService.new({
            top: 0,
            height: RectAreaService.height(windowDimensions) / 3,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn: 5,
            endColumn: 5,
        });
        RectAreaService.setBottom(endTurnButtonArea, RectAreaService.bottom(windowDimensions) - WINDOW_SPACING1);

        this.endTurnButton = LabelHelper.new({
            text: "End Turn",
            textSize: 20,
            fillColor: [10, 2, 192],
            fontColor: [20, 5, 16],
            area: endTurnButtonArea,
            horizAlign: HORIZ_ALIGN_CENTER,
            vertAlign: VERT_ALIGN_CENTER,
            padding: WINDOW_SPACING1,
        });
    }

    private checkForEndTurnButtonClick(battleOrchestratorState: BattleOrchestratorState, mouseX: number, mouseY: number) {
        const clickedOnEndTurnButton: boolean =
            this.shouldDrawEndTurnButton(battleOrchestratorState)
            && RectAreaService.isInside(this.endTurnButton.rectangle.area, mouseX, mouseY)
        ;
        if (!clickedOnEndTurnButton) {
            return;
        }

        if (!this.canPlayerControlThisSquaddie(battleOrchestratorState)) {
            return;
        }

        this.selectedAction.endTurnAction = ActionEffectEndTurnService.new();
    }
}