import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {MissionMap} from "../missionMap/missionMap";
import p5 from "p5";
import {HorizontalAnchor, RectArea, VerticalAnchor} from "../ui/rectArea";
import {Rectangle} from "../ui/rectangle";
import {getResultOrThrowError, isResult} from "../utils/ResultOrError";
import {ScreenDimensions} from "../utils/graphicsConfig";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {ResourceHandler} from "../resource/resourceHandler";
import {ImageUI} from "../ui/imageUI";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ActivityButton} from "../squaddie/activityButton";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieActivity} from "../squaddie/activity";
import {SquaddieEndTurnActivity} from "./history/squaddieEndTurnActivity";
import {SquaddieInstructionInProgress} from "./history/squaddieInstructionInProgress";
import {TextBox} from "../ui/textBox";
import {GetArmorClass, GetHitPoints, GetNumberOfActions} from "../squaddie/squaddieService";

enum ActivityValidityCheck {
    IS_VALID,
    SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTIONS,
}

export class BattleSquaddieSelectedHUD {
    squaddieRepository: BattleSquaddieRepository;
    missionMap: MissionMap;
    resourceHandler: ResourceHandler;

    selectedSquaddieDynamicId: string;
    private _background: Rectangle;
    affiliateIcon?: ImageUI;
    selectedActivity: SquaddieActivity | SquaddieEndTurnActivity;

    activityButtons: ActivityButton[];

    squaddieIdTextBox: TextBox;
    invalidCommandWarningTextBox: TextBox;

    constructor(options: {
        squaddieRepository: BattleSquaddieRepository;
        missionMap: MissionMap;
        resourceHandler: ResourceHandler;
    }) {
        this.squaddieRepository = options.squaddieRepository;
        this.missionMap = options.missionMap;
        this.resourceHandler = options.resourceHandler;

        this.reset();
    }

    get background(): Rectangle {
        return this._background;
    }

    mouseClickedNoSquaddieSelected() {
        this.selectedSquaddieDynamicId = "";
    }

