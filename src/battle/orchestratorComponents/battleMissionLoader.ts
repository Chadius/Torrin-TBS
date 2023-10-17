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
import {SquaddieAction} from "../../squaddie/action";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {ImageUI} from "../../ui/imageUI";
import {RectArea} from "../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {DamageType, HealingType} from "../../squaddie/squaddieService";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {SquaddieEmotion} from "../animation/actionAnimation/actionAnimationConstants";
import {Cutscene} from "../../cutscene/cutscene";
import {DialogueBox} from "../../cutscene/dialogue/dialogueBox";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {
    DEFAULT_DEFEAT_CUTSCENE_ID,
    DEFAULT_VICTORY_CUTSCENE_ID,
    MissionCutsceneCollection
} from "../orchestrator/missionCutsceneCollection";
import {MissionObjective} from "../missionResult/missionObjective";
import {MissionReward, MissionRewardType} from "../missionResult/missionReward";
import {MissionConditionDefeatAffiliation} from "../missionResult/missionConditionDefeatAffiliation";
import {GraphicImage} from "../../utils/graphics/graphicsContext";
import {CutsceneTrigger, MissionDefeatCutsceneTrigger} from "../../cutscene/cutsceneTrigger";
import {MissionVictoryCutsceneTrigger} from "../cutscene/missionVictoryCutsceneTrigger";
import {MissionStartOfPhaseCutsceneTrigger} from "../cutscene/missionStartOfPhaseCutsceneTrigger";
import {SplashScreen} from "../../cutscene/splashScreen";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

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
    squaddieTemplateResourceKeys: string[];
    bannerImageResourceKeys: string[];
    cutsceneResourceKeys: string[];

    constructor() {
        this.startedLoading = false;
        this.finishedPreparations = false;
    }

    update(state: BattleOrchestratorState) {
        if (!this.startedLoading) {
            this.loadMap(state);
            this.loadSquaddies(state);

            const cutsceneInfo = this.loadCutscenes(state);
            state.gameBoard.cutsceneTriggers = cutsceneInfo.cutsceneTriggers;
            state.gameBoard.cutsceneCollection = cutsceneInfo.cutsceneCollection;
            state.gameBoard.objectives = this.loadObjectives(state);
            return;
        }
        if (this.startedLoading && state.resourceHandler.areAllResourcesLoaded([
            ...mapMovementAndAttackIcons,
            ...this.affiliateIconResourceKeys,
            ...this.squaddieTemplateResourceKeys,
            ...this.bannerImageResourceKeys,
            ...this.cutsceneResourceKeys,
        ])) {
            this.initializeSquaddieResources(state);
            this.initializeCameraPosition(state);
            this.initializeCutscenes(state);
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
            pauseTimer: false,
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
                "x x x x x 2 2 1 1 1 1 1 2 2 x x x ",
                " 1 1 1 1 2 2 2 1 1 1 1 2 2 1 1 1 1 ",
                "  x x x x 2 2 1 1 1 1 1 2 2 1 1 1 1 ",
                "   1 1 1 x x x x x x x x x x x 1 1 1 ",
                "    1 1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 ",
                "     1 1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 ",
                "      1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 1 ",
                "       1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 1 1 ",
                "        x x x x x x x x x x x 2 1 1 1 1 1 ",
                "         1 1 1 1 1 1 x 2 2 2 1 1 1 1 2 2 2 ",
                "          1 1 1 1 1 x 2 1 1 1 1 1 1 1 1 1 2 ",
                "           1 1 1 1 x 2 1 1 1 2 2 2 1 1 1 1 2 ",
                "            1 1 1 x 2 1 1 1 1 O O 1 1 1 1 1 2 ",
                "             1 1 1 x 2 1 1 1 O O O 1 1 1 1 1 2 ",
                "              1 1 1 x 2 1 1 1 O O 1 1 1 1 1 1 2 ",
                "               1 1 1 x 2 1 1 1 1 1 1 1 1 1 1 2 x ",
                "                1 1 1 x 2 1 1 1 1 1 1 1 1 1 2 x 1 ",
                "                 1 1 1 x 2 2 2 2 2 2 2 2 2 2 x 1 1 ",
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
            new SquaddieTemplate({
                squaddieId: new SquaddieId({
                    templateId: "player_young_torrin",
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
                        traits: new TraitStatusStorage({}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                }),
                actions: [
                    new SquaddieAction({
                        name: "water cannon",
                        id: "torrin_water_cannon",
                        minimumRange: 0,
                        maximumRange: 2,
                        traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTION),
                        damageDescriptions: {
                            [DamageType.Body]: 2
                        }
                    }),
                    new SquaddieAction({
                        name: "healing touch",
                        id: "young_torrin_healing_touch",
                        minimumRange: 0,
                        maximumRange: 1,
                        traits: new TraitStatusStorage({
                            [Trait.SKIP_ANIMATION]: true,
                            [Trait.TARGETS_ALLIES]: true,
                            [Trait.HEALING]: true,
                        }).filterCategory(TraitCategory.ACTION),
                        actionPointCost: 2,
                        healingDescriptions: {[HealingType.LostHitPoints]: 2}
                    })
                ],
            }),
            new BattleSquaddie({
                battleSquaddieId: "player_young_torrin",
                squaddieTemplateId: "player_young_torrin",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie("player_young_torrin", "player_young_torrin", new HexCoordinate({q: 1, r: 0}));

        state.squaddieRepository.addSquaddie(
            new SquaddieTemplate({
                attributes: new ArmyAttributes({
                    maxHitPoints: 5,
                    armorClass: 2,
                    movement: new SquaddieMovement({
                        movementPerAction: 2,
                        traits: new TraitStatusStorage({}).filterCategory(TraitCategory.MOVEMENT)
                    }),
                }),
                squaddieId: new SquaddieId({
                    templateId: "player_sir_camil",
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
                actions: [
                    new SquaddieAction({
                        name: "longsword",
                        id: "sir_camil_longsword",
                        minimumRange: 0,
                        maximumRange: 1,
                        traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTION),
                        damageDescriptions: {
                            [DamageType.Body]: 2
                        }
                    })
                ],
            }),
            new BattleSquaddie({
                battleSquaddieId: "player_sir_camil",
                squaddieTemplateId: "player_sir_camil",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie("player_sir_camil", "player_sir_camil", new HexCoordinate({q: 1, r: 1}));
        this.addEnemyTeam(state);

        state.teamsByAffiliation[SquaddieAffiliation.PLAYER] = new BattleSquaddieTeam({
            affiliation: SquaddieAffiliation.PLAYER,
            name: "Crusaders",
            squaddieRepo: state.squaddieRepository,
            battleSquaddieIds: [
                "player_young_torrin",
                "player_sir_camil"
            ],
        });

        this.affiliateIconResourceKeys = [
            "affiliate_icon_crusaders",
            "affiliate_icon_infiltrators",
            "affiliate_icon_western",
            "affiliate_icon_none",
        ];
        state.resourceHandler.loadResources(this.affiliateIconResourceKeys);

        const squaddieTemplates: SquaddieTemplate[] = state.squaddieRepository.getSquaddieTemplateIterator().map(info => info.squaddieTemplate);
        this.squaddieTemplateResourceKeys = squaddieTemplates.map(squaddieTemplate => squaddieTemplate.squaddieId.resources.mapIconResourceKey);
        state.resourceHandler.loadResources(this.squaddieTemplateResourceKeys);

        this.bannerImageResourceKeys = [
            "phase banner player",
            "phase banner enemy",
        ];
        state.resourceHandler.loadResources(this.bannerImageResourceKeys);
    }

    private addEnemyTeam(state: BattleOrchestratorState) {
        const demonSlitherMold = new SquaddieTemplate({
            attributes: new ArmyAttributes({
                maxHitPoints: 3,
                armorClass: -5,
                movement: new SquaddieMovement({
                    movementPerAction: 2,
                    traits: new TraitStatusStorage({}).filterCategory(TraitCategory.MOVEMENT)
                }),
            }),
            squaddieId: new SquaddieId({
                templateId: "enemy_demon_slither",
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
            actions: [
                new SquaddieAction({
                    name: "Bite",
                    id: "demon_slither_bite",
                    minimumRange: 0,
                    maximumRange: 1,
                    traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTION),
                    damageDescriptions: {
                        [DamageType.Body]: 1
                    }
                })
            ],
        });
        state.squaddieRepository.addSquaddie(
            demonSlitherMold,
            new BattleSquaddie({
                battleSquaddieId: "enemy_demon_slither_0",
                squaddieTemplateId: "enemy_demon_slither",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie("enemy_demon_slither", "enemy_demon_slither_0", new HexCoordinate({q: 1, r: 5}));

        state.squaddieRepository.addBattleSquaddie(
            new BattleSquaddie({
                battleSquaddieId: "enemy_demon_slither_1",
                squaddieTemplateId: "enemy_demon_slither",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie("enemy_demon_slither", "enemy_demon_slither_1", new HexCoordinate({q: 1, r: 9}));

        state.squaddieRepository.addBattleSquaddie(
            new BattleSquaddie({
                battleSquaddieId: "enemy_demon_slither_2",
                squaddieTemplateId: "enemy_demon_slither",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie(
            "enemy_demon_slither",
            "enemy_demon_slither_2",
            new HexCoordinate({q: 1, r: 12})
        );

        state.squaddieRepository.addBattleSquaddie(
            new BattleSquaddie({
                battleSquaddieId: "enemy_demon_slither_3",
                squaddieTemplateId: "enemy_demon_slither",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie(
            "enemy_demon_slither",
            "enemy_demon_slither_3",
            new HexCoordinate({q: 5, r: 15})
        );

        state.squaddieRepository.addBattleSquaddie(
            new BattleSquaddie({
                battleSquaddieId: "enemy_demon_slither_4",
                squaddieTemplateId: "enemy_demon_slither",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie(
            "enemy_demon_slither",
            "enemy_demon_slither_4",
            new HexCoordinate({q: 7, r: 13})
        );

        state.squaddieRepository.addBattleSquaddie(
            new BattleSquaddie({
                battleSquaddieId: "enemy_demon_slither_5",
                squaddieTemplateId: "enemy_demon_slither",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie(
            "enemy_demon_slither",
            "enemy_demon_slither_5",
            new HexCoordinate({q: 10, r: 14})
        );

        state.squaddieRepository.addBattleSquaddie(
            new BattleSquaddie({
                battleSquaddieId: "enemy_demon_slither_6",
                squaddieTemplateId: "enemy_demon_slither",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie(
            "enemy_demon_slither",
            "enemy_demon_slither_6",
            new HexCoordinate({q: 13, r: 7})
        );

        state.squaddieRepository.addBattleSquaddie(
            new BattleSquaddie({
                battleSquaddieId: "enemy_demon_slither_7",
                squaddieTemplateId: "enemy_demon_slither",
                squaddieTurn: new SquaddieTurn()
            })
        );
        state.missionMap.addSquaddie(
            "enemy_demon_slither",
            "enemy_demon_slither_7",
            new HexCoordinate({q: 15, r: 10})
        );

        state.teamsByAffiliation[SquaddieAffiliation.ENEMY] = new BattleSquaddieTeam({
            affiliation: SquaddieAffiliation.ENEMY,
            name: "Infiltrators",
            squaddieRepo: state.squaddieRepository,
            battleSquaddieIds: [
                "enemy_demon_slither_0",
                "enemy_demon_slither_1",
                "enemy_demon_slither_2",
                "enemy_demon_slither_3",
                "enemy_demon_slither_4",
                "enemy_demon_slither_5",
                "enemy_demon_slither_6",
                "enemy_demon_slither_7",
            ],
        });
    }

    private initializeSquaddieResources(state: BattleOrchestratorState) {
        state.squaddieRepository.getBattleSquaddieIterator().forEach((info) => {
            const {battleSquaddie, battleSquaddieId} = info;
            const {squaddieTemplate} = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(battleSquaddieId));

            let image: GraphicImage = getResultOrThrowError(
                state.resourceHandler.getResource(squaddieTemplate.squaddieId.resources.mapIconResourceKey)
            );
            const datum = state.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);
            const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                datum.mapLocation.q, datum.mapLocation.r, ...state.camera.getCoordinates())

            battleSquaddie.mapIcon = new ImageUI({
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
        const cutsceneCollection = new MissionCutsceneCollection({
            cutsceneById: {
                [DEFAULT_VICTORY_CUTSCENE_ID]: new Cutscene({
                    resourceHandler: state.resourceHandler,
                    actions: [
                        new DialogueBox({
                            id: "victory_0",
                            name: "Sir Camil",
                            text: "That's the last of them.",
                            portraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "victory_1",
                            name: "Torrin",
                            text: "Yay! We did it!",
                            portraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "victory_report_0",
                            name: "Mission Report",
                            text: "Turns: $$TURN_COUNT\nTime: $$TIME_ELAPSED",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "victory_report_1",
                            name: "Mission Report",
                            text: "Damage Dealt: $$DAMAGE_DEALT_BY_PLAYER_TEAM\nDamage Taken: $$DAMAGE_TAKEN_BY_PLAYER_TEAM\nHealing: $$HEALING_RECEIVED_BY_PLAYER_TEAM",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new SplashScreen({
                            id: "victory_final",
                            screenImageResourceKey: "splash victory",
                        }),
                    ],
                    screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                }),
                [DEFAULT_DEFEAT_CUTSCENE_ID]: new Cutscene({
                    resourceHandler: state.resourceHandler,
                    actions: [
                        new DialogueBox({
                            id: "defeat_0",
                            name: "Torrin",
                            text: "We have to retreat!",
                            portraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "defeat_1",
                            name: "Sir Camil",
                            text: "Right. When we come back, let me take the lead, and let's take it slow.",
                            portraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new SplashScreen({
                            id: "defeat_final",
                            screenImageResourceKey: "splash defeat",
                        }),
                    ],
                    screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                }),
                "introduction": new Cutscene({
                    resourceHandler: state.resourceHandler,
                    actions: [
                        new DialogueBox({
                            id: "how_to_play_0",
                            name: "How to play",
                            text: "To move, click on Torrin or Sir Camil. Then click to blue boot to move.\nMore boots cost more action points.",
                            portraitResourceKey: "tutorial-map",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "how_to_play_1",
                            name: "How to play",
                            text: "Torrin and Sir Camil get 3 Action Points. You can spend them to move and act.",
                            portraitResourceKey: "tutorial-hud",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "how_to_play_2",
                            name: "How to play",
                            text: "To act, click on the actions on the bottom of the screen and then click on your target.\nClick Confirm and watch the sparks fly.\nYou can always end your turn early by clicking the End Turn action.",
                            portraitResourceKey: "tutorial-hud",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "how_to_play_3",
                            portraitResourceKey: "young torrin cutscene portrait",
                            name: "Torrin",
                            text: "Torrin can use her Water Cannon to attack from range.\nHealing Touch will heal herself or Sir Camil for 2, but it costs 2 action points.",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "how_to_play_4",
                            name: "Sir Camil",
                            text: "Sir Camil has more health.\nHe has a longsword for melee attacks.",
                            portraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                    ],
                    screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                }),
                "turn1": new Cutscene({
                    resourceHandler: state.resourceHandler,
                    actions: [
                        new DialogueBox({
                            id: "turn1_0",
                            name: "Torrin",
                            text: "How did they breach us so quickly?\nWithout raising an alarm?\nUgh! Let's get rid of them.",
                            portraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "turn1_1",
                            name: "Sir Camil",
                            text: "I agree. The courtyard must be cleansed.\nI'll take the lead. Stay behind me and heal me if I get hurt.\nIf we fight one at a time we should be alright.",
                            portraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                    ],
                    screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                }),
                "turn2": new Cutscene({
                    resourceHandler: state.resourceHandler,
                    actions: [
                        new DialogueBox({
                            id: "turn2_0",
                            name: "Sir Camil",
                            text: "And all of this sand poured in this morning... I can barely move through it.",
                            portraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "turn2_1",
                            name: "Torrin",
                            text: "Yes, the sand slows everyone down.\nThe demons, too. Let them waste energy coming to us.",
                            portraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        })
                    ],
                    screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                }),
                "turn4": new Cutscene({
                    resourceHandler: state.resourceHandler,
                    actions: [
                        new DialogueBox({
                            id: "turn4_0",
                            name: "Torrin",
                            text: "I can barely see ahead of us. What's going on down there?",
                            portraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "turn4_1",
                            name: "Sir Camil",
                            text: "If you move the pointer to the edges of the screen, we can move the camera a bit.",
                            portraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        })
                    ],
                    screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                }),
                "turn5": new Cutscene({
                    resourceHandler: state.resourceHandler,
                    actions: [
                        new DialogueBox({
                            id: "turn5_0",
                            name: "Sir Camil",
                            text: "What are those demons thinking? I don't know how far they can reach.",
                            portraitResourceKey: "sir camil cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        }),
                        new DialogueBox({
                            id: "turn5_1",
                            name: "Torrin",
                            text: "I can... tell where they can move. If you just... er, click on them, I can see it.",
                            portraitResourceKey: "young torrin cutscene portrait",
                            animationDuration: 0,
                            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                        })
                    ],
                    screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
                }),
            },
        })

        this.cutsceneResourceKeys = Object.values(cutsceneCollection.cutsceneById).map((cutscene) => {
            return cutscene.allResourceKeys;
        }).flat()
        state.resourceHandler.loadResources(this.cutsceneResourceKeys);

        const cutsceneTriggers: CutsceneTrigger[] = [
            new MissionVictoryCutsceneTrigger({cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID}),
            new MissionDefeatCutsceneTrigger({cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID}),
            new MissionStartOfPhaseCutsceneTrigger({cutsceneId: "introduction", turn: 0}),
            new MissionStartOfPhaseCutsceneTrigger({cutsceneId: "turn1", turn: 1}),
            new MissionStartOfPhaseCutsceneTrigger({cutsceneId: "turn2", turn: 2}),
            new MissionStartOfPhaseCutsceneTrigger({cutsceneId: "turn4", turn: 4}),
            new MissionStartOfPhaseCutsceneTrigger({cutsceneId: "turn5", turn: 5}),
        ];

        return {
            cutsceneCollection,
            cutsceneTriggers,
        }
    }

    private initializeCutscenes(state: BattleOrchestratorState) {
        Object.entries(state.gameBoard.cutsceneCollection.cutsceneById).forEach(([id, cutscene]) => {
            cutscene.setResources();
        })
    }

    private loadObjectives(state: BattleOrchestratorState) {
        return [
            new MissionObjective({
                reward: new MissionReward({
                    rewardType: MissionRewardType.VICTORY,
                }),
                conditions: [
                    new MissionConditionDefeatAffiliation({
                        affiliation: SquaddieAffiliation.ENEMY,
                    }),
                ],
                numberOfCompletedConditions: "all",
            }),
            new MissionObjective({
                reward: new MissionReward({
                    rewardType: MissionRewardType.DEFEAT,
                }),
                conditions: [
                    new MissionConditionDefeatAffiliation({
                        affiliation: SquaddieAffiliation.PLAYER,
                    }),
                ],
                numberOfCompletedConditions: "all",
            })
        ]
    }
}
