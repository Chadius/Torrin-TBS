import p5 from "p5";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {convertMapCoordinatesToScreenCoordinates} from "../hexMap/convertCoordinates";
import {HEX_TILE_WIDTH, HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {RectArea} from "../ui/rectArea";
import {Rectangle} from "../ui/rectangle";
import {BattleCamera} from "./battleCamera";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../ui/constants";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";

export const tintSquaddieMapIconTurnComplete = (staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic) => {
    const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[staticSquaddie.squaddieId.affiliation];
    dynamicSquaddie.mapIcon.setTint(squaddieAffiliationHue, 50, 50, 192);
}

export const drawSquaddieMapIconAtMapLocation = (p: p5, squaddieRepo: BattleSquaddieRepository, dynamicSquaddie: BattleSquaddieDynamic, dynamicSquaddieId: string, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        dynamicSquaddie.mapLocation.q, dynamicSquaddie.mapLocation.r, ...camera.getCoordinates())
    setImageToLocation(dynamicSquaddie, xyCoords);
    const {staticSquaddie} = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicID(dynamicSquaddieId));
    if (staticSquaddie.squaddieId.affiliation === SquaddieAffiliation.PLAYER) {
        drawSquaddieActions(p, staticSquaddie, dynamicSquaddie, camera);
    }
    dynamicSquaddie.mapIcon.draw(p);
}

export const setImageToLocation = (
    dynamicSquaddieInfo: BattleSquaddieDynamic,
    xyCoords: [number, number]
) => {
    dynamicSquaddieInfo.assertBattleSquaddieDynamic();
    dynamicSquaddieInfo.mapIcon.area.setRectLeft({left: xyCoords[0]});
    dynamicSquaddieInfo.mapIcon.area.setRectTop({top: xyCoords[1]});
    dynamicSquaddieInfo.mapIcon.area.align({horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});
}

export const drawSquaddieActions = (p: p5, staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        dynamicSquaddie.mapLocation.q, dynamicSquaddie.mapLocation.r, ...camera.getCoordinates())

    const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[staticSquaddie.squaddieId.affiliation];

    const actionDrawingArea: RectArea = new RectArea({
        left: xyCoords[0] - (HEX_TILE_WIDTH * 0.40),
        top: xyCoords[1] - (HEX_TILE_WIDTH * 0.25),
        width: HEX_TILE_WIDTH * 0.15,
        height: HEX_TILE_WIDTH * 0.45,
    });

    const background: Rectangle = new Rectangle({
        area: actionDrawingArea,
        fillColor: [squaddieAffiliationHue, 10, 5],
        strokeWeight: 0,
    })

    background.draw(p);

    const heightFromRemainingActions = actionDrawingArea.getHeight() * dynamicSquaddie.squaddieTurn.getRemainingActions() / 3;
    const numberOfActionsArea: RectArea = new RectArea({
        top: actionDrawingArea.getBottom() - heightFromRemainingActions,
        bottom: actionDrawingArea.getBottom(),
        left: actionDrawingArea.getLeft(),
        width: actionDrawingArea.getWidth(),
    });

    const numberOfActionsRect: Rectangle = new Rectangle({
        area: numberOfActionsArea,
        fillColor: [squaddieAffiliationHue, 50, 85],
    })

    numberOfActionsRect.draw(p);
}
