import { StateMachine } from "../../../utils/stateMachine/stateMachine"
import {
    StateMachineData,
    StateMachineDataService,
} from "../../../utils/stateMachine/stateMachineData/stateMachineData"
import { StateMachineStateData } from "../../../utils/stateMachine/stateMachineData/stateMachineStateData"
import { StateMachineTransitionData } from "../../../utils/stateMachine/stateMachineData/stateMachineTransitionData"
import {
    TargetingResults,
    TargetingResultsService,
} from "../../targeting/targetingService"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { getResultOrThrowError } from "../../../utils/resultOrError"
import { ObjectRepositoryService } from "../../objectRepository"
import { MissionMapService } from "../../../missionMap/missionMap"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
    TOrchestratorComponentMouseEventType,
} from "../../orchestrator/battleOrchestratorComponent"
import {
    PlayerInputAction,
    PlayerInputStateService,
} from "../../../ui/playerInput/playerInputState"
import { PlayerActionTargetStateMachineContext } from "./playerActionTargetStateMachineContext"
import { PlayerActionTargetStateMachineUIObjects } from "./playerActionTargetStateMachineUIObjects"
import { PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID } from "./playerActionConfirm/okButton"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { Button } from "../../../ui/button/button"
import { PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID } from "./playerActionConfirm/cancelButton"
import { MouseButton } from "../../../utils/mouseConfig"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../../../action/template/actionEffectTemplate"
import { SquaddieAffiliationService } from "../../../squaddie/squaddieAffiliation"
import { CanHealTargetCheck } from "../../actionValidity/canHealTargetCheck"
import { CanAddModifiersCheck } from "../../actionValidity/canAddModifiersCheck"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { PLAYER_ACTION_SELECT_TARGET_CREATE_CANCEL_BUTTON_ID } from "./playerActionTarget/cancelButton"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../../hexMap/hexCoordinate/hexCoordinate"
import { Label } from "../../../ui/label"
import { MissionMapSquaddieCoordinateService } from "../../../missionMap/squaddieCoordinate"
import { EnumLike } from "../../../utils/enum"

export const PlayerActionTargetStateEnum = {
    UNKNOWN: "UNKNOWN",
    INITIALIZED: "INITIALIZED",
    WAITING_FOR_PLAYER_TO_SELECT_TARGET: "WAITING_FOR_PLAYER_TO_SELECT_TARGET",
    COUNT_TARGETS: "COUNT_TARGETS",
    WAITING_FOR_PLAYER_CONFIRM: "WAITING_FOR_PLAYER_CONFIRM",
    CANCEL_ACTION_SELECTION: "CANCEL_ACTION_SELECTION",
    CONFIRM_ACTION_SELECTION: "CONFIRM_ACTION_SELECTION",
} as const satisfies Record<string, string>

export type TPlayerActionTargetState = EnumLike<
    typeof PlayerActionTargetStateEnum
>

export const PlayerActionTargetTransitionEnum = {
    UNKNOWN: "UNKNOWN",
    INITIALIZED: "INITIALIZED",
    MULTIPLE_TARGETS_FOUND: "MULTIPLE_TARGETS_FOUND",
    NO_TARGETS_FOUND: "NO_TARGETS_FOUND",
    TARGETS_AUTOMATICALLY_SELECTED: "TARGETS_AUTOMATICALLY_SELECTED",
    PLAYER_CONSIDERS_TARGET_SELECTION: "PLAYER_CONSIDERS_TARGET_SELECTION",
    PLAYER_CONFIRMS_TARGET_SELECTION: "PLAYER_CONFIRMS_TARGET_SELECTION",
    PLAYER_CANCELS_ACTION_SELECTION: "PLAYER_CANCELS_ACTION_SELECTION",
    PLAYER_CANCELS_TARGET_SELECTION: "PLAYER_CANCELS_TARGET_SELECTION",
} as const satisfies Record<string, string>

