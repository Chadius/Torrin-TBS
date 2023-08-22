import p5 from "p5";
import {HorizontalAnchor, RectArea, VerticalAnchor} from "../ui/rectArea";
import {Rectangle} from "../ui/rectangle";
import {getResultOrThrowError, isResult} from "../utils/ResultOrError";
import {ScreenDimensions} from "../utils/graphicsConfig";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {ImageUI} from "../ui/imageUI";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ActivityButton} from "../squaddie/activityButton";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieActivity} from "../squaddie/activity";
import {SquaddieEndTurnActivity} from "./history/squaddieEndTurnActivity";
import {SquaddieInstructionInProgress} from "./history/squaddieInstructionInProgress";
import {TextBox} from "../ui/textBox";
import {
    CanPlayerControlSquaddieRightNow,
    GetArmorClass,
    GetHitPoints,
    GetNumberOfActions
} from "../squaddie/squaddieService";
import {Label} from "../ui/label";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1} from "../ui/constants";
import {convertMapCoordinatesToWorldCoordinates} from "../hexMap/convertCoordinates";
import {BattleOrchestratorState} from "./orchestrator/battleOrchestratorState";
import {KeyButtonName, KeyWasPressed} from "../utils/keyboardConfig";

enum ActivityValidityCheck {
    IS_VALID,
    SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTIONS,
}

