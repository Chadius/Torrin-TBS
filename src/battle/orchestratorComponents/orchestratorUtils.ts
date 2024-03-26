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
        return drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(state)
    },
    clearActionsThisRoundIfSquaddieCannotAct: (gameEngineState: GameEngineState) => {
        if (!
            (
                isValidValue(gameEngineState)
                && isValidValue(gameEngineState.battleOrchestratorState)
                && isValidValue(gameEngineState.battleOrchestratorState.battleState)
                && isValidValue(gameEngineState.battleOrchestratorState.battleState.actionsThisRound)
            )
        ) {
            return;
        }

        const actionsThisRound = gameEngineState.battleOrchestratorState.battleState.actionsThisRound;
        const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                actionsThisRound.battleSquaddieId,
            )
        );

        const {
            canAct
        } = SquaddieService.canSquaddieActRightNow({
            squaddieTemplate: squaddieTemplate,
            battleSquaddie: battleSquaddie
        });

        if (canAct) {
            return;
        }

        gameEngineState.battleOrchestratorState.battleState.actionsThisRound = undefined;
    },
    highlightSquaddieRange: (gameEngineState: GameEngineState, battleSquaddieId: string) => {
        return highlightSquaddieRange(gameEngineState, battleSquaddieId);
    },
    getSquaddieAtScreenLocation: ({
                                      mouseX,
                                      mouseY,
                                      squaddieRepository,
                                      camera,
                                      map,
                                  }: {
        mouseX: number;
        mouseY: number;
        squaddieRepository: ObjectRepository;
        camera: BattleCamera;
        map: MissionMap
    }): {
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
        squaddieMapLocation: HexCoordinate,
    } => {
        return getSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            squaddieRepository,
            camera,
            map,
        });
    },
    getSquaddieAtMapLocation: ({
                                   mapLocation,
                                   squaddieRepository,
                                   map,
                               }: {
        mapLocation: HexCoordinate;
        squaddieRepository: ObjectRepository;
        map: MissionMap
    }) => {
        return getSquaddieAtMapLocation({
            mapLocation,
            squaddieRepository,
            map,
        });
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

const resetCurrentlyActingSquaddieIfTheSquaddieCannotAct = (gameEngineState: GameEngineState) => {
    if (
        !gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        || isSquaddieCurrentlyTakingATurn(gameEngineState)
    ) {
        return;
    }
    const currentlyActingBattleSquaddieId = gameEngineState.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId;
    if (!isValidValue(currentlyActingBattleSquaddieId) || currentlyActingBattleSquaddieId === "") {
        return;
    }

    const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(gameEngineState.repository, currentlyActingBattleSquaddieId)
    );
    const actInfo = SquaddieService.canSquaddieActRightNow({battleSquaddie, squaddieTemplate})
    if (!actInfo.canAct) {
        gameEngineState.battleOrchestratorState.battleState.actionsThisRound = undefined;
    }
}

const drawOrResetHUDBasedOnSquaddieTurnAndAffiliation = (state: GameEngineState) => {
    if (
        !state.battleOrchestratorState.battleState.actionsThisRound
        || !isSquaddieCurrentlyTakingATurn(state)
    ) {
        state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.reset();
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
        state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId,
            state,
        });
    } else {
        state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.reset();
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

const getSquaddieAtScreenLocation = (param: {
    mouseX: number;
    mouseY: number;
    squaddieRepository: ObjectRepository;
    camera: BattleCamera;
    map: MissionMap
}): {
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    squaddieMapLocation: HexCoordinate,
} => {
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

    return getSquaddieAtMapLocation({
        mapLocation: clickedLocation,
        squaddieRepository,
        map,
    });
};

const getSquaddieAtMapLocation = (param: {
    mapLocation: HexCoordinate;
    squaddieRepository: ObjectRepository;
    map: MissionMap
}): {
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    squaddieMapLocation: HexCoordinate,
} => {
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
};

const highlightSquaddieRange = (state: GameEngineState, battleSquaddieToHighlightId: string) => {
    const {mapLocation: startLocation} = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(battleSquaddieToHighlightId)

    const {
        battleSquaddie,
    } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository, battleSquaddieToHighlightId));

    state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
    const squaddieReachHighlightedOnMap = MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
        repository: state.repository,
        missionMap: state.battleOrchestratorState.battleState.missionMap,
        battleSquaddieId: battleSquaddie.battleSquaddieId,
        startLocation: startLocation,
        campaignResources: state.campaign.resources,
    })
    state.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles(squaddieReachHighlightedOnMap);
};