export type PlayerActionTargetTransitionType = EnumLike<
    typeof PlayerActionTargetTransitionEnum
>

export const PlayerActionTargetActionEnum = {
    UNKNOWN: "UNKNOWN",
    COUNT_TARGETS_ENTRY: "COUNT_TARGETS_ENTRY",
    WAITING_FOR_PLAYER_TO_SELECT_TARGET: "WAITING_FOR_PLAYER_TO_SELECT_TARGET",
    WAITING_FOR_PLAYER_CONFIRM: "WAITING_FOR_PLAYER_CONFIRM",
    TRIGGER_TARGETS_AUTOMATICALLY_SELECTED:
        "TRIGGER_TARGET_AUTOMATICALLY_SELECTED",
    TRIGGER_PLAYER_CONSIDERS_TARGET_SELECTION:
        "TRIGGER_PLAYER_CONSIDERS_TARGET_SELECTION",
    TRIGGER_PLAYER_CONFIRMS_ACTION_SELECTION:
        "TRIGGER_PLAYER_CONFIRMS_ACTION_SELECTION",
    TRIGGER_PLAYER_CANCELS_ACTION_SELECTION:
        "TRIGGER_PLAYER_CANCELS_ACTION_SELECTION",
    CANCEL_ACTION_SELECTION_ENTRY: "CANCEL_ACTION_SELECTION_ENTRY",
    CONFIRM_ACTION_SELECTION_ENTRY: "CONFIRM_ACTION_SELECTION_ENTRY",
    TRIGGER_PLAYER_CANCELS_TARGET_SELECTION:
        "TRIGGER_PLAYER_CANCELS_TARGET_SELECTION",
} as const satisfies Record<string, string>

export type PlayerActionTargetActionType = EnumLike<
    typeof PlayerActionTargetActionEnum
>

export const PlayerActionTargetStateMachineInfoByState: {
    [s in TPlayerActionTargetState]?: StateMachineStateData<
        PlayerActionTargetTransitionType,
        PlayerActionTargetActionType
    >
} = {
    [PlayerActionTargetStateEnum.INITIALIZED]: {
        actions: [],
        entryAction: undefined,
        exitAction: undefined,
        transitions: [PlayerActionTargetTransitionEnum.INITIALIZED],
    },
    [PlayerActionTargetStateEnum.COUNT_TARGETS]: {
        actions: [],
        entryAction: PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY,
        exitAction: undefined,
        transitions: [
            PlayerActionTargetTransitionEnum.MULTIPLE_TARGETS_FOUND,
            PlayerActionTargetTransitionEnum.TARGETS_AUTOMATICALLY_SELECTED,
            PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND,
        ],
    },
    [PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM]: {
        actions: [PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM],
        entryAction: undefined,
        exitAction: undefined,
        transitions: [
            PlayerActionTargetTransitionEnum.PLAYER_CONFIRMS_TARGET_SELECTION,
            PlayerActionTargetTransitionEnum.PLAYER_CANCELS_TARGET_SELECTION,
            PlayerActionTargetTransitionEnum.PLAYER_CANCELS_ACTION_SELECTION,
        ],
    },
    [PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET]: {
        actions: [
            PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET,
        ],
        entryAction: undefined,
        exitAction: undefined,
        transitions: [
            PlayerActionTargetTransitionEnum.PLAYER_CONSIDERS_TARGET_SELECTION,
            PlayerActionTargetTransitionEnum.PLAYER_CANCELS_ACTION_SELECTION,
        ],
    },
    [PlayerActionTargetStateEnum.CANCEL_ACTION_SELECTION]: {
        actions: [],
        entryAction: PlayerActionTargetActionEnum.CANCEL_ACTION_SELECTION_ENTRY,
        exitAction: undefined,
        transitions: [],
    },
    [PlayerActionTargetStateEnum.CONFIRM_ACTION_SELECTION]: {
        actions: [],
        entryAction:
            PlayerActionTargetActionEnum.CONFIRM_ACTION_SELECTION_ENTRY,
        exitAction: undefined,
        transitions: [],
    },
}

