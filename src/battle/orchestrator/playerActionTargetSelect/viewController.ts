import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import {
    PlayerActionConfirmContext,
    PlayerActionConfirmLayout,
    PlayerActionConfirmUIObjects,
} from "../../orchestratorComponents/playerActionConfirm/battlePlayerActionConfirm"
import { SequenceComposite } from "../../../utils/behaviorTree/composite/sequence/sequence"
import {
    PlayerActionConfirmCreateOKButton,
    PlayerActionConfirmShouldCreateOKButton,
} from "../../orchestratorComponents/playerActionConfirm/okButton"
import {
    PlayerActionConfirmCreateCancelButton,
    PlayerActionConfirmShouldCreateCancelButton,
} from "../../orchestratorComponents/playerActionConfirm/cancelButton"
import { ExecuteAllComposite } from "../../../utils/behaviorTree/composite/executeAll/executeAll"
import { BattleCamera } from "../../battleCamera"
import { HEX_TILE_HEIGHT } from "../../../graphicsConstants"
import { GOLDEN_RATIO, WINDOW_SPACING } from "../../../ui/constants"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { PlayerActionTargetStateMachineLayout } from "./playerActionTargetStateMachineLayout"
import { PlayerActionTargetStateMachineContext } from "./playerActionTargetStateMachineContext"
import { PlayerActionTargetStateMachineUIObjects } from "./playerActionTargetStateMachineUIObjects"

export class PlayerActionTargetSelectViewController {
    componentData: ComponentDataBlob<
        PlayerActionTargetStateMachineLayout,
        PlayerActionTargetStateMachineContext,
        PlayerActionTargetStateMachineUIObjects
    >

    uiDrawTasks: {
        confirm: BehaviorTreeTask
    }

    constructor(
        componentData: ComponentDataBlob<
            PlayerActionTargetStateMachineLayout,
            PlayerActionTargetStateMachineContext,
            PlayerActionTargetStateMachineUIObjects
        >
    ) {
        this.componentData = componentData
        this.initializeUIComponentData()
    }

    initializeUIComponentData() {
        this.componentData.setLayout({
            confirm: this.getPlayerActionConfirmLayout(),
        })

        this.componentData.setUIObjects({
            graphicsContext: undefined,
            camera: undefined,
            confirm: {
                okButton: undefined,
                cancelButton: undefined,
                graphicsContext: undefined,
            },
        })
    }

    getPlayerActionConfirmLayout(): PlayerActionConfirmLayout {
        const okButtonHeight = HEX_TILE_HEIGHT * GOLDEN_RATIO
        return {
            okButton: {
                width: ScreenDimensions.SCREEN_WIDTH / 12,
                topOffset: HEX_TILE_HEIGHT / 2,
                height: okButtonHeight,
                text: "OK",
                fontSize: 24,
                fillColor: [0, 0, 128],
                strokeColor: [0, 0, 0],
                strokeWeight: 2,
                fontColor: [0, 0, 16],
                textBoxMargin: [0, 0, 0, 0],
                margin: 0,
                selectedBorder: {
                    strokeColor: [0, 85, 50],
                    strokeWeight: 8,
                },
                activeFill: {
                    fillColor: [0, 0, 64],
                },
            },
            cancelButton: {
                height: okButtonHeight * (GOLDEN_RATIO - 1),
                width:
                    (ScreenDimensions.SCREEN_WIDTH / 12) * (GOLDEN_RATIO - 1),
                text: "Cancel",
                fontSize: 16,
                fillColor: [0, 0, 64],
                strokeColor: [0, 0, 0],
                strokeWeight: 1,
                fontColor: [0, 0, 16],
                textBoxMargin: [0, 0, 0, 0],
                margin: [0, WINDOW_SPACING.SPACING1],
                selectedBorder: {
                    strokeColor: [0, 85, 50],
                    strokeWeight: 4,
                },
                activeFill: {
                    fillColor: [0, 0, 32],
                },
            },
        }
    }

    createDrawingTasks(camera: BattleCamera) {
        const confirmData: ComponentDataBlob<
            PlayerActionConfirmLayout,
            PlayerActionConfirmContext,
            PlayerActionConfirmUIObjects
        > = new ComponentDataBlob()
        confirmData.setUIObjects(this.componentData.getUIObjects().confirm)
        confirmData.setLayout(this.componentData.getLayout().confirm)
        confirmData.setContext({
            buttonStatusChangeEventDataBlob:
                this.componentData.getContext().playerActionConfirmContext
                    .buttonStatusChangeEventDataBlob,
            battleActionDecisionStep:
                this.componentData.getContext().battleActionDecisionStep,
            camera,
        })

        const confirmOKButtonTask = new SequenceComposite(confirmData, [
            new PlayerActionConfirmShouldCreateOKButton(confirmData),
            new PlayerActionConfirmCreateOKButton(confirmData),
        ])

        const confirmCancelButtonTask = new SequenceComposite(confirmData, [
            new PlayerActionConfirmShouldCreateCancelButton(confirmData),
            new PlayerActionConfirmCreateCancelButton(confirmData),
        ])

        this.uiDrawTasks = {
            confirm: new ExecuteAllComposite(confirmData, [
                confirmOKButtonTask,
                confirmCancelButtonTask,
            ]),
        }
    }

    draw({
        camera,
        graphicsContext,
    }: {
        camera: BattleCamera
        graphicsContext: GraphicsBuffer
    }) {
        if (this.uiDrawTasks == undefined) {
            this.createDrawingTasks(camera)
        }

        this.updateUIObjectsDuringDraw(graphicsContext, camera)

        this.uiDrawTasks.confirm.run()
        this.getButtons().forEach((button) => {
            DataBlobService.add<GraphicsBuffer>(
                button.buttonStyle.dataBlob,
                "graphicsContext",
                graphicsContext
            )
            button.draw()
        })
    }

    getUIObjects(): PlayerActionTargetStateMachineUIObjects {
        return this.componentData.getUIObjects()
    }

    private updateUIObjectsDuringDraw(
        graphicsContext: GraphicsBuffer,
        camera: BattleCamera
    ) {
        const uiObjects = this.componentData.getUIObjects()
        uiObjects.graphicsContext = graphicsContext
        uiObjects.camera = camera
        uiObjects.confirm.graphicsContext = uiObjects.graphicsContext
        this.componentData.setUIObjects(uiObjects)
    }

    getButtons() {
        const uiObjects = this.componentData.getUIObjects()
        return [
            uiObjects.confirm.okButton,
            uiObjects.confirm.cancelButton,
        ].filter((x) => x)
    }
}
