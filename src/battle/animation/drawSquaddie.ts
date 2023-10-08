import {BattleSquaddie} from "../battleSquaddie";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {HEX_TILE_WIDTH, HUE_BY_SQUADDIE_AFFILIATION} from "../../graphicsConstants";
import {RectArea} from "../../ui/rectArea";
import {Rectangle} from "../../ui/rectangle";
import {BattleCamera} from "../battleCamera";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {getSquaddiePositionAlongPath, TIME_TO_MOVE} from "./squaddieMoveAnimationUtils";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {
    CanPlayerControlSquaddieRightNow,
    CanSquaddieActRightNow,
    GetNumberOfActionPoints
} from "../../squaddie/squaddieService";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

export const tintSquaddieMapIconTurnComplete = (squaddietemplate: SquaddieTemplate, dynamicSquaddie: BattleSquaddie) => {
    const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[squaddietemplate.squaddieId.affiliation];
    dynamicSquaddie.mapIcon.setTint(squaddieAffiliationHue, 50, 50, 192);
}

export const unTintSquaddieMapIcon = (squaddietemplate: SquaddieTemplate, dynamicSquaddie: BattleSquaddie) => {
    dynamicSquaddie.mapIcon.removeTint();
}

export const drawSquaddieMapIconAtMapLocation = (graphicsContext: GraphicsContext, squaddieRepo: BattleSquaddieRepository, dynamicSquaddie: BattleSquaddie, dynamicSquaddieId: string, mapLocation: HexCoordinate, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        mapLocation.q, mapLocation.r, ...camera.getCoordinates())
    setImageToLocation(dynamicSquaddie, xyCoords);
    const {squaddietemplate} = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicId(dynamicSquaddieId));
    const {
        squaddieHasThePlayerControlledAffiliation,
        squaddieCanCurrentlyAct
    } = CanPlayerControlSquaddieRightNow({squaddietemplate, dynamicSquaddie})
    const {actionPointsRemaining} = GetNumberOfActionPoints({squaddietemplate, dynamicSquaddie})
    if (squaddieHasThePlayerControlledAffiliation && squaddieCanCurrentlyAct && actionPointsRemaining < 3) {
        drawSquaddieActions(graphicsContext, squaddietemplate, dynamicSquaddie, mapLocation, camera);
    }
    dynamicSquaddie.mapIcon.draw(graphicsContext);
}

export const setImageToLocation = (
    dynamicSquaddieInfo: BattleSquaddie,
    xyCoords: [number, number]
) => {
    dynamicSquaddieInfo.assertBattleSquaddieDynamic();
    dynamicSquaddieInfo.mapIcon.area.move({left: xyCoords[0], top: xyCoords[1]});
    dynamicSquaddieInfo.mapIcon.area.align({horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});
}

export const drawSquaddieActions = (graphicsContext: GraphicsContext, squaddietemplate: SquaddieTemplate, dynamicSquaddie: BattleSquaddie, mapLocation: HexCoordinate, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        mapLocation.q, mapLocation.r, ...camera.getCoordinates())

    const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[squaddietemplate.squaddieId.affiliation];

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

    background.draw(graphicsContext);

    const {actionPointsRemaining} = GetNumberOfActionPoints({squaddietemplate, dynamicSquaddie})
    const heightFromRemainingActionPoints = actionDrawingArea.height * actionPointsRemaining / 3;
    const numberOfActionPointsArea: RectArea = new RectArea({
        top: actionDrawingArea.bottom - heightFromRemainingActionPoints,
        bottom: actionDrawingArea.bottom,
        left: actionDrawingArea.left,
        width: actionDrawingArea.width,
    });

    const numberOfActionPointsRect: Rectangle = new Rectangle({
        area: numberOfActionPointsArea,
        fillColor: [squaddieAffiliationHue, 50, 85],
    })

    numberOfActionPointsRect.draw(graphicsContext);
}

export const TintSquaddieIfTurnIsComplete = (dynamicSquaddie: BattleSquaddie, squaddietemplate: SquaddieTemplate) => {
    let {
        canAct,
    } = CanSquaddieActRightNow({
        squaddietemplate,
        dynamicSquaddie,
    });

    if (!canAct) {
        tintSquaddieMapIconTurnComplete(squaddietemplate, dynamicSquaddie)
    }
}

export const updateSquaddieIconLocation = (dynamicSquaddie: BattleSquaddie, destination: HexCoordinate, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        destination.q,
        destination.r,
        ...camera.getCoordinates()
    );
    setImageToLocation(dynamicSquaddie, xyCoords);
}

export const hasMovementAnimationFinished = (timeMovementStarted: number, squaddieMovePath: SearchPath) => {
    if (squaddieMovePath.getTilesTraveled().length <= 1) {
        return true;
    }

    if (timeMovementStarted === undefined) {
        return true;
    }

    const timePassed = Date.now() - timeMovementStarted;
    return timePassed >= TIME_TO_MOVE;
}

export const moveSquaddieAlongPath = (dynamicSquaddie: BattleSquaddie, timeMovementStarted: number, squaddieMovePath: SearchPath, camera: BattleCamera) => {
    const timePassed = Date.now() - timeMovementStarted;
    const squaddieDrawCoordinates: [number, number] = getSquaddiePositionAlongPath(
        squaddieMovePath.getTilesTraveled().map(tile => tile.hexCoordinate),
        timePassed,
        TIME_TO_MOVE,
        camera,
    )
    if (dynamicSquaddie.mapIcon) {
        setImageToLocation(dynamicSquaddie, squaddieDrawCoordinates);
    }
}