export const PlayerActionTargetStateMachineInfoByTransition: {
    [t in PlayerActionTargetTransitionType]?: StateMachineTransitionData<
        TPlayerActionTargetState,
        PlayerActionTargetActionType
    >
} = {
    [PlayerActionTargetTransitionEnum.INITIALIZED]: {
        targetedState: PlayerActionTargetStateEnum.COUNT_TARGETS,
        action: undefined,
    },
    [PlayerActionTargetTransitionEnum.MULTIPLE_TARGETS_FOUND]: {
        targetedState:
            PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET,
        action: PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET,
    },
    [PlayerActionTargetTransitionEnum.PLAYER_CANCELS_TARGET_SELECTION]: {
        targetedState:
            PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET,
        action: PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_TARGET_SELECTION,
    },
    [PlayerActionTargetTransitionEnum.PLAYER_CONSIDERS_TARGET_SELECTION]: {
        targetedState: PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM,
        action: PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONSIDERS_TARGET_SELECTION,
    },
    [PlayerActionTargetTransitionEnum.TARGETS_AUTOMATICALLY_SELECTED]: {
        targetedState: PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM,
        action: PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED,
    },
    [PlayerActionTargetTransitionEnum.PLAYER_CONFIRMS_TARGET_SELECTION]: {
        targetedState: PlayerActionTargetStateEnum.CONFIRM_ACTION_SELECTION,
        action: PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONFIRMS_ACTION_SELECTION,
    },
    [PlayerActionTargetTransitionEnum.PLAYER_CANCELS_ACTION_SELECTION]: {
        targetedState: PlayerActionTargetStateEnum.CANCEL_ACTION_SELECTION,
        action: PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION,
    },
    [PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND]: {
        targetedState: PlayerActionTargetStateEnum.CANCEL_ACTION_SELECTION,
        action: PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION,
    },
}

export class PlayerActionTargetStateMachine extends StateMachine<
    TPlayerActionTargetState,
    PlayerActionTargetTransitionType,
    PlayerActionTargetActionType,
    PlayerActionTargetStateMachineContext
