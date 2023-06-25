import {getResultOrThrowError} from "../../utils/ResultOrError";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleCamera} from "../battleCamera";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {convertScreenCoordinatesToMapCoordinates} from "../../hexMap/convertCoordinates";

export const ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct = (state: OrchestratorState) => {
    if (state.squaddieCurrentlyActing && !state.squaddieCurrentlyActing.isReadyForNewSquaddie()) {
        const {dynamicSquaddie} = getResultOrThrowError(
            state.squaddieRepo.getSquaddieByDynamicID(state.squaddieCurrentlyActing.dynamicSquaddieId)
        );
        if (!dynamicSquaddie.squaddieTurn.hasActionsRemaining()) {
            state.squaddieCurrentlyActing.reset();
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
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
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
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
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
            staticSquaddie: undefined,
            dynamicSquaddie: undefined,
            squaddieMapLocation: undefined,
        }
    }

    const {
        staticSquaddie,
        dynamicSquaddie,
    } = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicID(squaddieAndLocationIdentifier.dynamicSquaddieId))

    return {
        staticSquaddie,
        dynamicSquaddie,
        squaddieMapLocation: squaddieAndLocationIdentifier.mapLocation,
    }
}
