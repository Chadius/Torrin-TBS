import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import { SequenceComposite } from "../../../utils/behaviorTree/composite/sequence/sequence"
import {
    PlayerActionConfirmCreateOKButton,
    PlayerActionConfirmShouldCreateOKButton,
} from "./playerActionConfirm/okButton"
import {
    PlayerActionConfirmCreateCancelButton,
    PlayerActionConfirmShouldCreateCancelButton,
} from "./playerActionConfirm/cancelButton"
import { ExecuteAllComposite } from "../../../utils/behaviorTree/composite/executeAll/executeAll"
import { BattleCamera } from "../../battleCamera"
import { HEX_TILE_HEIGHT } from "../../../graphicsConstants"
import { GOLDEN_RATIO, WINDOW_SPACING } from "../../../ui/constants"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { PlayerActionTargetStateMachineLayout } from "./playerActionTargetStateMachineLayout"
import { PlayerActionTargetStateMachineContext } from "./playerActionTargetStateMachineContext"
import {
    PlayerActionTargetSelectMapHighlight,
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
import {
    DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT,
    DrawSquaddieIconOnMapUtilities,
} from "../../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { RectAreaService } from "../../../ui/rectArea"
import {
    PlayerActionTargetCreateCancelButton,
    PlayerActionTargetShouldCreateCancelButton,
} from "./playerActionTarget/cancelButton"
import {
    PlayerActionTargetCreateExplanationLabel,
    PlayerActionTargetShouldCreateExplanationLabel,
} from "./playerActionTarget/explanation"
import { TargetingResultsService } from "../../targeting/targetingService"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../../hexMap/mapLayer/mapGraphicsLayer"
import { LabelService } from "../../../ui/label"
import { PlayerActionTargetLayout } from "./playerActionTarget/playerActionTargetLayout"
import { PlayerActionConfirmLayout } from "./playerActionConfirm/playerActionConfirmLayout"

export class PlayerActionTargetSelectViewController {
    componentData: ComponentDataBlob<
        PlayerActionTargetStateMachineLayout,
        PlayerActionTargetStateMachineContext,
        PlayerActionTargetStateMachineUIObjects
    >

    uiDrawTasks: {
        confirm: BehaviorTreeTask
        selectTarget: BehaviorTreeTask
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
            selectTarget: this.getPlayerActionSelectTargetLayout(),
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

    getPlayerActionSelectTargetLayout(): PlayerActionTargetLayout {
        return {
            targetExplanationLabel: {
                fontSize: 16,
                area: RectAreaService.new({
                    left: (ScreenDimensions.SCREEN_WIDTH / 12) * 4,
                    width: (ScreenDimensions.SCREEN_WIDTH / 12) * 2,
                    height: 48,
                    top:
                        ScreenDimensions.SCREEN_HEIGHT -
                        (ScreenDimensions.SCREEN_WIDTH / 12) * GOLDEN_RATIO +
                        WINDOW_SPACING.SPACING1,
                }),
                fillColor: [0, 0, 0, 32],
                noStroke: true,
                fontColor: [0, 0, 128],
                textBoxMargin: [0, 0, 0, 0],
                margin: [0, WINDOW_SPACING.SPACING1],
            },
            cancelButton: {
                width:
                    (ScreenDimensions.SCREEN_WIDTH / 12) * (GOLDEN_RATIO - 1),
                topOffset: HEX_TILE_HEIGHT / 2,
                height: HEX_TILE_HEIGHT * GOLDEN_RATIO * (GOLDEN_RATIO - 1),
                text: "Cancel",
                fontSize: 16,
                fillColor: [0, 0, 64],
                strokeColor: [0, 0, 0],
                strokeWeight: 1,
                fontColor: [0, 0, 16],
                textBoxMargin: [0, 0, 0, 0],
                margin: 0,
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

    createDrawingTasks() {
        const confirmData: ComponentDataBlob<
            PlayerActionConfirmLayout,
            PlayerActionTargetStateMachineContext,
            PlayerActionTargetStateMachineUIObjects
        > = new ComponentDataBlob()
        confirmData.setUIObjects(this.componentData.getUIObjects())
        confirmData.setLayout(this.componentData.getLayout().confirm)
        confirmData.setContext(this.componentData.getContext())

        const confirmOKButtonTask = new SequenceComposite(confirmData, [
            new PlayerActionConfirmShouldCreateOKButton(confirmData),
            new PlayerActionConfirmCreateOKButton(confirmData),
        ])

        const confirmCancelButtonTask = new SequenceComposite(confirmData, [
            new PlayerActionConfirmShouldCreateCancelButton(confirmData),
            new PlayerActionConfirmCreateCancelButton(confirmData),
        ])

        const selectTargetData: ComponentDataBlob<
            PlayerActionTargetLayout,
            PlayerActionTargetStateMachineContext,
            PlayerActionTargetStateMachineUIObjects
        > = new ComponentDataBlob()
        selectTargetData.setContext(this.componentData.getContext())
        selectTargetData.setUIObjects(this.componentData.getUIObjects())
        selectTargetData.setLayout(this.componentData.getLayout().selectTarget)

        const createCancelButtonTask = new SequenceComposite(selectTargetData, [
            new PlayerActionTargetShouldCreateCancelButton(selectTargetData),
            new PlayerActionTargetCreateCancelButton(selectTargetData),
        ])

        const createExplanationLabelTask = new SequenceComposite(
            selectTargetData,
            [
                new PlayerActionTargetShouldCreateExplanationLabel(
                    selectTargetData
                ),
                new PlayerActionTargetCreateExplanationLabel(selectTargetData),
            ]
        )

        this.uiDrawTasks = {
            confirm: new ExecuteAllComposite(confirmData, [
                confirmOKButtonTask,
                confirmCancelButtonTask,
            ]),
            selectTarget: new ExecuteAllComposite(selectTargetData, [
                createCancelButtonTask,
                createExplanationLabelTask,
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
            this.createDrawingTasks()
        }

        const contextInfo = this.componentData.getContext()
        this.updateUIObjectsDuringDraw({
            graphicsContext: graphicsContext,
            camera: camera,
            battleActionDecisionStep: contextInfo.battleActionDecisionStep,
            missionMap: contextInfo.missionMap,
            objectRepository: contextInfo.objectRepository,
        })

        this.getDrawingTask().run()

        const uiObjects = this.componentData.getUIObjects()
        if (
            !BattleActionDecisionStepService.isTargetConsidered(
                contextInfo.battleActionDecisionStep
            )
        )
            LabelService.draw(
                uiObjects.selectTarget.explanationLabel,
                graphicsContext
            )

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
        const contextInfo = this.componentData.getContext()
        const uiObjects = this.componentData.getUIObjects()

        this.highlightMapTiles(contextInfo, uiObjects)

        this.highlightActorSquaddie({
            battleActionDecisionStep,
            objectRepository,
            uiObjects,
        })
        this.highlightTargetSquaddies({
            battleActionDecisionStep,
            missionMap,
            objectRepository,
            uiObjects,
        })

        uiObjects.graphicsContext = graphicsContext
        uiObjects.camera = camera
        this.componentData.setUIObjects(uiObjects)
    }

    private highlightMapTiles = (
        contextInfo: PlayerActionTargetStateMachineContext,
        uiObjects: PlayerActionTargetStateMachineUIObjects
    ) => {
        if (
            !BattleActionDecisionStepService.isActionSet(
                contextInfo.battleActionDecisionStep
            )
        )
            return
        if (
            !BattleActionDecisionStepService.isTargetConsidered(
                contextInfo.battleActionDecisionStep
            ) &&
            uiObjects.mapHighlight !=
                PlayerActionTargetSelectMapHighlight.ALL_VALID_COORDINATES
        ) {
            TargetingResultsService.highlightTargetRange({
                missionMap: contextInfo.missionMap,
                objectRepository: contextInfo.objectRepository,
                battleActionDecisionStep: contextInfo.battleActionDecisionStep,
                battleActionRecorder: contextInfo.battleActionRecorder,
            })
            uiObjects.mapHighlight =
                PlayerActionTargetSelectMapHighlight.ALL_VALID_COORDINATES
            return
        }

        if (
            BattleActionDecisionStepService.isTargetConsidered(
                contextInfo.battleActionDecisionStep
            ) &&
            uiObjects.mapHighlight !=
                PlayerActionTargetSelectMapHighlight.SELECTED_SQUADDIES_ONLY
        ) {
            TerrainTileMapService.removeAllGraphicsLayers(
                contextInfo.missionMap.terrainTileMap
            )

            const highlightedColor =
                MapGraphicsLayerService.getActionTemplateHighlightedTileDescriptionColor(
                    {
                        objectRepository: contextInfo.objectRepository,
                        actionTemplateId:
                            BattleActionDecisionStepService.getAction(
                                contextInfo.battleActionDecisionStep
                            ).actionTemplateId,
                    }
                )

            const actionRangeOnMap = MapGraphicsLayerService.new({
                id: BattleActionDecisionStepService.getActor(
                    contextInfo.battleActionDecisionStep
                ).battleSquaddieId,
                highlightedTileDescriptions: [
                    {
                        coordinates: Object.values(
                            contextInfo.targetResults.validTargets
                        ).map((t) => t.currentMapCoordinate),
                        pulseColor: highlightedColor,
                    },
                ],
                type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
            })
            TerrainTileMapService.addGraphicsLayer(
                contextInfo.missionMap.terrainTileMap,
                actionRangeOnMap
            )

            uiObjects.mapHighlight =
                PlayerActionTargetSelectMapHighlight.SELECTED_SQUADDIES_ONLY
            return
        }
    }

    getDrawingTask() {
        const contextInfo = this.componentData.getContext()
        return BattleActionDecisionStepService.isTargetConsidered(
            contextInfo.battleActionDecisionStep
        )
            ? this.uiDrawTasks.confirm
            : this.uiDrawTasks.selectTarget
    }

    getButtons() {
        const uiObjects = this.componentData.getUIObjects()
        const contextInfo = this.componentData.getContext()
        if (
            BattleActionDecisionStepService.isTargetConsidered(
                contextInfo.battleActionDecisionStep
            )
        ) {
            return [
                uiObjects.confirm.okButton,
                uiObjects.confirm.cancelButton,
            ].filter((x) => x)
        } else {
            return [uiObjects.selectTarget.cancelButton].filter((x) => x)
        }
    }

    private highlightActorSquaddie({
        battleActionDecisionStep,
        objectRepository,
        uiObjects,
    }: {
        battleActionDecisionStep: BattleActionDecisionStep
        objectRepository: ObjectRepository
        uiObjects: PlayerActionTargetStateMachineUIObjects
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
        uiObjects: PlayerActionTargetStateMachineUIObjects
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
        const mapIconLayout = DrawSquaddieIconOnMapUtilities.getMapIconLayout({
            objectRepository,
            actionTemplateId: BattleActionDecisionStepService.getAction(
                battleActionDecisionStep
            )?.actionTemplateId,
        })

        squaddiesToHighlight.forEach((battleSquaddieId) => {
            const mapIcon =
                ObjectRepositoryService.getImageUIByBattleSquaddieId({
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddieId,
                    throwErrorIfNotFound: false,
                })
            uiObjects.mapIcons.targets.mapIcons.push(mapIcon)
            mapIcon.setPulseColor(mapIconLayout.pulseColorForMapIcon)
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
        const contextInfo = this.componentData.getContext()
        if (
            BattleActionDecisionStepService.isTargetConsidered(
                contextInfo.battleActionDecisionStep
            )
        ) {
            return [
                MissionMapService.getBattleSquaddieAtCoordinate(
                    missionMap,
                    BattleActionDecisionStepService.getTarget(
                        battleActionDecisionStep
                    )?.targetCoordinate
                )?.battleSquaddieId,
            ]
        }

        return Object.keys(contextInfo.targetResults.validTargets)
    }

    cleanUp() {
        const oldUiObjects = this.componentData.getUIObjects()
        ;[
            oldUiObjects?.mapIcons.actor.mapIcon,
            ...(oldUiObjects?.mapIcons.targets.mapIcons ?? []),
        ]
            .filter((x) => x)
            .forEach((mapIcon) => {
                mapIcon.removePulseColor()
            })
    }
}