> {
    uiObjects: PlayerActionTargetStateMachineUIObjects | undefined

    constructor({
        id,
        context,
        stateMachineData,
    }: {
        id: string
        context: PlayerActionTargetStateMachineContext
        stateMachineData: StateMachineData<
            TPlayerActionTargetState,
            PlayerActionTargetTransitionType,
            PlayerActionTargetActionType,
            PlayerActionTargetStateMachineContext
        >
    }) {
        super({ id, stateMachineData, worldData: context })
    }

    setTransitionTriggerFunctions() {
        StateMachineDataService.setTransitionTriggerFunctions(
            this.stateMachineData,
            {
                [PlayerActionTargetTransitionEnum.INITIALIZED]: (_) =>
                    this.currentState ==
                    PlayerActionTargetStateEnum.INITIALIZED,
                [PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND]: (
                    context: PlayerActionTargetStateMachineContext
                ) =>
                    context.targetResults.validTargets != undefined &&
                    Object.keys(context.targetResults.validTargets).length == 0,
                [PlayerActionTargetTransitionEnum.MULTIPLE_TARGETS_FOUND]: (
                    context: PlayerActionTargetStateMachineContext
                ) =>
                    context.targetResults.validTargets != undefined &&
                    Object.keys(context.targetResults.validTargets).length > 1,
                [PlayerActionTargetTransitionEnum.TARGETS_AUTOMATICALLY_SELECTED]:
                    (context: PlayerActionTargetStateMachineContext) =>
                        context.targetResults.validTargets != undefined &&
                        Object.keys(context.targetResults.validTargets)
                            .length == 1,
                [PlayerActionTargetTransitionEnum.PLAYER_CONSIDERS_TARGET_SELECTION]:
                    (context: PlayerActionTargetStateMachineContext) =>
                        context.playerIntent.targetSelection.battleSquaddieIds
                            .length > 0 &&
                        !context.playerIntent.targetConfirmed,
                [PlayerActionTargetTransitionEnum.PLAYER_CANCELS_TARGET_SELECTION]:
                    (context: PlayerActionTargetStateMachineContext) =>
                        context.playerIntent.targetCancelled,
                [PlayerActionTargetTransitionEnum.PLAYER_CONFIRMS_TARGET_SELECTION]:
                    (context: PlayerActionTargetStateMachineContext) =>
                        context.playerIntent.targetSelection.battleSquaddieIds
                            .length > 0 && context.playerIntent.targetConfirmed,
                [PlayerActionTargetTransitionEnum.PLAYER_CANCELS_ACTION_SELECTION]:
                    (context: PlayerActionTargetStateMachineContext) =>
                        context.playerIntent.actionCancelled,
            }
        )
    }

    setActionLogic() {
        StateMachineDataService.setActionLogic(this.stateMachineData, {
            [PlayerActionTargetActionEnum.COUNT_TARGETS_ENTRY]:
                countTargetsEntry,
            [PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED]:
                (context: PlayerActionTargetStateMachineContext) => {
                    context.playerIntent.targetSelection.automaticallySelected = true
                    context.playerIntent.targetSelection.battleSquaddieIds =
                        Object.keys(context.targetResults.validTargets)
                    context.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
                        ...context,
                        battleActionRecorder: context.battleActionRecorder,
                        numberGenerator:
                            context.messageParameters.numberGenerator,
                        summaryHUDState:
                            context.messageParameters.summaryHUDState,
                        targetCoordinate: Object.values(
                            context.targetResults.validTargets
                        )[0].currentMapCoordinate,
                    })
                },
            [PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM]: (
                context: PlayerActionTargetStateMachineContext
            ) => {
                parseKeyBoardEventsWhenPlayerCanConfirm(context)
                parseMouseEventsWhenPlayerCanConfirm(
                    this.getConfirmButtons(),
                    context
                )
                context.playerInput = []
            },
            [PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_TO_SELECT_TARGET]:
                (context: PlayerActionTargetStateMachineContext) => {
                    parseKeyBoardEventsWhenPlayerCanSelectTarget(context)
                    parseMouseEventsWhenPlayerCanSelectTarget(
                        this.getSelectTargetButtons(),
                        context
                    )
                    context.playerInput = []
                },
            [PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONFIRMS_ACTION_SELECTION]:
                (context: PlayerActionTargetStateMachineContext) => {
                    context.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        battleActionRecorder: context.battleActionRecorder,
                        numberGenerator:
                            context.messageParameters.numberGenerator,
                        missionStatistics:
                            context.messageParameters
                                .playerConfirmsActionMessageParameters
                                .missionStatistics,
                        challengeModifierSetting:
                            context.messageParameters.challengeModifierSetting,
                    })
                    context.externalFlags.actionConfirmed = true
                },
            [PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_TARGET_SELECTION]:
                (context: PlayerActionTargetStateMachineContext) => {
                    context.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                        summaryHUDState:
                            context.messageParameters.summaryHUDState,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        campaignResources:
                            context.messageParameters.campaignResources,
                        squaddieAllMovementCache:
                            context.messageParameters.squaddieAllMovementCache,
                    })
                    context.playerIntent.targetSelection.battleSquaddieIds = []
                },
            [PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONSIDERS_TARGET_SELECTION]:
                (context: PlayerActionTargetStateMachineContext) => {
                    const battleSquaddieIdSelected =
                        context.playerIntent.targetSelection
                            .battleSquaddieIds[0]
                    context.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        numberGenerator:
                            context.messageParameters.numberGenerator,
                        battleActionRecorder: context.battleActionRecorder,
                        targetCoordinate:
                            context.targetResults.validTargets[
                                battleSquaddieIdSelected
                            ].currentMapCoordinate,
                        summaryHUDState:
                            context.messageParameters.summaryHUDState,
                    })
                },
            [PlayerActionTargetActionEnum.CANCEL_ACTION_SELECTION_ENTRY]: (
                context: PlayerActionTargetStateMachineContext
            ) => {
                context.externalFlags.cancelActionSelection = true
            },
            [PlayerActionTargetActionEnum.CONFIRM_ACTION_SELECTION_ENTRY]: (
                context: PlayerActionTargetStateMachineContext
            ) => {
                context.externalFlags.actionConfirmed = true
            },
            [PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION]:
                (context: PlayerActionTargetStateMachineContext) => {
                    context.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                        summaryHUDState:
                            context.messageParameters.summaryHUDState,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        campaignResources:
                            context.messageParameters.campaignResources,
                        squaddieAllMovementCache:
                            context.messageParameters.squaddieAllMovementCache,
                    })

                    context.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        objectRepository: context.objectRepository,
                        battleActionRecorder: context.battleActionRecorder,
                        summaryHUDState:
                            context.messageParameters.summaryHUDState,
                        playerConsideredActions:
                            context.messageParameters
                                .playerCancelsPlayerActionConsiderationsParameters
                                .playerConsideredActions,
                        missionMap: context.missionMap,
                        playerDecisionHUD:
                            context.messageParameters
                                .playerCancelsPlayerActionConsiderationsParameters
                                .playerDecisionHUD,
                        playerCommandState: context.playerCommandState,
                    })
                },
        })
    }

    acceptPlayerInput(
        event: OrchestratorComponentKeyEvent | OrchestratorComponentMouseEvent
    ) {
        this.context.playerInput.push(event)
    }

    getConfirmButtons(): Button[] {
        return [
            this.uiObjects?.confirm?.okButton,
            this.uiObjects?.confirm?.cancelButton,
        ].filter((x) => x != undefined)
    }

    getSelectTargetButtons(): Button[] {
        return [this.uiObjects?.selectTarget?.cancelButton].filter(
            (x) => x != undefined
        )
    }

    getSelectTargetExplanationText(): Label[] {
        return [this.uiObjects?.selectTarget?.explanationLabel].filter(
            (x) => x != undefined
        )
    }
}

