import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {MissionMap} from "../missionMap/missionMap";
import p5 from "p5";
import {RectArea} from "../ui/rectArea";
import {SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {Rectangle} from "../ui/rectangle";
import {getResultOrThrowError} from "../utils/ResultOrError";

export type BattleSquaddieSelectedHUDOptions = {
    squaddieRepository: BattleSquaddieRepository;
    missionMap: MissionMap;
}

export class BattleSquaddieSelectedHUD {
    selectedSquaddieDynamicID: string;
    squaddieRepository: BattleSquaddieRepository;
    missionMap: MissionMap;

    background: Rectangle;

    constructor(options: BattleSquaddieSelectedHUDOptions) {
        this.squaddieRepository = options.squaddieRepository;
        this.missionMap = options.missionMap;
    }

    mouseClickedNoSquaddieSelected() {
        this.selectedSquaddieDynamicID = "";
    }

    mouseClickedSquaddieSelected(dynamicID: string, mouseX: number, mouseY: number) {
        this.selectedSquaddieDynamicID = dynamicID;

        const windowTop: number = (mouseY < (SCREEN_HEIGHT * 0.8)) ? SCREEN_HEIGHT * 0.8 : 10;
        const windowHeight: number = (SCREEN_HEIGHT * 0.2) - 10;
        const windowDimensions = new RectArea({
            left: 10,
            right: SCREEN_WIDTH - 10,
            top: windowTop,
            height: windowHeight
        });
        this.background = new Rectangle({
            area: windowDimensions,
            fillColor: [100, 10, 30],
            strokeColor: [100, 10, 6],
            strokeWeight: 8,
        });
    }

    draw(p: p5) {
        if (!this.selectedSquaddieDynamicID) {
            return;
        }
        this.background.draw(p);
        this.drawNumberOfActions(p);
    }

    private drawNumberOfActions(p: p5) {
        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicID(this.selectedSquaddieDynamicID));
        const numberOfGeneralActions: number = dynamicSquaddie.squaddieTurn.getRemainingActions();

        p.push();

        const textLeft: number = this.background.area.getLeft() + 10;
        const textTop: number = this.background.area.getTop() + 30;


        p.textSize(24);
        p.text(staticSquaddie.squaddieID.name, textLeft, textTop);

        const actionIconGap: number = 5;
        const mainActionIconWidth: number = 50;
        const actionIconCenter: number = this.background.area.getTop() + 40 + mainActionIconWidth;
        const actionIconLeft: number = this.background.area.getLeft() + mainActionIconWidth;

        p.fill("#dedede");
        p.stroke("#1f1f1f");
        for (let i = 0; i < numberOfGeneralActions; i++) {
            p.circle(actionIconLeft + (i * (mainActionIconWidth + actionIconGap)), actionIconCenter, mainActionIconWidth);
        }
        p.pop();
    }
}