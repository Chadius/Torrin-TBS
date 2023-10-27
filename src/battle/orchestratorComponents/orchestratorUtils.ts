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
        const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
            state.squaddieRepository.getSquaddieByBattleId(state.squaddieCurrentlyActing.battleSquaddieId)
        );
        const actInfo = CanSquaddieActRightNow({battleSquaddie, squaddieTemplate})
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
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(state.squaddieCurrentlyActing.battleSquaddieId));
        const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        });
        if (playerCanControlThisSquaddieRightNow) {
            state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                battleId: state.squaddieCurrentlyActing.battleSquaddieId,
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
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(state.squaddieCurrentlyActing.battleSquaddieId));
        const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie
        })
        if (playerCanControlThisSquaddieRightNow) {
            state.hexMap.stopHighlightingTiles();
            HighlightSquaddieReach(battleSquaddie, squaddieTemplate, state.pathfinder, state.missionMap, state.hexMap, state.squaddieRepository);
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
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    squaddieMapLocation: HexCoordinate,
} {
    const {
        mouseX,
        squaddieRepository,
        mouseY,
        camera,
        map,
    } = param;

    const coords = convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...camera.getCoordinates());
    const clickedLocation: HexCoordinate =
        {
            q: coords[0],
            r: coords[1],
        }
    ;

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
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
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
            squaddieTemplate: undefined,
            battleSquaddie: undefined,
            squaddieMapLocation: undefined,
        }
    }

    const {
        squaddieTemplate,
        battleSquaddie,
    } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(squaddieAndLocationIdentifier.battleSquaddieId))

    return {
        squaddieTemplate,
        battleSquaddie,
        squaddieMapLocation: squaddieAndLocationIdentifier.mapLocation,
    }
}