    selectSquaddieAndDrawWindow({dynamicID, repositionWindow}: {
                                    dynamicID: string,
                                    repositionWindow?: { mouseX: number, mouseY: number }
                                }
    ) {
        this.selectedSquaddieDynamicId = dynamicID;
        this.invalidCommandWarningTextBox.stop();

        let windowDimensions: RectArea;
        if (repositionWindow) {
            const windowInfo = this.createWindowPosition(repositionWindow.mouseY);
            windowDimensions = windowInfo.windowDimensions;
        } else {
            windowDimensions = this._background.area;
        }

        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicId))
        const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[staticSquaddie.squaddieId.affiliation];

        this._background = new Rectangle({
            area: windowDimensions,
            fillColor: [squaddieAffiliationHue, 10, 30],
            strokeColor: [squaddieAffiliationHue, 10, 6],
            strokeWeight: 4,
        });
        this.generateAffiliateIcon(staticSquaddie);
        this.generateSquaddieActivityButtons(staticSquaddie, dynamicSquaddie, squaddieAffiliationHue, windowDimensions);
        this.generateSquaddieIdText(staticSquaddie);
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
                        left: windowDimensions.getWidth() * (6 + index) / 12,
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

    private generateAffiliateIcon(staticSquaddie: BattleSquaddieStatic) {
        let affiliateIconImage: p5.Image;
        switch (staticSquaddie.squaddieId.affiliation) {
            case SquaddieAffiliation.PLAYER:
                affiliateIconImage = getResultOrThrowError(this.resourceHandler.getResource("affiliate_icon_crusaders"))
                break;
            case SquaddieAffiliation.ENEMY:
                affiliateIconImage = getResultOrThrowError(this.resourceHandler.getResource("affiliate_icon_infiltrators"))
                break;
            case SquaddieAffiliation.ALLY:
                affiliateIconImage = getResultOrThrowError(this.resourceHandler.getResource("affiliate_icon_western"))
                break;
            case SquaddieAffiliation.NONE:
                affiliateIconImage = getResultOrThrowError(this.resourceHandler.getResource("affiliate_icon_none"))
                break;
            default:
                affiliateIconImage = null;
                break;
        }
        if (affiliateIconImage) {
            this.affiliateIcon = new ImageUI({
                graphic: affiliateIconImage,
                area: new RectArea({
                    left: this._background.area.getLeft() + 20,
                    top: this._background.area.getTop() + 10,
                    width: 32,
                    height: 32,
                })
            })
        } else {
            this.affiliateIcon = null;
        }
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

    draw(squaddieCurrentlyActing: SquaddieInstructionInProgress, p: p5) {
        if (!this.shouldDrawTheHUD()) {
            return;
        }
        this._background.draw(p);
        this.drawSquaddieID(p);
        this.drawSquaddieAttributes(p);
        this.drawNumberOfActions(p);
        this.drawSquaddieActivities(p);
        this.invalidCommandWarningTextBox.draw(p);
        this.drawDifferentSquaddieWarning(squaddieCurrentlyActing, p);
    }

    private drawSquaddieID(p: p5) {
        const {
            staticSquaddie
        } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicId));

        if (this.affiliateIcon) {
            this.affiliateIcon.draw(p);
        }

        this.squaddieIdTextBox.draw(p);
    }

    private drawNumberOfActions(p: p5) {
        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicId));
        const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie});

        p.push();

        const mainActionIconWidth: number = 25;
        const actionIconLeft: number = this._background.area.getLeft() + 20;

        p.fill("#dedede");
        p.stroke("#1f1f1f");
        const actionBackground: RectArea = new RectArea({
            left: actionIconLeft,
            height: mainActionIconWidth * 3,
            width: 40,
            top: this._background.area.getTop() + 45,
        })
        p.fill("#1f1f1f");
        p.stroke("#1f1f1f");
        p.strokeWeight(2);
        p.rect(actionBackground.getLeft(), actionBackground.getTop(), actionBackground.getWidth(), actionBackground.getHeight());

        p.fill("#dedede");
        p.rect(
            actionBackground.getLeft(),
            actionBackground.getBottom() - mainActionIconWidth * normalActionsRemaining,
            actionBackground.getWidth(),
            mainActionIconWidth * normalActionsRemaining);

        const actionLineMarking: RectArea = new RectArea({
            left: actionBackground.getLeft(),
            width: 0,
            top: actionBackground.getTop(),
            height: actionBackground.getHeight(),
        });

        [1, 2].filter(i => normalActionsRemaining >= i).forEach(i => {
            const verticalDistance: number = i * actionBackground.getHeight() / 3;
            p.line(
                actionBackground.getLeft(),
                actionLineMarking.getBottom() - verticalDistance,
                actionBackground.getRight(),
                actionLineMarking.getBottom() - verticalDistance,
            )
        });

        p.pop();
    }


    private drawSquaddieActivities(p: p5) {
        this.activityButtons.forEach((button) => {
            button.draw(p)
        });
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

    mouseClicked(mouseX: number, mouseY: number) {
        const clickedActivityButton = this.activityButtons.find((button) =>
            button.buttonArea.isInside(mouseX, mouseY)
        );

        if (!clickedActivityButton) {
            return;
        }

        const activityValidCheck = this.checkIfActivityIsValid(clickedActivityButton.activity);
        if (activityValidCheck === ActivityValidityCheck.IS_VALID) {
            this.selectedActivity = clickedActivityButton.activity;
            return;
        }
        this.warnUserNotEnoughActionsToPerformAction(clickedActivityButton.activity);
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
        })
    }

    private drawDifferentSquaddieWarning(squaddieCurrentlyActing: SquaddieInstructionInProgress, p: p5) {
        if (
            !squaddieCurrentlyActing
            || squaddieCurrentlyActing.isReadyForNewSquaddie()
        ) {
            return;
        }

        const {staticSquaddie} = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(squaddieCurrentlyActing.instruction.getDynamicSquaddieId()));
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

    private checkIfActivityIsValid(activity: SquaddieActivity | SquaddieEndTurnActivity): ActivityValidityCheck {
        if (activity instanceof SquaddieEndTurnActivity) {
            return ActivityValidityCheck.IS_VALID;
        }

        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicId));
        const {normalActionsRemaining} = GetNumberOfActions({staticSquaddie, dynamicSquaddie})

        if (normalActionsRemaining < activity.actionsToSpend) {
            return ActivityValidityCheck.SQUADDIE_DOES_NOT_HAVE_ENOUGH_ACTIONS;
        }

        return ActivityValidityCheck.IS_VALID
    }

    private drawSquaddieAttributes(p: p5) {
        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicId));

        const textSize = 16;
        const fontColor = [100, 0, 80];
        const baseRectangle = new RectArea({
            left: this.background.area.getLeft(),
            top: this.background.area.getTop(),
            width: 100,
            height: 30,
        });

        const attributeLeftOffset = 100;
        const attributeTextTopMargin = 12;
        const attributeTextLeftMargin = 56;
        const attributeIconSize = 48;

        const hitPointsInfo = GetHitPoints({staticSquaddie, dynamicSquaddie});
        const hitPointsDescription = `${hitPointsInfo.maxHitPoints}`;
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

        const iconAttempt = this.resourceHandler.getResource(iconResourceKey);
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
}