const countTargetsEntry = (context: PlayerActionTargetStateMachineContext) => {
    const battleSquaddieId = BattleActionDecisionStepService.getActor(
        context.battleActionDecisionStep
    )?.battleSquaddieId

    if (battleSquaddieId == undefined) {
        throw new Error(
            "[PlayerActionTargetStateMachine.countTargetsEntry] no actor found"
        )
    }

    if (context.objectRepository == undefined) {
        throw new Error(
            "[PlayerActionTargetStateMachine.countTargetsEntry] no objectRepository"
        )
    }

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            context.objectRepository,
            battleSquaddieId
        )
    )

    const actionTemplateId = BattleActionDecisionStepService.getAction(
        context.battleActionDecisionStep
    )?.actionTemplateId
    if (actionTemplateId == undefined) {
        throw new Error(
            "[PlayerActionTargetStateMachine.countTargetsEntry] no action found"
        )
    }

    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        context.objectRepository,
        actionTemplateId
    )

    const targetingResults = TargetingResultsService.findValidTargets({
        map: context.missionMap,
        actionTemplate,
        actionEffectSquaddieTemplate: actionTemplate.actionEffectTemplates[0],
        actingSquaddieTemplate: squaddieTemplate,
        actingBattleSquaddie: battleSquaddie,
        squaddieRepository: context.objectRepository,
    })
    const targetBattleSquaddieIds =
        countTargetsFromResultsBasedOnActionTemplate(
            actionTemplate,
            targetingResults,
            context,
            squaddieTemplate
        )

    targetBattleSquaddieIds.forEach((battleSquaddieId) => {
        const { currentMapCoordinate } =
            MissionMapService.getByBattleSquaddieId(
                context.missionMap,
                battleSquaddieId
            )

        context.targetResults.validTargets[battleSquaddieId] = {
            currentMapCoordinate: currentMapCoordinate,
        }
    })

    context.targetResults.validCoordinates = [
        ...targetingResults.coordinatesInRange,
    ]
}

