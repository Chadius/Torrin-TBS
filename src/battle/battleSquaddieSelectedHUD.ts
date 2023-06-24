import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {MissionMap} from "../missionMap/missionMap";
import p5 from "p5";
import {HorizontalAnchor, RectArea, VerticalAnchor} from "../ui/rectArea";
import {Rectangle} from "../ui/rectangle";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {ScreenDimensions} from "../utils/graphicsConfig";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {ResourceHandler} from "../resource/resourceHandler";
import {ImageUI} from "../ui/imageUI";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {ActivityButton} from "../squaddie/activityButton";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieActivity} from "../squaddie/activity";
import {SquaddieEndTurnActivity} from "./history/squaddieEndTurnActivity";

export type BattleSquaddieSelectedHUDOptions = {
    squaddieRepository: BattleSquaddieRepository;
    missionMap: MissionMap;
    resourceHandler: ResourceHandler;
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

    constructor(options: BattleSquaddieSelectedHUDOptions) {
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

    mouseClickedSquaddieSelected(dynamicID: string, mouseX: number, mouseY: number) {
        this.selectedSquaddieDynamicId = dynamicID;

        const {windowDimensions} = this.createWindowPosition(mouseY);

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

    draw(p: p5) {
        if (!this.shouldDrawTheHUD()) {
            return;
        }
        this._background.draw(p);
        this.drawSquaddieID(p);
        this.drawNumberOfActions(p);
        this.drawSquaddieActivities(p);
    }

    private drawSquaddieID(p: p5) {
        const {
            staticSquaddie
        } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicId));

        if (this.affiliateIcon) {
            this.affiliateIcon.draw(p);
        }

        p.push();
        const textLeft: number = this._background.area.getLeft() + 60;
        const textTop: number = this._background.area.getTop() + 30;

        p.textSize(24);
        p.fill("#efefef");

        p.text(staticSquaddie.squaddieId.name, textLeft, textTop);

        p.pop();
    }

    private drawNumberOfActions(p: p5) {
        const {
            dynamicSquaddie
        } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicId));
        const numberOfGeneralActions: number = dynamicSquaddie.squaddieTurn.getRemainingActions();

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
            actionBackground.getBottom() - mainActionIconWidth * numberOfGeneralActions,
            actionBackground.getWidth(),
            mainActionIconWidth * numberOfGeneralActions);

        const actionLineMarking: RectArea = new RectArea({
            left: actionBackground.getLeft(),
            width: 0,
            top: actionBackground.getTop(),
            height: actionBackground.getHeight(),
        });

        [1, 2].filter(i => numberOfGeneralActions >= i).forEach(i => {
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

        this.selectedActivity = clickedActivityButton.activity;
    }

    reset() {
        this.selectedSquaddieDynamicId = "";
        this._background = undefined;
        this.affiliateIcon = undefined;
        this.selectedActivity = undefined;
        this.activityButtons = undefined;
    }
}
