import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MissionMap} from "../../missionMap/missionMap";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieResource} from "../../squaddie/resource";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {SquaddieActivity} from "../../squaddie/activity";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import p5 from "p5";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {ImageUI} from "../../ui/imageUI";
import {RectArea} from "../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {DamageType} from "../../squaddie/squaddieService";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {SquaddieEmotion} from "../animation/actionAnimation/actionAnimationConstants";
import {Cutscene} from "../../cutscene/cutscene";
import {DialogueBox} from "../../cutscene/dialogue/dialogueBox";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {DEFAULT_VICTORY_CUTSCENE_ID, MissionCutsceneCollection} from "../orchestrator/missionCutsceneCollection";
import {MissionObjective} from "../missionResult/missionObjective";
import {MissionReward, MissionRewardType} from "../missionResult/missionReward";
import {MissionConditionDefeatAllEnemies} from "../missionResult/missionConditionDefeatAllEnemies";

const mapMovementAndAttackIcons: string[] = [
    "map icon move 1 action",
    "map icon move 2 actions",
    "map icon move 3 actions",
    "map icon attack 1 action"
];

const attributeIcons: string[] = [
    "armor class icon",
    "hit points icon",
];

export class BattleMissionLoader implements BattleOrchestratorComponent {
    startedLoading: boolean;
    finishedPreparations: boolean;

    affiliateIconResourceKeys: string[];
    staticSquaddieResourceKeys: string[];
    bannerImageResourceKeys: string[];

    constructor() {
        this.startedLoading = false;
        this.finishedPreparations = false;
    }

