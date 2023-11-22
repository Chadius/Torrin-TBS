import {BattleSquaddie} from "../battleSquaddie";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {HEX_TILE_WIDTH, HUE_BY_SQUADDIE_AFFILIATION} from "../../graphicsConstants";
import {RectArea} from "../../ui/rectArea";
import {Rectangle} from "../../ui/rectangle";
import {BattleCamera} from "../battleCamera";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {SearchPath, SearchPathHelper} from "../../hexMap/pathfinder/searchPath";
import {getSquaddiePositionAlongPath, TIME_TO_MOVE} from "./squaddieMoveAnimationUtils";
import {
    CanPlayerControlSquaddieRightNow,
    CanSquaddieActRightNow,
    GetNumberOfActionPoints
} from "../../squaddie/squaddieService";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {ImageUI} from "../../ui/imageUI";

export const tintSquaddieMapIconTurnComplete = (squaddieRepository: BattleSquaddieRepository, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie) => {
    const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation];
    const mapIcon = squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    if (mapIcon) {
        mapIcon.setTint(squaddieAffiliationHue, 50, 50, 192);
    }
}

export const unTintSquaddieMapIcon = (squaddieRepository: BattleSquaddieRepository, battleSquaddie: BattleSquaddie) => {
    const mapIcon = squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    if (mapIcon) {
        mapIcon.removeTint();
    }
}

export const drawSquaddieMapIconAtMapLocation = (graphicsContext: GraphicsContext, squaddieRepository: BattleSquaddieRepository, battleSquaddie: BattleSquaddie, battleSquaddieId: string, mapLocation: HexCoordinate, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        mapLocation.q, mapLocation.r, ...camera.getCoordinates())
    const mapIcon = squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    setImageToLocation(mapIcon, xyCoords);
    const {squaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));
    const {
        squaddieHasThePlayerControlledAffiliation,
        squaddieCanCurrentlyAct
    } = CanPlayerControlSquaddieRightNow({squaddieTemplate, battleSquaddie})
    const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
    if (squaddieHasThePlayerControlledAffiliation && squaddieCanCurrentlyAct && actionPointsRemaining < 3) {
        drawSquaddieActions(graphicsContext, squaddieTemplate, battleSquaddie, mapLocation, camera);
    }
    mapIcon.draw(graphicsContext);
}

const setImageToLocation = (
    mapIcon: ImageUI,
    xyCoords: [number, number]
) => {
    mapIcon.area.move({left: xyCoords[0], top: xyCoords[1]});
    mapIcon.area.align({horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});
}

export const drawSquaddieActions = (graphicsContext: GraphicsContext, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, mapLocation: HexCoordinate, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        mapLocation.q, mapLocation.r, ...camera.getCoordinates())

    const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation];

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

    const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
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

export const TintSquaddieIfTurnIsComplete = (squaddieRepository: BattleSquaddieRepository, battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate) => {
    let {
        canAct,
    } = CanSquaddieActRightNow({
        squaddieTemplate,
        battleSquaddie,
    });

    if (!canAct) {
        tintSquaddieMapIconTurnComplete(squaddieRepository, squaddieTemplate, battleSquaddie)
    }
}

export const updateSquaddieIconLocation = (squaddieRepository: BattleSquaddieRepository, battleSquaddie: BattleSquaddie, destination: HexCoordinate, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        destination.q,
        destination.r,
        ...camera.getCoordinates()
    );
    const mapIcon = squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    setImageToLocation(mapIcon, xyCoords);
}

export const hasMovementAnimationFinished = (timeMovementStarted: number, squaddieMovePath: SearchPath) => {
    if (SearchPathHelper.getTilesTraveled(squaddieMovePath).length <= 1) {
        return true;
    }

    if (timeMovementStarted === undefined) {
        return true;
    }

    const timePassed = Date.now() - timeMovementStarted;
    return timePassed >= TIME_TO_MOVE;
}

export const moveSquaddieAlongPath = (squaddieRepository: BattleSquaddieRepository, battleSquaddie: BattleSquaddie, timeMovementStarted: number, squaddieMovePath: SearchPath, camera: BattleCamera) => {
    const timePassed = Date.now() - timeMovementStarted;
    const squaddieDrawCoordinates: [number, number] = getSquaddiePositionAlongPath(
        SearchPathHelper.getTilesTraveled(squaddieMovePath).map(tile => tile.hexCoordinate),
        timePassed,
        TIME_TO_MOVE,
        camera,
    )
    const mapIcon = squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    if (mapIcon) {
        setImageToLocation(mapIcon, squaddieDrawCoordinates);
    }
}
