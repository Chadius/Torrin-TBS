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
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";

export const ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct = (state: BattleOrchestratorState) => {
    if (state.battleState.squaddieCurrentlyActing
        && !SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleState.squaddieCurrentlyActing)
    ) {
        const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
            state.squaddieRepository.getSquaddieByBattleId(
                SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
            )
        );
        const actInfo = CanSquaddieActRightNow({battleSquaddie, squaddieTemplate})
        if (!actInfo.canAct) {
            state.battleState.squaddieCurrentlyActing = undefined;
        }
    }
}

export const DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation = (state: BattleOrchestratorState) => {
    if (
        state.battleState.squaddieCurrentlyActing
        && !SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleState.squaddieCurrentlyActing)
    ) {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(
            SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
        ));
        const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        });
        if (playerCanControlThisSquaddieRightNow) {
            state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
                battleId: SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing),
                state,
            });
        } else {
            state.battleSquaddieSelectedHUD.reset();
        }
    }
}

export const DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation = (state: BattleOrchestratorState) => {
    if (
        state.battleState.squaddieCurrentlyActing
        && !SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleState.squaddieCurrentlyActing)
    ) {
        const {
            squaddieTemplate,
            battleSquaddie
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(
            SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
        ));
        const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie
        })
        if (playerCanControlThisSquaddieRightNow) {
            state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
            HighlightSquaddieReach(battleSquaddie, squaddieTemplate, state.battleState.missionMap, state.battleState.missionMap.terrainTileMap, state.squaddieRepository);
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

    if (!MissionMapSquaddieLocationHandler.isValid(squaddieAndLocationIdentifier)) {
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
