import { StateMachine } from "../../../utils/stateMachine/stateMachine"
import {
    StateMachineData,
    StateMachineDataService,
} from "../../../utils/stateMachine/stateMachineData/stateMachineData"
import { StateMachineStateData } from "../../../utils/stateMachine/stateMachineData/stateMachineStateData"
import { StateMachineTransitionData } from "../../../utils/stateMachine/stateMachineData/stateMachineTransitionData"
import { TargetingResultsService } from "../../targeting/targetingService"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { ObjectRepositoryService } from "../../objectRepository"
import { MissionMapService } from "../../../missionMap/missionMap"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../battleOrchestratorComponent"
import {
    PlayerInputAction,
    PlayerInputStateService,
} from "../../../ui/playerInput/playerInputState"
import { PlayerActionTargetStateMachineContext } from "./playerActionTargetStateMachineContext"
import { PlayerActionTargetStateMachineUIObjects } from "./playerActionTargetStateMachineUIObjects"
import { PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID } from "../../orchestratorComponents/playerActionConfirm/okButton"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { Button } from "../../../ui/button/button"
import { PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID } from "../../orchestratorComponents/playerActionConfirm/cancelButton"
import { MouseButton } from "../../../utils/mouseConfig"

export enum PlayerActionTargetStateEnum {
    UNKNOWN = "UNKNOWN",
    INITIALIZED = "INITIALIZED",
    NOT_APPLICABLE = "NOT_APPLICABLE",
    COUNT_TARGETS = "COUNT_TARGETS",
    FINISHED = "FINISHED",
    WAITING_FOR_PLAYER_CONFIRM = "WAITING_FOR_PLAYER_CONFIRM",
    CANCEL_ACTION_SELECTION = "CANCEL_ACTION_SELECTION",
}

export enum PlayerActionTargetTransitionEnum {
    UNKNOWN = "UNKNOWN",
    INITIALIZED = "INITIALIZED",
    UNSUPPORTED_COUNT_TARGETS = "UNSUPPORTED_COUNT_TARGETS",
    FINISHED = "FINISHED",
    NO_TARGETS_FOUND = "NO_TARGETS_FOUND",
    TARGETS_AUTOMATICALLY_SELECTED = "TARGETS_AUTOMATICALLY_SELECTED",
    PLAYER_CONFIRMS_TARGET_SELECTION = "PLAYER_CONFIRMS_TARGET_SELECTION",
    PLAYER_CANCELS_ACTION_SELECTION = "PLAYER_CANCELS_ACTION_SELECTION",
}

export enum PlayerActionTargetActionEnum {
    UNKNOWN = "UNKNOWN",
    COUNT_TARGETS_ENTRY = "COUNT_TARGETS_ENTRY",
    NOT_APPLICABLE_ENTRY = "NOT_APPLICABLE_ENTRY",
    FINISHED_ENTRY = "FINISHED_ENTRY",
    WAITING_FOR_PLAYER_CONFIRM = "WAITING_FOR_PLAYER_CONFIRM",
    TRIGGER_TARGETS_AUTOMATICALLY_SELECTED = "TRIGGER_TARGET_AUTOMATICALLY_SELECTED",
    TRIGGER_PLAYER_CONFIRMS_TARGET_SELECTION = "TRIGGER_PLAYER_CONFIRMS_TARGET_SELECTION",
    TRIGGER_PLAYER_CANCELS_ACTION_SELECTION = "TRIGGER_PLAYER_CANCELS_ACTION_SELECTION",
    CANCEL_ACTION_SELECTION_ENTRY = "CANCEL_ACTION_SELECTION_ENTRY",
}

export const PlayerActionTargetStateMachineInfoByState: {
    [s in PlayerActionTargetStateEnum]?: StateMachineStateData<
        PlayerActionTargetTransitionEnum,
        PlayerActionTargetActionEnum
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
            PlayerActionTargetTransitionEnum.UNSUPPORTED_COUNT_TARGETS,
            PlayerActionTargetTransitionEnum.TARGETS_AUTOMATICALLY_SELECTED,
            PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND,
        ],
    },
    [PlayerActionTargetStateEnum.NOT_APPLICABLE]: {
        actions: [],
        entryAction: PlayerActionTargetActionEnum.NOT_APPLICABLE_ENTRY,
        exitAction: undefined,
        transitions: [PlayerActionTargetTransitionEnum.FINISHED],
    },
    [PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM]: {
        actions: [PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM],
        entryAction: undefined,
        exitAction: undefined,
        transitions: [
            PlayerActionTargetTransitionEnum.PLAYER_CONFIRMS_TARGET_SELECTION,
            PlayerActionTargetTransitionEnum.PLAYER_CANCELS_ACTION_SELECTION,
        ],
    },
    [PlayerActionTargetStateEnum.CANCEL_ACTION_SELECTION]: {
        actions: [],
        entryAction: PlayerActionTargetActionEnum.CANCEL_ACTION_SELECTION_ENTRY,
        exitAction: undefined,
        transitions: [PlayerActionTargetTransitionEnum.FINISHED],
    },
    [PlayerActionTargetStateEnum.FINISHED]: {
        actions: [],
        entryAction: PlayerActionTargetActionEnum.FINISHED_ENTRY,
        exitAction: undefined,
        transitions: [],
    },
}

