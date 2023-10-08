import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleCamera} from "../battleCamera";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {convertScreenCoordinatesToMapCoordinates} from "../../hexMap/convertCoordinates";
import {HighlightSquaddieReach} from "../animation/mapHighlight";
import {CanPlayerControlSquaddieRightNow, CanSquaddieActRightNow} from "../../squaddie/squaddieService";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

export const ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct = (state: BattleOrchestratorState) => {
    if (state.squaddieCurrentlyActing && !state.squaddieCurrentlyActing.isReadyForNewSquaddie) {
        const {dynamicSquaddie, squaddietemplate} = getResultOrThrowError(
            state.squaddieRepository.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId)
        );
        const actInfo = CanSquaddieActRightNow({dynamicSquaddie, squaddietemplate})
        if (!actInfo.canAct) {
            state.squaddieCurrentlyActing.reset();
        }
    }
}

export const DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation = (state: BattleOrchestratorState) => {
    if (
        state.squaddieCurrentlyActing
        && !state.squaddieCurrentlyActing.isReadyForNewSquaddie
    ) {
        const {
            squaddietemplate,
            dynamicSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId));
        const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
            squaddietemplate,
            dynamicSquaddie,
        });
        if (playerCanControlThisSquaddieRightNow) {
            state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                dynamicId: state.squaddieCurrentlyActing.dynamicSquaddieId,
                state,
            });
        } else {
            state.battleSquaddieSelectedHUD.reset();
        }
    }
}

export const DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation = (state: BattleOrchestratorState) => {
    if (
        state.squaddieCurrentlyActing
        && !state.squaddieCurrentlyActing.isReadyForNewSquaddie
    ) {
        const {
            squaddietemplate,
            dynamicSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId));
        const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
            squaddietemplate,
            dynamicSquaddie
        })
        if (playerCanControlThisSquaddieRightNow) {
            state.hexMap.stopHighlightingTiles();
            HighlightSquaddieReach(dynamicSquaddie, squaddietemplate, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepository);
        }
    }
}

export function GetSquaddieAtScreenLocation(param: {
    mouseX: number;
    mouseY: number;
    squaddieRepository: BattleSquaddieRepository;
    camera: BattleCamera;
    map: MissionMap
}): {
    squaddietemplate: SquaddieTemplate,
    dynamicSquaddie: BattleSquaddie,
    squaddieMapLocation: HexCoordinate,
} {
    const {
        mouseX,
        squaddieRepository,
        mouseY,
        camera,
        map,
    } = param;

    const clickedLocation =
        new HexCoordinate(
            {
                coordinates: convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...camera.getCoordinates())
            }
        );

    return GetSquaddieAtMapLocation({
        mapLocation: clickedLocation,
        squaddieRepository,
        map,
    });
}

export function GetSquaddieAtMapLocation(param: {
    mapLocation: HexCoordinate;
    squaddieRepository: BattleSquaddieRepository;
    map: MissionMap
}): {
    squaddietemplate: SquaddieTemplate,
    dynamicSquaddie: BattleSquaddie,
    squaddieMapLocation: HexCoordinate,
} {
    const {
        mapLocation,
        squaddieRepository,
        map,
    } = param;

    const squaddieAndLocationIdentifier = map.getSquaddieAtLocation(mapLocation);

    if (!squaddieAndLocationIdentifier.isValid()) {
        return {
            squaddietemplate: undefined,
            dynamicSquaddie: undefined,
            squaddieMapLocation: undefined,
        }
    }

    const {
        squaddietemplate,
        dynamicSquaddie,
    } = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(squaddieAndLocationIdentifier.dynamicSquaddieId))

    return {
        squaddietemplate,
        dynamicSquaddie,
        squaddieMapLocation: squaddieAndLocationIdentifier.mapLocation,
    }
}
