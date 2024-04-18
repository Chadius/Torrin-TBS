import {HorizontalAnchor, RectArea, RectAreaService, VerticalAnchor} from "../../ui/rectArea";
import {Rectangle, RectangleHelper} from "../../ui/rectangle";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../graphicsConstants";
import {ImageUI} from "../../ui/imageUI";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MakeDecisionButton} from "../../squaddie/makeDecisionButton";
import {BattleSquaddie} from "../battleSquaddie";
import {TextBoxHelper} from "../../ui/textBox";
import {GetArmorClass, SquaddieService} from "../../squaddie/squaddieService";
import {Label, LabelService} from "../../ui/label";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_BASELINE, VERT_ALIGN_CENTER, WINDOW_SPACING1,} from "../../ui/constants";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {KeyButtonName, KeyWasPressed} from "../../utils/keyboardConfig";
import {GraphicImage, GraphicsContext} from "../../utils/graphics/graphicsContext";
import {ButtonStatus} from "../../ui/button";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
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
import {ActionTemplate} from "../../action/template/actionTemplate";
import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMapService} from "../../missionMap/missionMap";
import {MouseButton} from "../../utils/mouseConfig";

export const FILE_MESSAGE_DISPLAY_DURATION = 2000;
const DECISION_BUTTON_LAYOUT = {
    top: 12,
    leftSideOfRowColumnOutOfTwelve: 6,
    leftSidePadding: 24,
    horizontalSpacePerButton: 16,
    width: 72,
    height: 72,
}

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

const getSquaddieTeamIconImage = (state: GameEngineState, battleSquaddie: BattleSquaddie): GraphicImage => {
    let affiliateIconImage: GraphicImage = null;

    const team = state.battleOrchestratorState.battleState.teams
        .find(team => team.battleSquaddieIds.includes(battleSquaddie.battleSquaddieId));
    if (
        isValidValue(team)
        && isValidValue(team.iconResourceKey)
        && team.iconResourceKey !== ""
    ) {
        affiliateIconImage = state.resourceHandler.getResource(team.iconResourceKey);
    }
    return affiliateIconImage;
};

export class BattleSquaddieSelectedHUD {
    selectedBattleSquaddieId: string;
    selectedEndTurn: boolean;

    affiliateIcon?: ImageUI;
    makeDecisionButtons: MakeDecisionButton[];
    nextSquaddieButton: Label;
    endTurnButton: Label;
    nextBattleSquaddieIds: string[];
    graphicsObjects: BattleHUDGraphicsObject;
    errorDuringLoadingDisplayStartTimestamp: number;
    selectedActionTemplate: ActionTemplate;

    constructor() {
        this.reset();
    }

    private _background: Rectangle;

    get background(): Rectangle {
        return this._background;
    }

    clearSelectedSquaddie() {
        this.selectedBattleSquaddieId = "";
    }