export const PlayerActionTargetStateMachineInfoByTransition: {
    [t in PlayerActionTargetTransitionEnum]?: StateMachineTransitionData<
        PlayerActionTargetStateEnum,
        PlayerActionTargetActionEnum
    >
} = {
    [PlayerActionTargetTransitionEnum.INITIALIZED]: {
        targetedState: PlayerActionTargetStateEnum.COUNT_TARGETS,
        action: undefined,
    },
    [PlayerActionTargetTransitionEnum.UNSUPPORTED_COUNT_TARGETS]: {
        targetedState: PlayerActionTargetStateEnum.NOT_APPLICABLE,
        action: undefined,
    },
    [PlayerActionTargetTransitionEnum.TARGETS_AUTOMATICALLY_SELECTED]: {
        targetedState: PlayerActionTargetStateEnum.WAITING_FOR_PLAYER_CONFIRM,
        action: PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED,
    },
    [PlayerActionTargetTransitionEnum.PLAYER_CONFIRMS_TARGET_SELECTION]: {
        targetedState: PlayerActionTargetStateEnum.FINISHED,
        action: PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONFIRMS_TARGET_SELECTION,
    },
    [PlayerActionTargetTransitionEnum.PLAYER_CANCELS_ACTION_SELECTION]: {
        targetedState: PlayerActionTargetStateEnum.CANCEL_ACTION_SELECTION,
        action: PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION,
    },
    [PlayerActionTargetTransitionEnum.NO_TARGETS_FOUND]: {
        targetedState: PlayerActionTargetStateEnum.CANCEL_ACTION_SELECTION,
        action: undefined,
    },
    [PlayerActionTargetTransitionEnum.FINISHED]: {
        targetedState: PlayerActionTargetStateEnum.FINISHED,
        action: undefined,
    },
}

export class PlayerActionTargetStateMachine extends StateMachine<
    PlayerActionTargetStateEnum,
    PlayerActionTargetTransitionEnum,
    PlayerActionTargetActionEnum,
    PlayerActionTargetStateMachineContext