const countTargetsFromResultsBasedOnActionTemplate = (
    actionTemplate: ActionTemplate,
    targetingResults: TargetingResults,
    context: PlayerActionTargetStateMachineContext,
    squaddieTemplate: SquaddieTemplate
) => {
    const actionTargetsSelfOrFriends =
        ActionTemplateService.getActionEffectTemplates(actionTemplate).some(
            (actionEffectTemplate) =>
                ActionEffectTemplateService.doesItTargetSelf(
                    actionEffectTemplate
                ) ||
                ActionEffectTemplateService.doesItTargetFriends(
                    actionEffectTemplate
                )
        )
    const objectRepository = context.objectRepository
    if (objectRepository == undefined) {
        throw new Error(
            "[PlayerActionTargetStateMachine.countTargetsFromResultsBasedOnActionTemplate] no objectRepository"
        )
    }

    return targetingResults.battleSquaddieIdsInRange.filter(
        (battleSquaddieId) => {
            if (!actionTargetsSelfOrFriends) return true

            const {
                battleSquaddie: targetBattleSquaddie,
                squaddieTemplate: targetSquaddieTemplate,
            } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    battleSquaddieId
                )
            )

            if (
                !SquaddieAffiliationService.areSquaddieAffiliationsAllies({
                    actingAffiliation: squaddieTemplate.squaddieId.affiliation,
                    targetAffiliation:
                        targetSquaddieTemplate.squaddieId.affiliation,
                })
            ) {
                return true
            }

            if (
                ActionTemplateService.doesActionTemplateHeal(actionTemplate) &&
                CanHealTargetCheck.calculateHealingOnTarget({
                    actionTemplate,
                    battleSquaddie: targetBattleSquaddie,
                    squaddieTemplate: targetSquaddieTemplate,
                }) > 0
            ) {
                return true
            }

            return (
                ActionTemplateService.getAttributeModifiers(actionTemplate)
                    .length > 0 &&
                CanAddModifiersCheck.willAddModifiersToTarget({
                    actionTemplate,
                    battleSquaddie: targetBattleSquaddie,
                    squaddieTemplate: targetSquaddieTemplate,
                })
            )
        }
    )
}

const getKeyboardEvents = (context: PlayerActionTargetStateMachineContext) =>
    context.playerInput
        .filter(
            (event) =>
                event.eventType == OrchestratorComponentKeyEventType.PRESSED
        )
        .map((event) =>
            PlayerInputStateService.getActionsForPressedKey(
                context.messageParameters.playerInputState,
                (event as OrchestratorComponentKeyEvent).keyCode
            )
        )
        .flat()

const parseKeyBoardEventsWhenPlayerCanConfirm = (
    context: PlayerActionTargetStateMachineContext
) => {
    const keyBoardEvents = getKeyboardEvents(context)

    switch (true) {
        case keyBoardEvents.includes(PlayerInputAction.ACCEPT):
            context.playerIntent.targetConfirmed = true
            break
        case keyBoardEvents.includes(PlayerInputAction.CANCEL) &&
            context.playerIntent.targetSelection.automaticallySelected:
            context.playerIntent.actionCancelled = true
            break
        case keyBoardEvents.includes(PlayerInputAction.CANCEL) &&
            !context.playerIntent.targetSelection.automaticallySelected:
            context.playerIntent.targetCancelled = true
            break
    }
}