    selectSquaddieAndDrawWindow({battleId, repositionWindow, state}: {
                                    battleId: string,
                                    repositionWindow?: {
                                        mouseX: number,
                                        mouseY: number
                                    },
                                    state: GameEngineState,
                                }
    ) {
        this.selectedBattleSquaddieId = battleId;

        if (this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX !== undefined) {
            TextBoxHelper.stop(this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX);
        }

        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, this.selectedBattleSquaddieId))

        const {windowDimensions, squaddieAffiliationHue} = this.setBackgroundWindowAndGetWindowDimensions(
            squaddieTemplate.squaddieId.affiliation,
            repositionWindow ? repositionWindow.mouseY : undefined
        );
        this.generateNextSquaddieButton(windowDimensions);
        this.generateEndTurnButton(windowDimensions);

        this.generateAffiliateIcon(battleSquaddie, state);
        this.generateUseActionButtons({
            squaddieTemplate,
            battleSquaddie,
            squaddieAffiliationHue,
            windowDimensions,
            resourceHandler: state.resourceHandler,
            defaultButtonIconResourceKey: state.campaign.resources.actionEffectSquaddieTemplateButtonIcons.UNKNOWN,
        });

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

    draw(state: GameEngineState, graphicsContext: GraphicsContext) {
        if (!this.shouldDrawTheHUD()) {
            return;
        }
        RectangleHelper.draw(this._background, graphicsContext);
        this.drawSquaddieID(state.battleOrchestratorState, graphicsContext);
        this.drawSquaddieAttributes(state, graphicsContext);
        this.drawActionPoints(state, graphicsContext);
        this.drawHitPoints(state, graphicsContext);
        this.drawSquaddieActions(graphicsContext);
        this.drawUncontrollableSquaddieWarning(state);
        if (this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX !== undefined) {
            TextBoxHelper.draw(this.graphicsObjects.textBoxes.INVALID_COMMAND_WARNING_TEXT_BOX, graphicsContext);
        }
        if (this.shouldDrawNextButton(state)) {
            LabelService.draw(this.nextSquaddieButton, graphicsContext);
        }
        this.maybeDrawEndTurnButton(state, graphicsContext);
    }

    getUseActionButtons(): MakeDecisionButton[] {
        return this.makeDecisionButtons ? [...this.makeDecisionButtons] : [];
    }

    didPlayerSelectEndTurnAction(): boolean {
        return this.selectedEndTurn;
    }

    didPlayerSelectSquaddieAction(): boolean {
        return isValidValue(this.selectedActionTemplate);
    }

    getSquaddieSquaddieAction(): ActionTemplate {
        return this.selectedActionTemplate;
    }

    getSelectedActionTemplate(): ActionTemplate {
        return this.selectedActionTemplate;
    }

    keyPressed(keyCode: number, gameEngineState: GameEngineState) {
        if (this._background === undefined) {
            this.setBackgroundWindowAndGetWindowDimensions(SquaddieAffiliation.UNKNOWN, 0);
        }

        const pressedTheNextSquaddieKey: boolean = this.shouldDrawNextButton(gameEngineState) && KeyWasPressed(KeyButtonName.NEXT_SQUADDIE, keyCode);
        if (pressedTheNextSquaddieKey) {
            this.selectNextSquaddie(gameEngineState);
        }
    }

    mouseClicked(
        {mouseX, mouseY, mouseButton, gameEngineState}:
            { mouseX: number, mouseY: number, gameEngineState: GameEngineState, mouseButton: MouseButton }
    ) {
        if (
            gameEngineState.fileState.saveSaveState.savingInProgress
            || gameEngineState.fileState.loadSaveState.userRequestedLoad
            || gameEngineState.fileState.loadSaveState.applicationStartedLoad
        ) {
            return;
        }

        this.checkForActionButtonClick({gameEngineState, mouseX, mouseY, mouseButton});

        const clickedOnNextButton: boolean = this.shouldDrawNextButton(gameEngineState)
            && RectAreaService.isInside(this.nextSquaddieButton.rectangle.area, mouseX, mouseY)
            && mouseButton === MouseButton.ACCEPT;

        if (clickedOnNextButton) {
            this.selectNextSquaddie(gameEngineState);
        }

        this.checkForEndTurnButtonClick({gameEngineState, mouseX, mouseY, mouseButton});
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
        this.selectedActionTemplate = undefined;
        this.selectedEndTurn = false;
        this.makeDecisionButtons = undefined;
        this.nextBattleSquaddieIds = [];

        this.graphicsObjects = BattleHUDGraphicsObjectsHelper.new();
        this.errorDuringLoadingDisplayStartTimestamp = undefined;
    }

    shouldDrawNextButton(gameEngineState: GameEngineState): boolean {
        if (OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(gameEngineState)) {
            return;
        }

        const playerControllableSquaddiesWhoCanActAndOnTheMap = getPlayerControllableSquaddiesWhoCanActAndOnTheMap(gameEngineState);
        const numberOfPlayerControllableSquaddiesWhoCanCurrentlyActAndOnTheMap: number = playerControllableSquaddiesWhoCanActAndOnTheMap.length;

        const selectedSquaddieIsPlayerControllableRightNow: boolean = this.selectedBattleSquaddieId && isSquaddiePlayerControllableRightNow(this.selectedBattleSquaddieId, gameEngineState);

        if (selectedSquaddieIsPlayerControllableRightNow && numberOfPlayerControllableSquaddiesWhoCanCurrentlyActAndOnTheMap > 1) {
            return true;
        }

        return !selectedSquaddieIsPlayerControllableRightNow && numberOfPlayerControllableSquaddiesWhoCanCurrentlyActAndOnTheMap > 0;
    }

    shouldDrawEndTurnButton(state: GameEngineState): boolean {
        const currentTeam = BattleStateService.getCurrentTeam(state.battleOrchestratorState.battleState, state.repository);
        if (!isValidValue(currentTeam)) {
            return false;
        }
        return BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(currentTeam, state.repository);
    }

    drawUncontrollableSquaddieWarning(state: GameEngineState) {
        if (!this.selectedBattleSquaddieId) {
            return;
        }
        const {
            battleSquaddie,
            squaddieTemplate
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, this.selectedBattleSquaddieId));

        const {
            squaddieHasThePlayerControlledAffiliation,
            squaddieCanCurrentlyAct,
            playerCanControlThisSquaddieRightNow,
        } = SquaddieService.canPlayerControlSquaddieRightNow({battleSquaddie, squaddieTemplate});

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

    checkForActionButtonClick(
        {mouseX, mouseY, mouseButton, gameEngineState}:
            { mouseX: number, mouseY: number, gameEngineState: GameEngineState, mouseButton: MouseButton }
    ) {
        if (mouseButton != MouseButton.ACCEPT) {
            return;
        }

        const selectedUseActionButton = this.makeDecisionButtons.find((button) =>
            RectAreaService.isInside(button.buttonArea, mouseX, mouseY)
        );

        if (!selectedUseActionButton) {
            return
        }

        const actionValidityCheck = this.checkIfActionIsValid(
            selectedUseActionButton.actionTemplate,
            gameEngineState,
        );
        if (actionValidityCheck === ActionValidityCheck.IS_VALID) {
            this.selectedActionTemplate = selectedUseActionButton.actionTemplate;
            return;
        }
        this.warnUserNotEnoughActionPointsToPerformAction(selectedUseActionButton.actionTemplate);
    }

    private generateUseActionButtons(
        {
            squaddieTemplate,
            battleSquaddie,
            squaddieAffiliationHue,
            windowDimensions,
            resourceHandler,
            defaultButtonIconResourceKey,
        }:
            {
                squaddieTemplate: SquaddieTemplate,
                battleSquaddie: BattleSquaddie,
                squaddieAffiliationHue: number,
                windowDimensions: RectArea
                resourceHandler: ResourceHandler,
                defaultButtonIconResourceKey: string,
            }
    ) {
        this.makeDecisionButtons = [];
        const leftSideOfRow = (
                windowDimensions.width
                * DECISION_BUTTON_LAYOUT.leftSideOfRowColumnOutOfTwelve / 12
            )
            + DECISION_BUTTON_LAYOUT.leftSidePadding;
        squaddieTemplate.actionTemplates.forEach((actionTemplate: ActionTemplate, index: number) => {
            const horizontalButtonSpacePerIndex = DECISION_BUTTON_LAYOUT.width + DECISION_BUTTON_LAYOUT.horizontalSpacePerButton
            this.makeDecisionButtons.push(
                new MakeDecisionButton({
                    buttonArea: RectAreaService.new({
                        baseRectangle: windowDimensions,
                        anchorLeft: HorizontalAnchor.LEFT,
                        anchorTop: VerticalAnchor.TOP,
                        vertAlign: VERT_ALIGN_BASELINE,
                        top: DECISION_BUTTON_LAYOUT.top,
                        left: leftSideOfRow + (horizontalButtonSpacePerIndex * index),
                        width: DECISION_BUTTON_LAYOUT.width,
                        height: DECISION_BUTTON_LAYOUT.height,
                    }),
                    actionTemplate,
                    buttonIconResourceKey: isValidValue(actionTemplate.buttonIconResourceKey)
                        ? actionTemplate.buttonIconResourceKey
                        : defaultButtonIconResourceKey,
                    hue: squaddieAffiliationHue,
                    resourceHandler,
                })
            );
        });
    }

    private generateAffiliateIcon(battleSquaddie: BattleSquaddie, state: GameEngineState) {
        let affiliateIconImage = getSquaddieTeamIconImage(state, battleSquaddie);

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

    private drawActionPoints(state: GameEngineState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, this.selectedBattleSquaddieId));
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

    private drawHitPoints(state: GameEngineState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, this.selectedBattleSquaddieId));
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

    private warnUserNotEnoughActionPointsToPerformAction(actionTemplate: ActionTemplate): void {
        let warningText: string = '';
        warningText = `Need ${actionTemplate.actionPoints} action points`

        this.maybeCreateInvalidCommandWarningTextBox(
            warningText,
            2000,
        );
    }

    private canPlayerControlThisSquaddie(state: GameEngineState): boolean {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, this.selectedBattleSquaddieId));

        const {playerCanControlThisSquaddieRightNow} = SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie
        });
        return playerCanControlThisSquaddieRightNow;
    }

    private checkIfActionIsValid(actionTemplate: ActionTemplate, state: GameEngineState): ActionValidityCheck {
        if (!this.canPlayerControlThisSquaddie(state)) {
            return ActionValidityCheck.PLAYER_CANNOT_CONTROL_SQUADDIE;
        }

        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, this.selectedBattleSquaddieId));

        const {actionPointsRemaining} = SquaddieService.getNumberOfActionPoints({squaddieTemplate, battleSquaddie})
        if (actionPointsRemaining < actionTemplate.actionPoints) {
            return ActionValidityCheck.SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTION_POINTS;
        }

        return ActionValidityCheck.IS_VALID
    }

    private drawSquaddieAttributes(state: GameEngineState, graphicsContext: GraphicsContext) {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, this.selectedBattleSquaddieId));

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
                                state: GameEngineState,
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
        const iconImage = new ImageUI({
            graphic: iconAttempt,
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

    private generateNextSquaddieButton(windowDimensions: RectArea) {
        const nextButtonArea = RectAreaService.new({
            top: windowDimensions.top + WINDOW_SPACING1,
            height: RectAreaService.height(windowDimensions) / 3,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn: 5,
            endColumn: 5,
        });

        this.nextSquaddieButton = LabelService.new({
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

    private selectNextSquaddie(gameEngineState: GameEngineState) {
        if (this.nextBattleSquaddieIds.length === 0) {
            this.nextBattleSquaddieIds = getPlayerControllableSquaddiesWhoCanActAndOnTheMap(gameEngineState)
                .map((info) => info.battleSquaddieId);
        }

        if (this.nextBattleSquaddieIds.length === 0) {
            return;
        }

        const nextBattleSquaddieId: string = this.nextBattleSquaddieIds.find(id => id !== this.selectedBattleSquaddieId);
        this.nextBattleSquaddieIds = this.nextBattleSquaddieIds.filter(id => id != nextBattleSquaddieId);

        const selectedMapCoordinates = gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(nextBattleSquaddieId);
        if (MissionMapSquaddieLocationHandler.isValid(selectedMapCoordinates)) {
            const selectedWorldCoordinates = convertMapCoordinatesToWorldCoordinates(
                selectedMapCoordinates.mapLocation.q,
                selectedMapCoordinates.mapLocation.r
            );
            gameEngineState.battleOrchestratorState.battleState.camera.pan({
                xDestination: selectedWorldCoordinates[0],
                yDestination: selectedWorldCoordinates[1],
                timeToPan: 500,
                respectConstraints: true,
            })
        }

        this.selectSquaddieAndDrawWindow({
            battleId: nextBattleSquaddieId,
            state: gameEngineState,
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

    private maybeDrawEndTurnButton(state: GameEngineState, graphicsContext: GraphicsContext) {
        if (!this.shouldDrawEndTurnButton(state)) {
            return;
        }

        LabelService.draw(this.endTurnButton, graphicsContext);
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

        this.endTurnButton = LabelService.new({
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

    private checkForEndTurnButtonClick({gameEngineState, mouseX, mouseY, mouseButton}: {
        gameEngineState: GameEngineState,
        mouseX: number,
        mouseY: number,
        mouseButton: MouseButton,
    }) {
        if (mouseButton !== MouseButton.ACCEPT) {
            return;
        }

        const clickedOnEndTurnButton: boolean =
            this.shouldDrawEndTurnButton(gameEngineState)
            && RectAreaService.isInside(this.endTurnButton.rectangle.area, mouseX, mouseY)
        ;
        if (!clickedOnEndTurnButton) {
            return;
        }

        if (!this.canPlayerControlThisSquaddie(gameEngineState)) {
            return;
        }

        this.selectedEndTurn = true;
    }
}

const getPlayerControllableSquaddiesWhoCanActAndOnTheMap = (gameEngineState: GameEngineState) => ObjectRepositoryService.getBattleSquaddieIterator(gameEngineState.repository).filter((info) => {
    return isSquaddiePlayerControllableRightNow(info.battleSquaddieId, gameEngineState) === true
        && MissionMapService.getByBattleSquaddieId(gameEngineState.battleOrchestratorState.battleState.missionMap, info.battleSquaddieId).mapLocation !== undefined
});

const isSquaddiePlayerControllableRightNow = (battleSquaddieId: string, gameEngineState: GameEngineState): boolean => {
    const {
        squaddieTemplate,
        battleSquaddie,
    } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(gameEngineState.repository, battleSquaddieId));

    const {
        playerCanControlThisSquaddieRightNow
    } = SquaddieService.canPlayerControlSquaddieRightNow({
        squaddieTemplate,
        battleSquaddie,
    });

    return playerCanControlThisSquaddieRightNow;
}