> {
    currentState: PlayerActionTargetStateEnum
    stateMachineData: StateMachineData<
        PlayerActionTargetStateEnum,
        PlayerActionTargetTransitionEnum,
        PlayerActionTargetActionEnum,
        PlayerActionTargetStateMachineContext
    >
    uiObjects: PlayerActionTargetStateMachineUIObjects

    constructor({
        id,
        context,
        stateMachineData,
    }: {
        id: string
        context: PlayerActionTargetStateMachineContext
        stateMachineData: StateMachineData<
            PlayerActionTargetStateEnum,
            PlayerActionTargetTransitionEnum,
            PlayerActionTargetActionEnum,
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
                [PlayerActionTargetTransitionEnum.UNSUPPORTED_COUNT_TARGETS]: (
                    context: PlayerActionTargetStateMachineContext
                ) =>
                    context.targetResults.validTargets != undefined &&
                    Object.keys(context.targetResults.validTargets).length > 1,
                [PlayerActionTargetTransitionEnum.TARGETS_AUTOMATICALLY_SELECTED]:
                    (context: PlayerActionTargetStateMachineContext) =>
                        context.targetResults.validTargets != undefined &&
                        Object.keys(context.targetResults.validTargets)
                            .length == 1,
                [PlayerActionTargetTransitionEnum.FINISHED]: (
                    context: PlayerActionTargetStateMachineContext
                ) =>
                    context.externalFlags.useLegacySelector ||
                    context.externalFlags.cancelActionSelection,
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
            [PlayerActionTargetActionEnum.NOT_APPLICABLE_ENTRY]: (
                context: PlayerActionTargetStateMachineContext
            ) => {
                context.externalFlags.useLegacySelector = true
            },
            [PlayerActionTargetActionEnum.TRIGGER_TARGETS_AUTOMATICALLY_SELECTED]:
                (context: PlayerActionTargetStateMachineContext) => {
                    context.playerIntent.targetSelection.automaticallySelected =
                        true
                    context.playerIntent.targetSelection.battleSquaddieIds =
                        Object.keys(context.targetResults.validTargets)
                    context.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
                        ...context,
                        battleActionRecorder:
                            context.messageParameters.battleActionRecorder,
                        numberGenerator:
                            context.messageParameters.numberGenerator,
                        summaryHUDState:
                            context.messageParameters.summaryHUDState,
                        targetCoordinate: Object.values(
                            context.targetResults.validTargets
                        )[0].mapCoordinate,
                    })
                },
            [PlayerActionTargetActionEnum.FINISHED_ENTRY]: (
                context: PlayerActionTargetStateMachineContext
            ) => {
                context.externalFlags.finished = true
            },
            [PlayerActionTargetActionEnum.WAITING_FOR_PLAYER_CONFIRM]: (
                context: PlayerActionTargetStateMachineContext
            ) => {
                parseKeyBoardEvents(context)
                parseMouseEvents(this.getConfirmButtons(), context)
                context.playerInput = []
            },
            [PlayerActionTargetActionEnum.TRIGGER_PLAYER_CONFIRMS_TARGET_SELECTION]:
                (context: PlayerActionTargetStateMachineContext) => {
                    context.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        battleActionRecorder:
                            context.messageParameters.battleActionRecorder,
                        numberGenerator:
                            context.messageParameters.numberGenerator,
                        missionStatistics:
                            context.messageParameters
                                .playerConfirmsActionMessageParameters
                                .missionStatistics,
                    })
                    this.resetPlayerIntent(context)
                },
            [PlayerActionTargetActionEnum.CANCEL_ACTION_SELECTION_ENTRY]: (
                context: PlayerActionTargetStateMachineContext
            ) => {
                context.externalFlags.cancelActionSelection = true
            },
            [PlayerActionTargetActionEnum.TRIGGER_PLAYER_CANCELS_ACTION_SELECTION]:
                (context: PlayerActionTargetStateMachineContext) => {
                    context.messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                        battleActionDecisionStep:
                            context.battleActionDecisionStep,
                        missionMap: context.missionMap,
                        objectRepository: context.objectRepository,
                        campaignResources:
                            context.messageParameters
                                .playerCancelsTargetSelectionMessageParameters
                                .campaignResources,
                    })

                    if (
                        context.playerIntent.targetSelection
                            .automaticallySelected
                    ) {
                        context.messageBoard.sendMessage({
                            type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                            battleActionDecisionStep:
                                context.battleActionDecisionStep,
                            objectRepository: context.objectRepository,
                            battleActionRecorder:
                                context.messageParameters.battleActionRecorder,
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
                    }
                    this.resetPlayerIntent(context)
                },
        })
    }

    private resetPlayerIntent(context: PlayerActionTargetStateMachineContext) {
        context.playerIntent = {
            targetSelection: {
                battleSquaddieIds: [],
                automaticallySelected: false,
            },
            targetConfirmed: false,
            actionCancelled: false,
        }
    }

    acceptPlayerInput(
        event: OrchestratorComponentKeyEvent | OrchestratorComponentMouseEvent
    ) {
        this.context.playerInput.push(event)
    }

    getConfirmButtons(): Button[] {
        return [
            this.uiObjects?.confirm.okButton,
            this.uiObjects?.confirm.cancelButton,
        ].filter((x) => x)
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

    targetingResults.battleSquaddieIdsInRange.forEach((battleSquaddieId) => {
        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            context.missionMap,
            battleSquaddieId
        )

        context.targetResults.validTargets[battleSquaddieId] = {
            mapCoordinate,
        }
    })

    context.targetResults.validCoordinates = [
        ...targetingResults.coordinatesInRange,
    ]
}

const parseKeyBoardEvents = (
    context: PlayerActionTargetStateMachineContext
) => {
    const keyBoardEvents = context.playerInput
        .filter(
            (event) =>
                event.eventType == OrchestratorComponentKeyEventType.PRESSED
        )
        .map((event) =>
            PlayerInputStateService.getActionsForPressedKey(
                context.messageParameters.playerConfirmsActionMessageParameters
                    .playerInputState,
                (event as OrchestratorComponentKeyEvent).keyCode
            )
        )
        .flat()

    switch (true) {
        case keyBoardEvents.includes(PlayerInputAction.ACCEPT):
            context.playerIntent.targetConfirmed = true
            break
        case keyBoardEvents.includes(PlayerInputAction.CANCEL) &&
            context.playerIntent.targetSelection.automaticallySelected:
            context.playerIntent.actionCancelled = true
            break
    }
}

const parseMouseEvents = (
    buttons: Button[],
    context: PlayerActionTargetStateMachineContext
) => {
    applyMouseEventsToButtons(context, buttons)
    const confirmOKButton = buttons.find(
        (button) => button.id === PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID
    )
    if (didButtonSwitchFromActiveToHover(confirmOKButton)) {
        context.playerIntent.targetConfirmed = true
    }

    const cancelButton = buttons.find(
        (button) => button.id === PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID
    )
    if (
        didButtonSwitchFromActiveToHover(cancelButton) ||
        didPlayerClickOnMouseCancelButton(context)
    ) {
        if (context.playerIntent.targetSelection.automaticallySelected)
            context.playerIntent.actionCancelled = true
    }
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
            [
                OrchestratorComponentMouseEventType.PRESS,
                OrchestratorComponentMouseEventType.RELEASE,
                OrchestratorComponentMouseEventType.LOCATION,
            ].includes(event.eventType as OrchestratorComponentMouseEventType)
        )
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
