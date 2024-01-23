import {getResultOrThrowError} from "../../utils/ResultOrError";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleCamera} from "../battleCamera";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddie} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {convertScreenCoordinatesToMapCoordinates} from "../../hexMap/convertCoordinates";
import {CanPlayerControlSquaddieRightNow, SquaddieService} from "../../squaddie/squaddieService";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {
    CurrentlySelectedSquaddieDecision,
    CurrentlySelectedSquaddieDecisionService
} from "../history/currentlySelectedSquaddieDecision";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {MapHighlightHelper} from "../animation/mapHighlight";
import {isValidValue} from "../../utils/validityCheck";
import {ActionEffect, ActionEffectType} from "../../decision/actionEffect";
import {SquaddieTurnService} from "../../squaddie/turn";
import {DecisionActionEffectIteratorService} from "./decisionActionEffectIterator";
import {Decision} from "../../decision/decision";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {GameEngineState} from "../../gameEngine/gameEngine";

export const OrchestratorUtilities = {
    isSquaddieCurrentlyTakingATurn: (state: GameEngineState): boolean => {
        return isSquaddieCurrentlyTakingATurn(state);
    },
    updateSquaddieBasedOnActionEffect: ({battleSquaddieId, repository, actionEffect, missionMap}: {
        battleSquaddieId: string,
        repository: ObjectRepository,
        actionEffect: ActionEffect;
        missionMap: MissionMap
    }) => {
        const {
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieId))

        if (!isValidValue(actionEffect)) {
            return;
        }

        switch (actionEffect.type) {
            case ActionEffectType.MOVEMENT:
                missionMap.updateSquaddieLocation(battleSquaddieId, actionEffect.destination);
                SquaddieTurnService.spendActionPoints(battleSquaddie.squaddieTurn, actionEffect.numberOfActionPointsSpent);
                break;
            case ActionEffectType.SQUADDIE:
                SquaddieTurnService.spendActionPoints(battleSquaddie.squaddieTurn, actionEffect.numberOfActionPointsSpent);
                break;
            case ActionEffectType.END_TURN:
                SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn);
                break;
        }
    },
    peekActionEffect: (state: BattleOrchestratorState, currentlySelectedSquaddieDecision: CurrentlySelectedSquaddieDecision): ActionEffect => {
        return peekActionEffect(state, currentlySelectedSquaddieDecision);
    },
    nextActionEffect: (state: BattleOrchestratorState, currentlySelectedSquaddieDecision: CurrentlySelectedSquaddieDecision): ActionEffect => {
        const peekedActionEffect = peekActionEffect(state, currentlySelectedSquaddieDecision);
        const decision = CurrentlySelectedSquaddieDecisionService.peekDecision(currentlySelectedSquaddieDecision);

        maybeCreateDecisionActionEffectIterator(state, decision);
        if (!isValidValue(state.decisionActionEffectIterator)) {
            return undefined;
        }
        DecisionActionEffectIteratorService.nextActionEffect(state.decisionActionEffectIterator);
        return peekedActionEffect;
    },
    getNextModeBasedOnActionEffect: (actionEffect: ActionEffect): BattleOrchestratorMode => {
        if (!isValidValue(actionEffect)) {
            return undefined;
        }

        switch (actionEffect.type) {
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
        return ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct(state);
    },
    drawSquaddieReachBasedOnSquaddieTurnAndAffiliation: (state: GameEngineState) => {
        return DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation(state);
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

    if (!state.battleOrchestratorState.battleState.squaddieCurrentlyActing) {
        return false;
    }

    if (CurrentlySelectedSquaddieDecisionService.isDefault(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)) {
        return false;
    }

    if (CurrentlySelectedSquaddieDecisionService.hasACurrentDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)) {
        return true;
    }

    const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(state.repository,
            CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
        )
    );

    return SquaddieService.isSquaddieCurrentlyTakingATurn({
        squaddieTemplate,
        battleSquaddie,
        currentlySelectedSquaddieDecision: state.battleOrchestratorState.battleState.squaddieCurrentlyActing,
    });
}

