import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {MissionMap} from "../missionMap/missionMap";
import p5 from "p5";
import {RectArea} from "../ui/rectArea";
import {Rectangle} from "../ui/rectangle";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {ScreenDimensions} from "../utils/graphicsConfig";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {ResourceHandler} from "../resource/resourceHandler";
import {ImageUI} from "../ui/imageUI";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";

export type BattleSquaddieSelectedHUDOptions = {
    squaddieRepository: BattleSquaddieRepository;
    missionMap: MissionMap;
    resourceHandler: ResourceHandler;
}

export class BattleSquaddieSelectedHUD {
    selectedSquaddieDynamicID: string;
    squaddieRepository: BattleSquaddieRepository;
    missionMap: MissionMap;
    resourceHandler: ResourceHandler;

    background: Rectangle;
    affiliateIcon?: ImageUI;

    constructor(options: BattleSquaddieSelectedHUDOptions) {
        this.squaddieRepository = options.squaddieRepository;
        this.missionMap = options.missionMap;
        this.resourceHandler = options.resourceHandler;
    }

    mouseClickedNoSquaddieSelected() {
        this.selectedSquaddieDynamicID = "";
    }

    mouseClickedSquaddieSelected(dynamicID: string, mouseX: number, mouseY: number) {
        this.selectedSquaddieDynamicID = dynamicID;

        const windowTop: number = (mouseY < (ScreenDimensions.SCREEN_HEIGHT * 0.8)) ? ScreenDimensions.SCREEN_HEIGHT * 0.8 : 10;
        const windowHeight: number = (ScreenDimensions.SCREEN_HEIGHT * 0.2) - 10;
        const windowDimensions = new RectArea({
            left: 10,
            right: ScreenDimensions.SCREEN_WIDTH - 10,
            top: windowTop,
            height: windowHeight
        });

        const {staticSquaddie} = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicID))
        const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[staticSquaddie.squaddieID.affiliation];

        this.background = new Rectangle({
            area: windowDimensions,
            fillColor: [squaddieAffiliationHue, 10, 30],
            strokeColor: [squaddieAffiliationHue, 10, 6],
            strokeWeight: 4,
        });

        let affiliateIconImage: p5.Image;
        switch(staticSquaddie.squaddieID.affiliation) {
            case SquaddieAffiliation.PLAYER:
                affiliateIconImage = getResultOrThrowError(this.resourceHandler.getResource("affiliate icon crusaders"))
                break;
            case SquaddieAffiliation.ENEMY:
                affiliateIconImage = getResultOrThrowError(this.resourceHandler.getResource("affiliate icon infiltrators"))
                break;
            case SquaddieAffiliation.ALLY:
                affiliateIconImage = getResultOrThrowError(this.resourceHandler.getResource("affiliate icon western"))
                break;
            case SquaddieAffiliation.NONE:
                affiliateIconImage = getResultOrThrowError(this.resourceHandler.getResource("affiliate icon none"))
                break;
            default:
                affiliateIconImage = null;
                break;
        }
        if (affiliateIconImage) {
            this.affiliateIcon = new ImageUI({
                graphic: affiliateIconImage,
                area: new RectArea({
                    left: this.background.area.getLeft() + 20,
                    top: this.background.area.getTop() + 10,
                    width: 32,
                    height: 32,
                })
            })
        } else {
            this.affiliateIcon = null;
        }


    }

    draw(p: p5) {
        if (!this.selectedSquaddieDynamicID) {
            return;
        }
        this.background.draw(p);
        this.drawSquaddieID(p);
        this.drawNumberOfActions(p);
    }

    private drawSquaddieID(p: p5) {
        const {
            staticSquaddie
        } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicID));

        if (this.affiliateIcon) {
            this.affiliateIcon.draw(p);
        }

        p.push();
        const textLeft: number = this.background.area.getLeft() + 60;
        const textTop: number = this.background.area.getTop() + 30;

        p.textSize(24);
        p.fill("#efefef");

        p.text(staticSquaddie.squaddieID.name, textLeft, textTop);

        p.pop();
    }

    private drawNumberOfActions(p: p5) {
        const {
            dynamicSquaddie
        } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicID));
        const numberOfGeneralActions: number = dynamicSquaddie.squaddieTurn.getRemainingActions();

        p.push();

        const mainActionIconWidth: number = 25;
        const actionIconLeft: number = this.background.area.getLeft() + 20;

        p.fill("#dedede");
        p.stroke("#1f1f1f");
        const actionBackground: RectArea = new RectArea({
            left: actionIconLeft,
            height: mainActionIconWidth * 3,
            width: 40,
            top: this.background.area.getTop() + 45,
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
}