export class BattleSquaddieSelectedHUD {
    selectedSquaddieDynamicId: string;
    affiliateIcon?: ImageUI;
    selectedActivity: SquaddieActivity | SquaddieEndTurnActivity;
    activityButtons: ActivityButton[];
    nextSquaddieButton: Label;
    nextSquaddieDynamicIds: string[];
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
        this.selectedSquaddieDynamicId = "";
    }

    selectSquaddieAndDrawWindow({dynamicId, repositionWindow, state}: {
                                    dynamicId: string,
                                    repositionWindow?: { mouseX: number, mouseY: number },
                                    state: BattleOrchestratorState,
                                }
    ) {
        this.selectedSquaddieDynamicId = dynamicId;
        this.invalidCommandWarningTextBox.stop();

        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(this.selectedSquaddieDynamicId))

        const {windowDimensions, squaddieAffiliationHue} = this.setBackgroundWindowAndGetWindowDimensions(
            staticSquaddie.squaddieId.affiliation,
            repositionWindow ? repositionWindow.mouseY : undefined
        );

        this.generateAffiliateIcon(staticSquaddie, state);
        this.generateSquaddieActivityButtons(staticSquaddie, dynamicSquaddie, squaddieAffiliationHue, windowDimensions);
        this.generateNextSquaddieButton(windowDimensions);
        this.generateSquaddieIdText(staticSquaddie);
    }

    createWindowPosition(mouseY: number) {
        const windowTop: number = (mouseY < (ScreenDimensions.SCREEN_HEIGHT * 0.8)) ? ScreenDimensions.SCREEN_HEIGHT * 0.8 : 10;
        const windowHeight: number = (ScreenDimensions.SCREEN_HEIGHT * 0.2) - 10;
        const windowDimensions = new RectArea({
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
        return this._background.area.isInside(mouseX, mouseY);
    }

    public shouldDrawTheHUD(): boolean {
        return !!this.selectedSquaddieDynamicId;
    }

    public getSelectedSquaddieDynamicId(): string {
        return this.selectedSquaddieDynamicId;
    }

    draw(squaddieCurrentlyActing: SquaddieInstructionInProgress, state: BattleOrchestratorState, p: p5) {
        if (!this.shouldDrawTheHUD()) {
            return;
        }
        this._background.draw(p);
        this.drawSquaddieID(state, p);
        this.drawSquaddieAttributes(state, p);
        this.drawNumberOfActions(state, p);
        this.drawSquaddieActivities(p);
        this.drawUncontrollableSquaddieWarning(state, p);
        this.drawDifferentSquaddieWarning(squaddieCurrentlyActing, state, p);
        this.invalidCommandWarningTextBox.draw(p);
        if (this.shouldDrawNextButton(state)) {
            this.nextSquaddieButton.draw(p);
        }
    }

    getActivityButtons(): ActivityButton[] {
        return this.activityButtons ? [...this.activityButtons] : [];
    }

    wasActivitySelected(): boolean {
        return this.selectedActivity !== undefined;
    }

    getSelectedActivity(): SquaddieActivity | SquaddieEndTurnActivity {
        return this.selectedActivity;
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
        const clickedActivityButton = this.activityButtons.find((button) =>
            button.buttonArea.isInside(mouseX, mouseY)
        );

        if (clickedActivityButton) {
            const activityValidCheck = this.checkIfActivityIsValid(clickedActivityButton.activity, state);
            if (activityValidCheck === ActivityValidityCheck.IS_VALID) {
                this.selectedActivity = clickedActivityButton.activity;
                return;
            }
            this.warnUserNotEnoughActionsToPerformAction(clickedActivityButton.activity);
        }

        const clickedOnNextButton: boolean = this.shouldDrawNextButton(state) && this.nextSquaddieButton.rectangle.area.isInside(mouseX, mouseY);
        if (clickedOnNextButton) {
            this.selectNextSquaddie(state);
        }
    }

    reset() {
        this.selectedSquaddieDynamicId = "";
        this.affiliateIcon = undefined;
        this.selectedActivity = undefined;
        this.activityButtons = undefined;
        this.invalidCommandWarningTextBox = new TextBox({
            text: "",
            textSize: 0,
            fontColor: [0, 0, 0],
            area: new RectArea({
                left: 0, top: 0, width: 0, height: 0,
            }),
            duration: 0,
        });
        this.nextSquaddieDynamicIds = [];
    }

    shouldDrawNextButton(state: BattleOrchestratorState): boolean {
        const numberOfPlayerControllableSquaddiesWhoCanCurrentlyAct: number = state.squaddieRepository.getDynamicSquaddieIterator().filter((info) => {
            return this.isSquaddiePlayerControllableRightNow(info.dynamicSquaddieId, state) === true
        }).length;

        const selectedSquaddieIsPlayerControllableRightNow: boolean = this.selectedSquaddieDynamicId && this.isSquaddiePlayerControllableRightNow(this.selectedSquaddieDynamicId, state);

        if (selectedSquaddieIsPlayerControllableRightNow && numberOfPlayerControllableSquaddiesWhoCanCurrentlyAct > 1) {
            return true;
        }

        return !selectedSquaddieIsPlayerControllableRightNow && numberOfPlayerControllableSquaddiesWhoCanCurrentlyAct > 0;
    }

    private generateSquaddieActivityButtons(
        staticSquaddie: BattleSquaddieStatic,
        dynamicSquaddie: BattleSquaddieDynamic,
        squaddieAffiliationHue: number,
        windowDimensions: RectArea
    ) {
        this.activityButtons = [];
        staticSquaddie.activities.forEach((activity: SquaddieActivity, index: number) => {
            this.activityButtons.push(
                new ActivityButton({
                    buttonArea: new RectArea({
                        baseRectangle: windowDimensions,
                        anchorLeft: HorizontalAnchor.LEFT,
                        anchorTop: VerticalAnchor.CENTER,
                        left: windowDimensions.width * (6 + index) / 12,
                        width: 32,
                        height: 32,
                    }),
                    activity,
                    hue: squaddieAffiliationHue,
                })
            );
        });

        this.activityButtons.push(
            new ActivityButton({
                hue: squaddieAffiliationHue,
                buttonArea: new RectArea({
                    baseRectangle: windowDimensions,
                    anchorLeft: HorizontalAnchor.RIGHT,
                    anchorTop: VerticalAnchor.CENTER,
                    left: -64,
                    width: 32,
                    height: 32,
                }),
                activity: new SquaddieEndTurnActivity(),
            })
        );
    }

    private generateAffiliateIcon(staticSquaddie: BattleSquaddieStatic, state: BattleOrchestratorState) {
        let affiliateIconImage: p5.Image;
        switch (staticSquaddie.squaddieId.affiliation) {
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
                area: new RectArea({
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

    private drawSquaddieID(state: BattleOrchestratorState, p: p5) {
        const {
            staticSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(this.selectedSquaddieDynamicId));

        if (this.affiliateIcon) {
            this.affiliateIcon.draw(p);
        }

        this.squaddieIdTextBox.draw(p);
    }

    private drawNumberOfActions(state: BattleOrchestratorState, p: p5) {
        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(this.selectedSquaddieDynamicId));
        const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie});

        p.push();

        const mainActionIconWidth: number = 25;
        const actionIconLeft: number = this._background.area.left + 20;

        p.fill("#dedede");
        p.stroke("#1f1f1f");
        const actionBackground: RectArea = new RectArea({
            left: actionIconLeft,
            height: mainActionIconWidth * 3,
            width: 40,
            top: this._background.area.top + 45,
        })
        p.fill("#1f1f1f");
        p.stroke("#1f1f1f");
        p.strokeWeight(2);
        p.rect(actionBackground.left, actionBackground.top, actionBackground.width, actionBackground.height);

        p.fill("#dedede");
        p.rect(
            actionBackground.left,
            actionBackground.bottom - mainActionIconWidth * normalActionsRemaining,
            actionBackground.width,
            mainActionIconWidth * normalActionsRemaining);

        const actionLineMarking: RectArea = new RectArea({
            left: actionBackground.left,
            width: 0,
            top: actionBackground.top,
            height: actionBackground.height,
        });

        [1, 2].filter(i => normalActionsRemaining >= i).forEach(i => {
            const verticalDistance: number = i * actionBackground.height / 3;
            p.line(
                actionBackground.left,
                actionLineMarking.bottom - verticalDistance,
                actionBackground.right,
                actionLineMarking.bottom - verticalDistance,
            )
        });

        p.pop();
    }

    private drawSquaddieActivities(p: p5) {
        this.activityButtons.forEach((button) => {
            button.draw(p)
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

        this._background = new Rectangle({
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

    private drawUncontrollableSquaddieWarning(state: BattleOrchestratorState, p: p5) {
        if (!this.selectedSquaddieDynamicId) {
            return;
        }
        const {
            dynamicSquaddie,
            staticSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(this.selectedSquaddieDynamicId));

        const {
            squaddieHasThePlayerControlledAffiliation,
            squaddieCanCurrentlyAct,
            playerCanControlThisSquaddieRightNow,
        } = CanPlayerControlSquaddieRightNow({dynamicSquaddie, staticSquaddie});

        if (playerCanControlThisSquaddieRightNow) {
            return;
        }

        let warningText: string = "";
        if (!squaddieHasThePlayerControlledAffiliation) {
            warningText = `You cannot control ${staticSquaddie.squaddieId.name}`;
        } else if (!squaddieCanCurrentlyAct) {
            warningText = `No actions remaining for ${staticSquaddie.squaddieId.name}`;
        }

        this.maybeCreateInvalidCommandWarningTextBox(warningText);

    }

    private drawDifferentSquaddieWarning(squaddieCurrentlyActing: SquaddieInstructionInProgress, state: BattleOrchestratorState, p: p5) {
        if (
            !squaddieCurrentlyActing
            || squaddieCurrentlyActing.isReadyForNewSquaddie()
        ) {
            return;
        }

        const {staticSquaddie} = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(squaddieCurrentlyActing.instruction.getDynamicSquaddieId()));
        const differentSquaddieWarningText: string = `Cannot act, wait for ${staticSquaddie.squaddieId.name}`;

        if (
            this.selectedSquaddieDynamicId === squaddieCurrentlyActing.instruction.getDynamicSquaddieId()
        ) {
            if (
                this.invalidCommandWarningTextBox.text === differentSquaddieWarningText
            ) {
                this.invalidCommandWarningTextBox.stop();
            }
            return;
        }

        this.maybeCreateInvalidCommandWarningTextBox(differentSquaddieWarningText);
    }

    private maybeCreateInvalidCommandWarningTextBox(differentSquaddieWarningText: string, duration?: number) {
        if (
            this.invalidCommandWarningTextBox === undefined
            || this.invalidCommandWarningTextBox.isDone()
            || this.invalidCommandWarningTextBox.text !== differentSquaddieWarningText
        ) {
            this.invalidCommandWarningTextBox = new TextBox({
                text: differentSquaddieWarningText,
                textSize: 24,
                fontColor: [0, 0, 192],
                area: new RectArea({
                    baseRectangle: this.background.area,
                    anchorLeft: HorizontalAnchor.MIDDLE,
                    margin: [0, 0, 30, 40],
                }),
                duration
            })
        }
    }

    private generateSquaddieIdText(staticSquaddie: BattleSquaddieStatic) {
        this.squaddieIdTextBox = new TextBox({
            text: staticSquaddie.squaddieId.name,
            textSize: 24,
            fontColor: [HUE_BY_SQUADDIE_AFFILIATION[staticSquaddie.squaddieId.affiliation], 10, 192],
            area: new RectArea({
                baseRectangle: this._background.area,
                anchorLeft: HorizontalAnchor.LEFT,
                anchorTop: VerticalAnchor.TOP,
                margin: [20, 0, 0, 70],
            })
        });
    }

    private warnUserNotEnoughActionsToPerformAction(activity: SquaddieActivity | SquaddieEndTurnActivity): void {
        let warningText: string = '';
        if (activity instanceof SquaddieEndTurnActivity) {
            warningText = "Not enough actions to wait???";
        } else {
            warningText = `Need ${activity.actionsToSpend} actions to use this ability`
        }

        this.maybeCreateInvalidCommandWarningTextBox(
            warningText,
            2000,
        );
    }

    private checkIfActivityIsValid(activity: SquaddieActivity | SquaddieEndTurnActivity, state: BattleOrchestratorState): ActivityValidityCheck {
        if (activity instanceof SquaddieEndTurnActivity) {
            return ActivityValidityCheck.IS_VALID;
        }

        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(this.selectedSquaddieDynamicId));
        const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie})

        if (normalActionsRemaining < activity.actionsToSpend) {
            return ActivityValidityCheck.SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTIONS;
        }

        return ActivityValidityCheck.IS_VALID
    }

    private drawSquaddieAttributes(state: BattleOrchestratorState, p: p5) {
        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(this.selectedSquaddieDynamicId));

        const textSize = 16;
        const fontColor = [100, 0, 80];
        const baseRectangle = new RectArea({
            left: this.background.area.left,
            top: this.background.area.top,
            width: 100,
            height: 30,
        });

        const attributeLeftOffset = 100;
        const attributeTextTopMargin = 12;
        const attributeTextLeftMargin = 56;
        const attributeIconSize = 48;

        const hitPointsInfo = GetHitPoints({staticSquaddie, dynamicSquaddie});
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
            p,
        });

        const armorClassInfo = GetArmorClass({staticSquaddie, dynamicSquaddie});
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
            p,
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
                                p,
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
                                p: p5,
                            }
    ) {
        const textBox = new TextBox({
            text,
            textSize,
            fontColor,
            area: new RectArea({
                baseRectangle,
                top: topOffset + textTopMargin,
                left: iconLeftOffset + textLeftMargin,
            })
        });
        textBox.draw(p);

        const iconAttempt = state.resourceHandler.getResource(iconResourceKey);
        if (isResult(iconAttempt)) {
            const iconImage = new ImageUI({
                graphic: getResultOrThrowError(iconAttempt),
                area: new RectArea({
                    baseRectangle,
                    top: topOffset,
                    left: iconLeftOffset,
                    width: iconSize,
                    height: iconSize,
                })
            });
            iconImage.draw(p);
        }
    }

    private generateNextSquaddieButton(windowDimensions: RectArea) {
        const nextButtonArea = new RectArea({
            top: windowDimensions.top + WINDOW_SPACING1,
            bottom: windowDimensions.bottom - WINDOW_SPACING1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            startColumn: 2,
            endColumn: 2,
        });

        this.nextSquaddieButton = new Label({
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

    private isSquaddiePlayerControllableRightNow = (dynamicSquaddieId: string, state: BattleOrchestratorState): boolean => {
        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicSquaddieId));

        const {
            playerCanControlThisSquaddieRightNow
        } = CanPlayerControlSquaddieRightNow({
            staticSquaddie,
            dynamicSquaddie,
        });

        return playerCanControlThisSquaddieRightNow;
    }

    private selectNextSquaddie(state: BattleOrchestratorState) {
        if (this.nextSquaddieDynamicIds.length === 0) {
            this.nextSquaddieDynamicIds = state.squaddieRepository.getDynamicSquaddieIterator().filter((info) => {
                return this.isSquaddiePlayerControllableRightNow(info.dynamicSquaddieId, state) === true
            }).map((info) => info.dynamicSquaddieId);
        }

        if (this.nextSquaddieDynamicIds.length === 0) {
            return;
        }

        const nextDynamicSquaddieId: string = this.nextSquaddieDynamicIds.find(id => id !== this.selectedSquaddieDynamicId);
        this.nextSquaddieDynamicIds = this.nextSquaddieDynamicIds.filter(id => id != nextDynamicSquaddieId);

        const selectedMapCoordinates = state.missionMap.getSquaddieByDynamicId(nextDynamicSquaddieId);
        if (selectedMapCoordinates.isValid()) {
            const selectedWorldCoordinates = convertMapCoordinatesToWorldCoordinates(
                selectedMapCoordinates.mapLocation.q,
                selectedMapCoordinates.mapLocation.r
            );
            state.camera.pan({
                xDestination: selectedWorldCoordinates[0],
                yDestination: selectedWorldCoordinates[1],
                timeToPan: 500,
                respectConstraints: true,
            })
        }

        this.selectSquaddieAndDrawWindow({
            dynamicId: nextDynamicSquaddieId,
            state,
        })
    }
}