const peekActionEffect = (state: BattleOrchestratorState, currentlySelectedSquaddieDecision: CurrentlySelectedSquaddieDecision): ActionEffect => {
    let decision = CurrentlySelectedSquaddieDecisionService.peekDecision(currentlySelectedSquaddieDecision);
    if (!isValidValue(decision)) {
        return undefined;
    }

    if (isDecisionAfterEffectIteratorStale(state, decision)) {
        state.decisionActionEffectIterator = DecisionActionEffectIteratorService.new({decision});
    }

    if (DecisionActionEffectIteratorService.hasFinishedIteratingThoughActionEffects(state.decisionActionEffectIterator)) {
        CurrentlySelectedSquaddieDecisionService.nextDecision(currentlySelectedSquaddieDecision);
        decision = CurrentlySelectedSquaddieDecisionService.peekDecision(currentlySelectedSquaddieDecision);
        maybeCreateDecisionActionEffectIterator(state, decision);
    }

    if (!isValidValue(state.decisionActionEffectIterator)) {
        return undefined;
    }

    return DecisionActionEffectIteratorService.peekActionEffect(state.decisionActionEffectIterator);
};

const isDecisionAfterEffectIteratorStale = (state: BattleOrchestratorState, decision: Decision): boolean =>
    !isValidValue(state.decisionActionEffectIterator)
    || state.decisionActionEffectIterator.decision !== decision;

const maybeCreateDecisionActionEffectIterator = (state: BattleOrchestratorState, decision: Decision) => {
    if (!isValidValue(decision)) {
        state.decisionActionEffectIterator = undefined;
        return;
    }

    if (isDecisionAfterEffectIteratorStale(state, decision)) {
        state.decisionActionEffectIterator = DecisionActionEffectIteratorService.new({decision});
    }
};

export const ResetCurrentlyActingSquaddieIfTheSquaddieCannotAct = (state: GameEngineState) => {
    if (
        !state.battleOrchestratorState.battleState.squaddieCurrentlyActing
        || isSquaddieCurrentlyTakingATurn(state)
    ) {
        return;
    }
    const currentlyActingBattleSquaddieId = CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
    if (!isValidValue(currentlyActingBattleSquaddieId) || currentlyActingBattleSquaddieId === "") {
        return;
    }

    const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(state.repository, currentlyActingBattleSquaddieId)
    );
    const actInfo = SquaddieService.canSquaddieActRightNow({battleSquaddie, squaddieTemplate})
    if (!actInfo.canAct) {
        state.battleOrchestratorState.battleState.squaddieCurrentlyActing = undefined;
    }
}

export const DrawOrResetHUDBasedOnSquaddieTurnAndAffiliation = (state: GameEngineState) => {
    if (
        !state.battleOrchestratorState.battleState.squaddieCurrentlyActing
        || !isSquaddieCurrentlyTakingATurn(state)
    ) {
        state.battleOrchestratorState.battleSquaddieSelectedHUD.reset();
        return;
    }

    const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(state.repository,
            CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
        )
    );

    const {playerCanControlThisSquaddieRightNow} = CanPlayerControlSquaddieRightNow({
        squaddieTemplate,
        battleSquaddie,
    });
    if (playerCanControlThisSquaddieRightNow) {
        state.battleOrchestratorState.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            battleId: CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing),
            state,
        });
    } else {
        state.battleOrchestratorState.battleSquaddieSelectedHUD.reset();
    }
}

export const DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation = (state: GameEngineState) => {
    if (
        !state.battleOrchestratorState.battleState.squaddieCurrentlyActing
        || isSquaddieCurrentlyTakingATurn(state)
    ) {
        return;
    }

    const currentlyActingBattleSquaddieId = CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
    if (!isValidValue(currentlyActingBattleSquaddieId) || currentlyActingBattleSquaddieId === "") {
        return;
    }

    const {battleSquaddie, squaddieTemplate} = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(state.repository,
            CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
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
