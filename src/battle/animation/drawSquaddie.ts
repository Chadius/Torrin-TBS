import {BattleSquaddie} from "../battleSquaddie";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {HEX_TILE_WIDTH, HUE_BY_SQUADDIE_AFFILIATION} from "../../graphicsConstants";
import {RectArea, RectAreaService} from "../../ui/rectArea";
import {Rectangle, RectangleHelper} from "../../ui/rectangle";
import {BattleCamera} from "../battleCamera";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {SearchPath, SearchPathHelper} from "../../hexMap/pathfinder/searchPath";
import {getSquaddiePositionAlongPath, TIME_TO_MOVE} from "./squaddieMoveAnimationUtils";
import {
    CanPlayerControlSquaddieRightNow,
    GetNumberOfActionPoints,
    SquaddieService
} from "../../squaddie/squaddieService";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {ImageUI} from "../../ui/imageUI";
import {MissionMap, MissionMapService} from "../../missionMap/missionMap";
import {MapHighlightHelper} from "./mapHighlight";

export const DrawSquaddieUtilities = {
    tintSquaddieMapIcon: ({
                              repository,
                              battleSquaddieId,
                          }: {
        repository: ObjectRepository,
        battleSquaddieId: string
    }) => {
        const {
            battleSquaddie,
            squaddieTemplate
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieId));
        return tintSquaddieMapIcon(repository, squaddieTemplate, battleSquaddie);
    },
    highlightSquaddieRange: ({missionMap, battleSquaddieId, repository}: {
        missionMap: MissionMap,
        battleSquaddieId: string,
        repository: ObjectRepository
    }) => {
        const {mapLocation} = MissionMapService.getByBattleSquaddieId(missionMap, battleSquaddieId);
        const squaddieReachHighlightedOnMap = MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
            repository: repository,
            missionMap,
            battleSquaddieId,
            startLocation: mapLocation,
        })
        missionMap.terrainTileMap.highlightTiles(squaddieReachHighlightedOnMap);
    },
    updateSquaddieIconLocation: ({
                                     repository,
                                     battleSquaddieId,
                                     destination,
                                     camera,
                                 }: {
        repository: ObjectRepository,
        battleSquaddieId: string,
        destination: HexCoordinate,
        camera: BattleCamera
    }) => {
        const {battleSquaddie} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieId));
        return updateSquaddieIconLocation(repository, battleSquaddie, destination, camera);
    },
    highlightPlayableSquaddieReachIfTheyCanAct: (battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, missionMap: MissionMap, repository: ObjectRepository) => {
        return highlightPlayableSquaddieReachIfTheyCanAct(battleSquaddie, squaddieTemplate, missionMap, repository);
    },
    tintSquaddieMapIconIfTheyCannotAct: (battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, repository: ObjectRepository) => {
        return tintSquaddieMapIconIfTheyCannotAct(battleSquaddie, squaddieTemplate, repository);
    },
    drawSquaddieMapIconAtMapLocation: (graphicsContext: GraphicsContext, squaddieRepository: ObjectRepository, battleSquaddie: BattleSquaddie, battleSquaddieId: string, mapLocation: HexCoordinate, camera: BattleCamera) => {
        return drawSquaddieMapIconAtMapLocation(graphicsContext, squaddieRepository, battleSquaddie, battleSquaddieId, mapLocation, camera);
    },
}

const tintSquaddieMapIcon = (squaddieRepository: ObjectRepository, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie) => {
    const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation];
    const mapIcon = squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    if (mapIcon) {
        mapIcon.setTint(squaddieAffiliationHue, 50, 50, 192);
    }
}

export const unTintSquaddieMapIcon = (squaddieRepository: ObjectRepository, battleSquaddie: BattleSquaddie) => {
    const mapIcon = squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    if (mapIcon) {
        mapIcon.removeTint();
    }
}

const drawSquaddieMapIconAtMapLocation = (graphicsContext: GraphicsContext, squaddieRepository: ObjectRepository, battleSquaddie: BattleSquaddie, battleSquaddieId: string, mapLocation: HexCoordinate, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        mapLocation.q, mapLocation.r, ...camera.getCoordinates())
    const mapIcon = squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    setImageToLocation(mapIcon, xyCoords);
    const {squaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, battleSquaddieId));
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
    RectAreaService.move(mapIcon.area, {left: xyCoords[0], top: xyCoords[1]});
    RectAreaService.align(mapIcon.area, {horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});
}

