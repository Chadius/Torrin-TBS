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
import {
    PlayerActionTargetStateMachineUIObjects,
    PlayerActionTargetStateMachineUIObjectsService,
} from "./playerActionTargetStateMachineUIObjects"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT } from "../../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"

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

        this.componentData.setUIObjects(
            PlayerActionTargetStateMachineUIObjectsService.empty()
        )
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

        const contextInfo = this.componentData.getContext()
        this.updateUIObjectsDuringDraw({
            graphicsContext: graphicsContext,
            camera: camera,
            battleActionDecisionStep: contextInfo.battleActionDecisionStep,
            missionMap: contextInfo.missionMap,
            objectRepository: contextInfo.objectRepository,
        })

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

    private updateUIObjectsDuringDraw({
        graphicsContext,
        camera,
        battleActionDecisionStep,
        objectRepository,
        missionMap,
    }: {
        graphicsContext: GraphicsBuffer
        camera: BattleCamera
        battleActionDecisionStep: BattleActionDecisionStep
        objectRepository: ObjectRepository
        missionMap: MissionMap
    }) {
        const uiObjects = this.componentData.getUIObjects()
        this.highlightActorSquaddie({
            battleActionDecisionStep,
            objectRepository,
            uiObjects: uiObjects.confirm,
        })
        this.highlightTargetSquaddies({
            battleActionDecisionStep,
            missionMap,
            objectRepository,
            uiObjects: uiObjects.confirm,
        })

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

    private highlightActorSquaddie({
        battleActionDecisionStep,
        objectRepository,
        uiObjects,
    }: {
        battleActionDecisionStep: BattleActionDecisionStep
        objectRepository: ObjectRepository
        uiObjects: PlayerActionConfirmUIObjects
    }) {
        if (
            !BattleActionDecisionStepService.isActorSet(
                battleActionDecisionStep
            ) ||
            uiObjects.mapIcons.actor.hasTinted
        ) {
            return
        }

        const battleSquaddieId = BattleActionDecisionStepService.getActor(
            battleActionDecisionStep
        ).battleSquaddieId

        const mapIcon = ObjectRepositoryService.getImageUIByBattleSquaddieId({
            repository: objectRepository,
            battleSquaddieId: battleSquaddieId,
            throwErrorIfNotFound: false,
        })

        if (!mapIcon) return

        mapIcon.setPulseColor(
            DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.actorSquaddie.pulseColorForMapIcon
        )
        uiObjects.mapIcons.actor.mapIcon = mapIcon
        uiObjects.mapIcons.actor.hasTinted = true
    }

    private highlightTargetSquaddies({
        battleActionDecisionStep,
        missionMap,
        objectRepository,
        uiObjects,
    }: {
        missionMap: MissionMap
        battleActionDecisionStep: BattleActionDecisionStep
        objectRepository: ObjectRepository
        uiObjects: PlayerActionConfirmUIObjects
    }) {
        if (uiObjects.mapIcons.targets.hasTinted) return

        let squaddiesToHighlight = this.getSquaddiesToHighlight({
            battleActionDecisionStep,
            missionMap,
        })
            .filter((x) => x)
            .filter(
                (battleSquaddieId) =>
                    !!ObjectRepositoryService.getImageUIByBattleSquaddieId({
                        repository: objectRepository,
                        battleSquaddieId: battleSquaddieId,
                        throwErrorIfNotFound: false,
                    })
            )
        uiObjects.mapIcons.targets.mapIcons ||= []

        squaddiesToHighlight.forEach((battleSquaddieId) => {
            const mapIcon =
                ObjectRepositoryService.getImageUIByBattleSquaddieId({
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddieId,
                    throwErrorIfNotFound: false,
                })
            uiObjects.mapIcons.targets.mapIcons.push(mapIcon)
            mapIcon.setPulseColor(
                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.targetEnemySquaddie
                    .pulseColorForMapIcon
            )
        })

        if (squaddiesToHighlight.length > 0) {
            uiObjects.mapIcons.targets.hasTinted = true
        }
    }

    private getSquaddiesToHighlight({
        battleActionDecisionStep,
        missionMap,
    }: {
        missionMap: MissionMap
        battleActionDecisionStep: BattleActionDecisionStep
    }) {
        return [
            MissionMapService.getBattleSquaddieAtCoordinate(
                missionMap,
                BattleActionDecisionStepService.getTarget(
                    battleActionDecisionStep
                )?.targetCoordinate
            )?.battleSquaddieId,
        ]
    }

    cleanUp() {
        const oldUiObjects = this.componentData.getUIObjects()
        ;[
            oldUiObjects?.confirm.mapIcons.actor.mapIcon,
            ...(oldUiObjects?.confirm.mapIcons.targets.mapIcons ?? []),
        ]
            .filter((x) => x)
            .forEach((mapIcon) => {
                mapIcon.removePulseColor()
            })
    }
}