const parseMouseEventsWhenPlayerCanConfirm = (
    buttons: Button[],
    context: PlayerActionTargetStateMachineContext
) => {
    applyMouseEventsToButtons(context, buttons)
    const confirmOKButton = buttons.find(
        (button) => button.id === PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID
    )
    if (confirmOKButton && didButtonSwitchFromActiveToHover(confirmOKButton)) {
        confirmOKButton.clearStatus()
        context.playerIntent.targetConfirmed = true
    }

    const cancelButton = buttons.find(
        (button) => button.id === PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID
    )
    if (
        cancelButton &&
        (didButtonSwitchFromActiveToHover(cancelButton) ||
            didPlayerClickOnMouseCancelButton(context))
    ) {
        cancelButton.clearStatus()
        if (context.playerIntent.targetSelection.automaticallySelected)
            context.playerIntent.actionCancelled = true
        else context.playerIntent.targetCancelled = true
    }
}

const parseMouseEventsWhenPlayerCanSelectTarget = (
    buttons: Button[],
    context: PlayerActionTargetStateMachineContext
) => {
    applyMouseEventsToButtons(context, buttons)
    const cancelButton = buttons.find(
        (button) =>
            button.id === PLAYER_ACTION_SELECT_TARGET_CREATE_CANCEL_BUTTON_ID
    )
    if (
        cancelButton &&
        (didButtonSwitchFromActiveToHover(cancelButton) ||
            didPlayerClickOnMouseCancelButton(context))
    ) {
        cancelButton.clearStatus()
        context.playerIntent.actionCancelled = true
        return
    }

    const filterValidTargets = (mapCoordinate: HexCoordinate) => {
        return Object.entries(context.targetResults.validTargets)
            .filter(([_, battleSquaddieMapCoordinate]) =>
                HexCoordinateService.areEqual(
                    battleSquaddieMapCoordinate.currentMapCoordinate,
                    mapCoordinate
                )
            )
            .map(([battleSquaddieId, _]) => battleSquaddieId)
    }

    context.playerInput
        .filter((event) =>
            new Set<TOrchestratorComponentMouseEventType>([
                OrchestratorComponentMouseEventType.RELEASE,
                OrchestratorComponentMouseEventType.LOCATION,
            ]).has(event.eventType as TOrchestratorComponentMouseEventType)
        )
        .map((event) => event as OrchestratorComponentMouseEvent)
        .forEach((mouseEvent: OrchestratorComponentMouseEvent) => {
            let battleSquaddieIds: string[] = []
            switch (mouseEvent.eventType) {
                case OrchestratorComponentMouseEventType.RELEASE:
                    const mapCoordinateClickedOn =
                        ConvertCoordinateService.convertScreenLocationToMapCoordinates(
                            {
                                screenLocation: { ...mouseEvent.mouseRelease },
                                cameraLocation:
                                    context.camera.getWorldLocation(),
                            }
                        )
                    battleSquaddieIds = filterValidTargets(
                        mapCoordinateClickedOn
                    )

                    context.playerIntent.targetSelection.battleSquaddieIds =
                        battleSquaddieIds
                    context.playerIntent.targetSelection.automaticallySelected = false

                    if (battleSquaddieIds.length === 0) {
                        updateSelectTargetExplanationText(
                            mapCoordinateClickedOn,
                            context
                        )
                    } else {
                        context.playerIntent.targetCancelled = false
                    }
                    break
                case OrchestratorComponentMouseEventType.LOCATION:
                    const mapCoordinateHoveredOver =
                        ConvertCoordinateService.convertScreenLocationToMapCoordinates(
                            {
                                screenLocation: { ...mouseEvent.mouseLocation },
                                cameraLocation:
                                    context.camera.getWorldLocation(),
                            }
                        )

                    const missionMapSquaddieCoordinate =
                        MissionMapService.getBattleSquaddieAtCoordinate(
                            context.missionMap,
                            mapCoordinateHoveredOver
                        )

                    if (
                        !MissionMapSquaddieCoordinateService.isValid(
                            missionMapSquaddieCoordinate
                        )
                    )
                        return

                    battleSquaddieIds = filterValidTargets(
                        mapCoordinateHoveredOver
                    )

                    if (battleSquaddieIds.length === 0) return

                    context.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                        battleSquaddieSelectedId: battleSquaddieIds[0],
                        selectionMethod: {
                            mapCoordinate: mapCoordinateHoveredOver,
                        },
                        summaryHUDState:
                            context.messageParameters.summaryHUDState,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        campaignResources:
                            context.messageParameters.campaignResources,
                        squaddieAllMovementCache:
                            context.messageParameters.squaddieAllMovementCache,
                    })
                    break
            }
        })
}