    update(state: BattleOrchestratorState) {
        if (!this.startedLoading) {
            this.loadMap(state);
            this.loadSquaddies(state);
            this.loadCutscenes(state);
            this.loadObjectives(state);
            return;
        }
        if (this.startedLoading && state.resourceHandler.areAllResourcesLoaded([
            ...mapMovementAndAttackIcons,
            ...this.affiliateIconResourceKeys,
            ...this.staticSquaddieResourceKeys,
            ...this.bannerImageResourceKeys,
        ])) {
            this.initializeSquaddieResources(state);
            this.initializeCameraPosition(state);
            this.finishedPreparations = true;
        }
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent) {
    };

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: false,
        });
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return this.finishedPreparations;
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return {
            displayMap: true,
        }
    }

    reset(state: BattleOrchestratorState) {
        this.startedLoading = false;
        this.finishedPreparations = false;
    }

    private loadMap(state: BattleOrchestratorState) {
        state.hexMap = new TerrainTileMap({
            movementCost: [
                "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                " 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "  1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "   1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "     1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "      1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "       1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "         1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "          1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "           1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "            1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "             1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "              1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "               1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "                1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "                 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
            ],
            resourceHandler: state.resourceHandler,
        });

        state.resourceHandler.loadResources(mapMovementAndAttackIcons);
        state.resourceHandler.loadResources(attributeIcons);

        state.missionMap = new MissionMap({
            terrainTileMap: state.hexMap
        })

        state.pathfinder = new Pathfinder();

        this.startedLoading = true;
    }

    private loadSquaddies(state: BattleOrchestratorState) {
        state.squaddieRepository.addSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    staticId: "player_young_torrin",
                    name: "Torrin",
                    resources: new SquaddieResource({
                        mapIconResourceKey: "map icon young torrin",
                        actionSpriteByEmotion: {
                            [SquaddieEmotion.NEUTRAL]: "combat-young-torrin-neutral",
                            [SquaddieEmotion.ATTACK]: "combat-young-torrin-attack",
                            [SquaddieEmotion.TARGETED]: "combat-young-torrin-targeted",
                            [SquaddieEmotion.DAMAGED]: "combat-young-torrin-damaged",
                            [SquaddieEmotion.DEAD]: "combat-young-torrin-dead",
                        },
                    }),
                    traits: new TraitStatusStorage({
                        [Trait.HUMANOID]: true,
                        [Trait.MONSU]: true,
                    }).filterCategory(TraitCategory.CREATURE),
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                attributes: new ArmyAttributes({
                    maxHitPoints: 3,
                    armorClass: 0,
                    movement: new SquaddieMovement({
                        movementPerAction: 2,
                        traits: new TraitStatusStorage({
                            [Trait.PASS_THROUGH_WALLS]: true,
                        }).filterCategory(TraitCategory.MOVEMENT)
                    }),
                }),
                activities: [
                    new SquaddieActivity({
                        name: "water saber",
                        id: "torrin_water_saber",
                        minimumRange: 0,
                        maximumRange: 2,
                        traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY),
                        damageDescriptions: {
                            [DamageType.Body]: 2
                        }
                    }),
                    new SquaddieActivity({
                        name: "too much water saber",
                        id: "torrin_water_saber 4",
                        minimumRange: 0,
                        maximumRange: 2,
                        traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY),
                        actionsToSpend: 3,
                        damageDescriptions: {
                            [DamageType.Body]: 5
                        }
                    })
                ],
            }),
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "player_young_torrin",
                staticSquaddieId: "player_young_torrin",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.squaddieRepository.addSquaddie(
            new BattleSquaddieStatic({
                attributes: new ArmyAttributes({
                    maxHitPoints: 5,
                    armorClass: 2,
                    movement: new SquaddieMovement({
                        movementPerAction: 2,
                        traits: new TraitStatusStorage({}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                }),
                squaddieId: new SquaddieId({
                    staticId: "player_sir_camil",
                    name: "Sir Camil",
                    resources: new SquaddieResource({
                        mapIconResourceKey: "map icon sir camil",
                        actionSpriteByEmotion: {
                            [SquaddieEmotion.NEUTRAL]: "combat-sir-camil-neutral",
                            [SquaddieEmotion.ATTACK]: "combat-sir-camil-attack",
                            [SquaddieEmotion.TARGETED]: "combat-sir-camil-targeted",
                            [SquaddieEmotion.DAMAGED]: "combat-sir-camil-damaged",
                            [SquaddieEmotion.DEAD]: "combat-sir-camil-dead",
                        },
                    }),
                    traits: new TraitStatusStorage({
                        [Trait.HUMANOID]: true,
                    }).filterCategory(TraitCategory.CREATURE),
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                activities: [
                    new SquaddieActivity({
                        name: "longsword",
                        id: "sir_camil_longsword",
                        minimumRange: 0,
                        maximumRange: 1,
                        traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY),
                        damageDescriptions: {
                            [DamageType.Body]: 3
                        }
                    })
                ],
            }),
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "player_sir_camil",
                staticSquaddieId: "player_sir_camil",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.squaddieRepository.addSquaddie(
            new BattleSquaddieStatic({
                attributes: new ArmyAttributes({
                    maxHitPoints: 3,
                    armorClass: -5,
                    movement: new SquaddieMovement({
                        movementPerAction: 2,
                        traits: new TraitStatusStorage({}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                }),
                squaddieId: new SquaddieId({
                    staticId: "enemy_demon_slither",
                    name: "Slither Demon",
                    resources: new SquaddieResource({
                        mapIconResourceKey: "map icon demon slither",
                        actionSpriteByEmotion: {
                            [SquaddieEmotion.NEUTRAL]: "combat-demon-slither-neutral",
                            [SquaddieEmotion.ATTACK]: "combat-demon-slither-attack",
                            [SquaddieEmotion.TARGETED]: "combat-demon-slither-targeted",
                            [SquaddieEmotion.DAMAGED]: "combat-demon-slither-damaged",
                            [SquaddieEmotion.DEAD]: "combat-demon-slither-dead",
                        },
                    }),
                    traits: new TraitStatusStorage({
                        [Trait.DEMON]: true,
                    }).filterCategory(TraitCategory.CREATURE),
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
                activities: [
                    new SquaddieActivity({
                        name: "Bite",
                        id: "demon_slither_bite",
                        minimumRange: 0,
                        maximumRange: 1,
                        traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY),
                        damageDescriptions: {
                            [DamageType.Body]: 1
                        }
                    })
                ],
            }),
            new BattleSquaddieDynamic({
                dynamicSquaddieId: "enemy_demon_slither_0",
                staticSquaddieId: "enemy_demon_slither",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie("player_young_torrin", "player_young_torrin", new HexCoordinate({q: 0, r: 0}));
        state.missionMap.addSquaddie("player_sir_camil", "player_sir_camil", new HexCoordinate({q: 1, r: 1}));
        state.missionMap.addSquaddie("enemy_demon_slither", "enemy_demon_slither_0", new HexCoordinate({q: 1, r: 0}));

        state.battlePhaseTracker.addTeam(new BattleSquaddieTeam({
            affiliation: SquaddieAffiliation.PLAYER,
            name: "Crusaders",
            squaddieRepo: state.squaddieRepository,
            dynamicSquaddieIds: ["player_young_torrin", "player_sir_camil"],
        }));
        state.battlePhaseTracker.addTeam(new BattleSquaddieTeam({
            affiliation: SquaddieAffiliation.ENEMY,
            name: "Infiltrators",
            squaddieRepo: state.squaddieRepository,
            dynamicSquaddieIds: ["enemy_demon_slither_0"],
        }));

        this.affiliateIconResourceKeys = [
            "affiliate_icon_crusaders",
            "affiliate_icon_infiltrators",
            "affiliate_icon_western",
            "affiliate_icon_none",
        ];
        state.resourceHandler.loadResources(this.affiliateIconResourceKeys);

        const staticSquaddies: BattleSquaddieStatic[] = state.squaddieRepository.getStaticSquaddieIterator().map(info => info.staticSquaddie);
        this.staticSquaddieResourceKeys = staticSquaddies.map(staticSquaddie => staticSquaddie.squaddieId.resources.mapIconResourceKey);
        state.resourceHandler.loadResources(this.staticSquaddieResourceKeys);

        this.bannerImageResourceKeys = [
            "phase banner player",
            "phase banner enemy",
        ];
        state.resourceHandler.loadResources(this.bannerImageResourceKeys);
    }

    private initializeSquaddieResources(state: BattleOrchestratorState) {
        state.squaddieRepository.getDynamicSquaddieIterator().forEach((info) => {
            const {dynamicSquaddie, dynamicSquaddieId} = info;
            const {staticSquaddie} = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(dynamicSquaddieId));

            let image: p5.Image = getResultOrThrowError(
                state.resourceHandler.getResource(staticSquaddie.squaddieId.resources.mapIconResourceKey)
            );

            const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddie.dynamicSquaddieId);
            const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                datum.mapLocation.q, datum.mapLocation.r, ...state.camera.getCoordinates())

            dynamicSquaddie.mapIcon = new ImageUI({
                graphic: image,
                area: new RectArea({
                    left: xyCoords[0],
                    top: xyCoords[1],
                    width: image.width,
                    height: image.height,
                    horizAlign: HORIZ_ALIGN_CENTER,
                    vertAlign: VERT_ALIGN_CENTER
                })
            })
        });
    }

    private initializeCameraPosition(state: BattleOrchestratorState) {
        const mapDimensions = state.hexMap.getDimensions();
        state.camera.setMapDimensionBoundaries(mapDimensions.widthOfWidestRow, mapDimensions.numberOfRows);
    }

    private loadCutscenes(state: BattleOrchestratorState) {
        state.gameBoard.cutsceneCollection = new MissionCutsceneCollection({
            cutsceneById: {
                [DEFAULT_VICTORY_CUTSCENE_ID]: new Cutscene({
                    actions: [
                        new DialogueBox({
                            id: "1",
                            name: "Victory",
                            text: "Victory! YOU WIN!",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        })
                    ],
                    screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                }),
            }
        })
    }

    private loadObjectives(state: BattleOrchestratorState) {
        state.gameBoard.objectives = [
            new MissionObjective({
                reward: new MissionReward({
                    rewardType: MissionRewardType.VICTORY,
                }),
                conditions: [
                    new MissionConditionDefeatAllEnemies({squaddieRepository: state.squaddieRepository})
                ],
                cutsceneToPlayUponCompletion: "default_victory",
                numberOfCompletedConditions: "all",
            })
        ]
    }
}
