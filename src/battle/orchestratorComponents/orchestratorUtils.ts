import {getResultOrThrowError} from "../../utils/ResultOrError";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleCamera} from "../battleCamera";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {convertScreenCoordinatesToMapCoordinates} from "../../hexMap/convertCoordinates";
import {CanPlayerControlSquaddieRightNow, SquaddieService} from "../../squaddie/squaddieService";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {MapHighlightHelper} from "../animation/mapHighlight";
import {isValidValue} from "../../utils/validityCheck";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ActionsThisRoundService} from "../history/actionsThisRound";
import {ProcessedActionEffect} from "../../action/processed/processedActionEffect";
import {ActionEffectType} from "../../action/template/actionEffectTemplate";

export const OrchestratorUtilities = {
    isSquaddieCurrentlyTakingATurn: (state: GameEngineState): boolean => {
        return isSquaddieCurrentlyTakingATurn(state);
    },
    getNextModeBasedOnProcessedActionEffect: (processedActionEffect: ProcessedActionEffect): BattleOrchestratorMode => {
        if (!isValidValue(processedActionEffect)) {
            return undefined;
        }

        switch (processedActionEffect.type) {
            case ActionEffectType.SQUADDIE:
                return BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE;
            case ActionEffectType.MOVEMENT:
                return BattleOrchestratorMode.SQUADDIE_MOVER;
            case ActionEffectType.END_TURN:
                return BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP;
            default:
                return undefined;
        }
    },
    resetCurrentlyActingSquaddieIfTheSquaddieCannotAct: (state: GameEngineState) => {
        return resetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    },
    drawSquaddieReachBasedOnSquaddieTurnAndAffiliation: (state: GameEngineState) => {
        return drawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state);
    },
    drawOrResetHUDBasedOnSquaddieTurnAndAffiliation: (state: GameEngineState) => {
        return DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state)
    },
    goToNextProcessedActionThisRound: (state: GameEngineState) => {
        ActionsThisRoundService.nextProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound);
        const nextProcessedActionEffectToShow = ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound);
        if (!isValidValue(nextProcessedActionEffectToShow)) {
            state.battleOrchestratorState.battleState.actionsThisRound = undefined;
        }
    }
}

const isSquaddieCurrentlyTakingATurn = (state: GameEngineState): boolean => {
    if (!isValidValue(state)) {
        return false;
    }

    if (!isValidValue(state.battleOrchestratorState)) {
        return false;
    }

    if (!isValidValue(state.battleOrchestratorState.battleState)) {
        return false;
    }

    const actionsThisRound = state.battleOrchestratorState.battleState.actionsThisRound;
    if (!isValidValue(actionsThisRound)) {
        return false;
    }

    if (!isValidValue(actionsThisRound.battleSquaddieId) || actionsThisRound.battleSquaddieId === "") {
        return false;
    }

    if (actionsThisRound.processedActions.length > 0) {
        return true;
    }

    return isValidValue(actionsThisRound.previewedActionTemplateId);
}

const resetCurrentlyActingSquaddieIfTheSquaddieCannotAct = (state: GameEngineState) => {
    if (
        !state.battleOrchestratorState.battleState.actionsThisRound
        || isSquaddieCurrentlyTakingATurn(state)
    ) {
        return;
    }
    const currentlyActingBattleSquaddieId = state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId;
    if (!isValidValue(currentlyActingBattleSquaddieId) || currentlyActingBattleSquaddieId === "") {
        return;
    }

    const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(state.repository, currentlyActingBattleSquaddieId)
    );
    const actInfo = SquaddieService.canSquaddieActRightNow({battleSquaddie, squaddieTemplate})
    if (!actInfo.canAct) {
        state.battleOrchestratorState.battleState.actionsThisRound = undefined;
    }
}

export const DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation = (state: GameEngineState) => {
    if (
        !state.battleOrchestratorState.battleState.actionsThisRound
        || !isSquaddieCurrentlyTakingATurn(state)
    ) {
        state.battleOrchestratorState.battleSquaddieSelectedHUD.reset();
        return;
    }

    const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            state.repository,
            state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId,
        )
    );

    const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
        squaddieTemplate,
        battleSquaddie,
    });
    if (playerCanControlThisSquaddieRightNow) {
        state.battleOrchestratorState.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId,
            state,
        });
    } else {
        state.battleOrchestratorState.battleSquaddieSelectedHUD.reset();
    }
}

const drawSquaddieReachBasedOnSquaddieTurnAndAffiliation = (state: GameEngineState) => {
    if (
        !state.battleOrchestratorState.battleState.actionsThisRound
        || isSquaddieCurrentlyTakingATurn(state)
    ) {
        return;
    }

    const currentlyActingBattleSquaddieId = state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId;
    if (!isValidValue(currentlyActingBattleSquaddieId) || currentlyActingBattleSquaddieId === "") {
        return;
    }

    const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(state.repository,
            state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId
        )
    );

    const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
        squaddieTemplate,
        battleSquaddie
    })
    if (playerCanControlThisSquaddieRightNow) {
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();

        const {mapLocation: startLocation} = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId)
        const squaddieReachHighlightedOnMap = MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
            repository: state.repository,
            missionMap: state.battleOrchestratorState.battleState.missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            startLocation: startLocation,
            campaignResources: state.campaign.resources,
        });

        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles(squaddieReachHighlightedOnMap);
    }
}

export function GetSquaddieAtScreenLocation(param: {
    mouseX: number;
    mouseY: number;
    squaddieRepository: ObjectRepository;
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
    squaddieRepository: ObjectRepository;
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
    } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(squaddieRepository, squaddieAndLocationIdentifier.battleSquaddieId))

    return {
        squaddieTemplate,
        battleSquaddie,
        squaddieMapLocation: squaddieAndLocationIdentifier.mapLocation,
    }
}