const updateSelectTargetExplanationText = (
    mapCoordinateClickedOn: HexCoordinate,
    context: PlayerActionTargetStateMachineContext
) => {
    let selectedDescription = HexCoordinateService.toString(
        mapCoordinateClickedOn
    )

    const info = MissionMapService.getBattleSquaddieAtCoordinate(
        context.missionMap,
        mapCoordinateClickedOn
    )
    const objectRepository = context.objectRepository
    if (
        MissionMapSquaddieCoordinateService.isValid(info) &&
        info?.battleSquaddieId != undefined &&
        objectRepository != undefined
    ) {
        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                info.battleSquaddieId
            )
        )
        selectedDescription = squaddieTemplate?.squaddieId.name
    }
    context.explanationLabelText = `${selectedDescription}\n is out of range`
}

const didButtonSwitchFromActiveToHover = (button: Button) => {
    if (
        !button ||
        [
            button.getStatusChangeEvent()?.mousePress,
            button.getStatusChangeEvent()?.mouseRelease,
            button.getStatusChangeEvent()?.mouseLocation,
        ].every((x) => x == undefined)
    )
        return false

    const statusChangeEvent = button.getStatusChangeEvent()
    return (
        statusChangeEvent?.previousStatus == ButtonStatus.ACTIVE &&
        statusChangeEvent?.newStatus == ButtonStatus.HOVER
    )
}

const didPlayerClickOnMouseCancelButton = (
    context: PlayerActionTargetStateMachineContext
) =>
    context.playerInput.some(
        (mouseRelease) =>
            mouseRelease.eventType ==
                OrchestratorComponentMouseEventType.RELEASE &&
            mouseRelease.mouseRelease.button == MouseButton.CANCEL
    )

const applyMouseEventsToButtons = (
    context: PlayerActionTargetStateMachineContext,
    buttons: Button[]
) => {
    context.playerInput
        .filter((event) =>
            new Set<TOrchestratorComponentMouseEventType>([
                OrchestratorComponentMouseEventType.PRESS,
                OrchestratorComponentMouseEventType.RELEASE,
                OrchestratorComponentMouseEventType.LOCATION,
            ]).has(event.eventType as TOrchestratorComponentMouseEventType)
        )
        .map((event) => event as OrchestratorComponentMouseEvent)
        .forEach((mouseEvent: OrchestratorComponentMouseEvent) => {
            switch (mouseEvent.eventType) {
                case OrchestratorComponentMouseEventType.PRESS:
                    buttons.forEach((button) => {
                        button.mousePressed({
                            mousePress: mouseEvent.mousePress,
                        })
                    })
                    break
                case OrchestratorComponentMouseEventType.RELEASE:
                    buttons.forEach((button) => {
                        button.mouseReleased({
                            mouseRelease: mouseEvent.mouseRelease,
                        })
                    })
                    break
                case OrchestratorComponentMouseEventType.LOCATION:
                    buttons.forEach((button) => {
                        button.mouseMoved({
                            mouseLocation: mouseEvent.mouseLocation,
                        })
                    })
                    break
            }
        })
}

const parseKeyBoardEventsWhenPlayerCanSelectTarget = (
    context: PlayerActionTargetStateMachineContext
) => {
    const keyBoardEvents = getKeyboardEvents(context)

    switch (true) {
        case keyBoardEvents.includes(PlayerInputAction.CANCEL):
            context.playerIntent.actionCancelled = true
            break
    }
}