export const drawSquaddieActions = (graphicsContext: GraphicsContext, squaddieTemplate: SquaddieTemplate, battleSquaddie: BattleSquaddie, mapLocation: HexCoordinate, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        mapLocation.q, mapLocation.r, ...camera.getCoordinates())

    const squaddieAffiliationHue: number = HUE_BY_SQUADDIE_AFFILIATION[squaddieTemplate.squaddieId.affiliation];

    const actionDrawingArea: RectArea = RectAreaService.new({
        left: xyCoords[0] - (HEX_TILE_WIDTH * 0.40),
        top: xyCoords[1] - (HEX_TILE_WIDTH * 0.25),
        width: HEX_TILE_WIDTH * 0.15,
        height: HEX_TILE_WIDTH * 0.45,
    });

    const background: Rectangle = RectangleHelper.new({
        area: actionDrawingArea,
        fillColor: [squaddieAffiliationHue, 10, 5],
        strokeWeight: 0,
    })

    RectangleHelper.draw(background, graphicsContext);

    const {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
    const heightFromRemainingActionPoints = actionDrawingArea.height * actionPointsRemaining / 3;
    const numberOfActionPointsArea: RectArea = RectAreaService.new({
        top: RectAreaService.bottom(actionDrawingArea) - heightFromRemainingActionPoints,
        bottom: RectAreaService.bottom(actionDrawingArea),
        left: actionDrawingArea.left,
        width: actionDrawingArea.width,
    });

    const numberOfActionPointsRect: Rectangle = RectangleHelper.new({
        area: numberOfActionPointsArea,
        fillColor: [squaddieAffiliationHue, 50, 85],
    })

    RectangleHelper.draw(numberOfActionPointsRect, graphicsContext);
}

export const updateSquaddieIconLocation = (squaddieRepository: ObjectRepository, battleSquaddie: BattleSquaddie, destination: HexCoordinate, camera: BattleCamera) => {
    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        destination.q,
        destination.r,
        ...camera.getCoordinates()
    );
    const mapIcon = squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    setImageToLocation(mapIcon, xyCoords);
}

export const hasMovementAnimationFinished = (timeMovementStarted: number, squaddieMovePath: SearchPath) => {
    if (SearchPathHelper.getLocations(squaddieMovePath).length <= 1) {
        return true;
    }

    if (timeMovementStarted === undefined) {
        return true;
    }

    const timePassed = Date.now() - timeMovementStarted;
    return timePassed >= TIME_TO_MOVE;
}

export const moveSquaddieAlongPath = (squaddieRepository: ObjectRepository, battleSquaddie: BattleSquaddie, timeMovementStarted: number, squaddieMovePath: SearchPath, camera: BattleCamera) => {
    const timePassed = Date.now() - timeMovementStarted;
    const squaddieDrawCoordinates: [number, number] = getSquaddiePositionAlongPath(
        SearchPathHelper.getLocations(squaddieMovePath).map(tile => tile.hexCoordinate),
        timePassed,
        TIME_TO_MOVE,
        camera,
    )
    const mapIcon = squaddieRepository.imageUIByBattleSquaddieId[battleSquaddie.battleSquaddieId];
    if (mapIcon) {
        setImageToLocation(mapIcon, squaddieDrawCoordinates);
    }
}

const highlightPlayableSquaddieReachIfTheyCanAct = (battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, missionMap: MissionMap, repository: ObjectRepository) => {
    let {
        canAct,
    } = SquaddieService.canSquaddieActRightNow({
        squaddieTemplate,
        battleSquaddie,
    });

    let {squaddieHasThePlayerControlledAffiliation} =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        });

    if (!canAct || !squaddieHasThePlayerControlledAffiliation) {
        return;
    }

    DrawSquaddieUtilities.highlightSquaddieRange({
        missionMap: missionMap,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository: repository,
    });
}

const tintSquaddieMapIconIfTheyCannotAct = (battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, repository: ObjectRepository) => {
    let {
        canAct,
    } = SquaddieService.canSquaddieActRightNow({
        squaddieTemplate,
        battleSquaddie,
    });

    if (canAct) {
        return;
    }

    DrawSquaddieUtilities.tintSquaddieMapIcon({
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        repository,
    })
}
