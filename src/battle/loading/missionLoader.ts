import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMap} from "../../missionMap/missionMap";
import {LoadMissionFromFile, MissionFileFormat} from "../../dataLoader/missionLoader";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MissionObjective, MissionObjectiveHelper} from "../missionResult/missionObjective";
import {
    DEFAULT_DEFEAT_CUTSCENE_ID,
    DEFAULT_VICTORY_CUTSCENE_ID,
    MissionCutsceneCollection,
    MissionCutsceneCollectionHelper
} from "../orchestrator/missionCutsceneCollection";
import {CutsceneTrigger, TriggeringEvent} from "../../cutscene/cutsceneTrigger";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieEmotion} from "../animation/actionAnimation/actionAnimationConstants";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {SquaddieActionHandler} from "../../squaddie/action";
import {DamageType, HealingType} from "../../squaddie/squaddieService";
import {BattleSquaddieHelper} from "../battleSquaddie";
import {SquaddieTurnHandler} from "../../squaddie/turn";
import {SquaddieTemplate, SquaddieTemplateHelper} from "../../campaign/squaddieTemplate";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {GraphicImage} from "../../utils/graphics/graphicsContext";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {ImageUI} from "../../ui/imageUI";
import {RectAreaHelper} from "../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {BattleCamera} from "../battleCamera";
import {Cutscene} from "../../cutscene/cutscene";
import {DialogueBox} from "../../cutscene/dialogue/dialogueBox";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {SplashScreen} from "../../cutscene/splashScreen";
import {LoadFileIntoFormat} from "../../dataLoader/dataLoader";

export const MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS: string[] = [
    "map icon move 1 action",
    "map icon move 2 actions",
    "map icon move 3 actions",
    "map icon attack 1 action"
];

export const MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS: string[] = [
    "armor class icon",
    "hit points icon",
];

export interface MissionLoaderCompletionProgress {
    started: boolean;
    loadedFileData: boolean;
}

export interface MissionLoaderContext {
    id: string;
    objectives: MissionObjective[];
    missionMap: MissionMap | undefined;
    resourcesPendingLoading: string[];
    completionProgress: MissionLoaderCompletionProgress;
    squaddieData: {
        teams: BattleSquaddieTeam[];
        teamStrategyById: { [key: string]: TeamStrategy[] };
        templates: { [id: string]: SquaddieTemplate };
    };
    cutsceneInfo: {
        cutsceneCollection: MissionCutsceneCollection,
        cutsceneTriggers: CutsceneTrigger[],
    };
    mapSettings: {
        camera: BattleCamera,
    };
}

export const MissionLoader = {
    newEmptyMissionLoaderStatus: (): MissionLoaderContext => {
        return {
            id: "",
            missionMap: undefined,
            objectives: [],
            resourcesPendingLoading: [],
            completionProgress: {
                started: false,
                loadedFileData: false,
            },
            squaddieData: {
                teams: [],
                teamStrategyById: {},
                templates: {},
            },
            cutsceneInfo: {
                cutsceneCollection: undefined,
                cutsceneTriggers: [],
            },
            mapSettings: {
                camera: undefined,
            },
        }
    },
    loadMissionFromFile: async ({
                                    missionLoaderContext,
                                    missionId,
                                    resourceHandler,
                                    squaddieRepository,
                                }: {
        missionLoaderContext: MissionLoaderContext;
        missionId: string;
        resourceHandler: ResourceHandler;
        squaddieRepository: BattleSquaddieRepository;
    }) => {
        missionLoaderContext.completionProgress.started = true;
        const missionData: MissionFileFormat = await LoadMissionFromFile(missionId);

        missionLoaderContext.id = missionData.id;

        missionLoaderContext.missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: missionData.terrain,
                resourceHandler,
            })
        });

        resourceHandler.loadResources(MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS);
        missionLoaderContext.resourcesPendingLoading = [
            ...missionLoaderContext.resourcesPendingLoading,
            ...MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS,
        ];

        resourceHandler.loadResources(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS);
        missionLoaderContext.resourcesPendingLoading = [
            ...missionLoaderContext.resourcesPendingLoading,
            ...MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS,
        ];

        missionLoaderContext.objectives = missionData.objectives.map(MissionObjectiveHelper.validateMissionObjective);

        missionLoaderContext.completionProgress.loadedFileData = true;

        missionLoaderContext.squaddieData.templates = {};
        missionData.enemy.templateIds.forEach(id => missionLoaderContext.squaddieData.templates[id] = undefined);

        await loadAndPrepareAllTemplateData({
            missionLoaderStatus: missionLoaderContext,
            resourceHandler,
            squaddieRepository
        });
        spawnSquaddiesAndAddToMap({missionLoaderStatus: missionLoaderContext, squaddieRepository, missionData});
        createSquaddieTeams({missionLoaderContext, missionData});

        initializeCameraPosition({missionLoaderStatus: missionLoaderContext});
    },
    loadMissionFromHardcodedData: ({
                                       missionLoaderStatus,
                                       squaddieRepository,
                                       resourceHandler,
                                   }: {
        missionLoaderStatus: MissionLoaderContext,
        squaddieRepository: BattleSquaddieRepository,
        resourceHandler: ResourceHandler,
    }) => {
        loadMissionFromHardcodedData({
            missionLoaderStatus,
            squaddieRepository,
            resourceHandler,
        });
    },
    checkResourcesPendingLoading: ({missionLoaderStatus, resourceHandler}: {
        missionLoaderStatus: MissionLoaderContext,
        resourceHandler: ResourceHandler,
    }) => {
        missionLoaderStatus.resourcesPendingLoading = missionLoaderStatus.resourcesPendingLoading.filter(
            resourceKey => {
                return resourceHandler.isResourceLoaded(resourceKey) !== true;
            }
        );
    },
    assignResourceHandlerResources: ({
                                         squaddieRepository,
                                         missionLoaderStatus,
                                         resourceHandler,
                                     }: {
        squaddieRepository: BattleSquaddieRepository;
        missionLoaderStatus: MissionLoaderContext;
        resourceHandler: ResourceHandler
    }) => {
        initializeCutscenes({missionLoaderStatus});
        initializeSquaddieResources({squaddieRepository, missionLoaderStatus, resourceHandler});
    }
}

const initializeCameraPosition = ({
                                      missionLoaderStatus,
                                  }: {
    missionLoaderStatus: MissionLoaderContext;
}) => {
    const mapDimensions = missionLoaderStatus.missionMap.terrainTileMap.getDimensions();
    missionLoaderStatus.mapSettings.camera = new BattleCamera();
    missionLoaderStatus.mapSettings.camera.setMapDimensionBoundaries(mapDimensions.widthOfWidestRow, mapDimensions.numberOfRows);
}

const initializeSquaddieResources = ({
                                         squaddieRepository,
                                         missionLoaderStatus,
                                         resourceHandler,
                                     }: {
    squaddieRepository: BattleSquaddieRepository;
    missionLoaderStatus: MissionLoaderContext;
    resourceHandler: ResourceHandler
}) => {
    squaddieRepository.getBattleSquaddieIterator().forEach((info) => {
        const {battleSquaddie, battleSquaddieId} = info;
        const {squaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));

        let image: GraphicImage = getResultOrThrowError(
            resourceHandler.getResource(squaddieTemplate.squaddieId.resources.mapIconResourceKey)
        );
        const datum = missionLoaderStatus.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);

        if (datum.mapLocation !== undefined) {
            const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                datum.mapLocation.q, datum.mapLocation.r, ...missionLoaderStatus.mapSettings.camera.getCoordinates())

            squaddieRepository.imageUIByBattleSquaddieId[battleSquaddieId] = new ImageUI({
                graphic: image,
                area: RectAreaHelper.new({
                    left: xyCoords[0],
                    top: xyCoords[1],
                    width: image.width,
                    height: image.height,
                    horizAlign: HORIZ_ALIGN_CENTER,
                    vertAlign: VERT_ALIGN_CENTER
                })
            });
        }
    });
}

const initializeCutscenes = ({
                                 missionLoaderStatus,
                             }: {
    missionLoaderStatus: MissionLoaderContext;
}) => {
    Object.entries(missionLoaderStatus.cutsceneInfo.cutsceneCollection.cutsceneById).forEach(([id, cutscene]) => {
        cutscene.setResources();
    });
}

const loadMissionFromHardcodedData = ({
                                          missionLoaderStatus,
                                          squaddieRepository,
                                          resourceHandler,
                                      }: {
    missionLoaderStatus: MissionLoaderContext,
    squaddieRepository: BattleSquaddieRepository,
    resourceHandler: ResourceHandler,
}) => {
    loadTorrin({
        missionLoaderStatus,
        squaddieRepository,
        resourceHandler,
    });

    loadSirCamil({
        missionLoaderStatus,
        squaddieRepository,
        resourceHandler,
    });
    loadTeamInfo({missionLoaderStatus});

    const affiliateIconResourceKeys = [
        "affiliate_icon_crusaders",
        "affiliate_icon_infiltrators",
        "affiliate_icon_western",
        "affiliate_icon_none",
    ];
    resourceHandler.loadResources(affiliateIconResourceKeys);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        ...affiliateIconResourceKeys,
    ];

    const bannerImageResourceKeys = [
        "phase banner player",
        "phase banner enemy",
    ];
    resourceHandler.loadResources(bannerImageResourceKeys);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        ...bannerImageResourceKeys,
    ];

    loadCutscenes({
        missionLoaderStatus,
        squaddieRepository,
        resourceHandler,
    });
};

const loadCutscenes = ({
                           missionLoaderStatus,
                           squaddieRepository,
                           resourceHandler,
                       }: {
    missionLoaderStatus: MissionLoaderContext,
    squaddieRepository: BattleSquaddieRepository,
    resourceHandler: ResourceHandler,
}) => {
    const cutsceneCollection = MissionCutsceneCollectionHelper.new({
        cutsceneById: {
            [DEFAULT_VICTORY_CUTSCENE_ID]: new Cutscene({
                resourceHandler,
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
                resourceHandler: resourceHandler,
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
                resourceHandler: resourceHandler,
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
                resourceHandler: resourceHandler,
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
                resourceHandler: resourceHandler,
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
                resourceHandler: resourceHandler,
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
                resourceHandler: resourceHandler,
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

    const cutsceneResourceKeys = Object.values(cutsceneCollection.cutsceneById).map((cutscene) => {
        return cutscene.allResourceKeys;
    }).flat();
    resourceHandler.loadResources(cutsceneResourceKeys);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        ...cutsceneResourceKeys
    ];

    const cutsceneTriggers: CutsceneTrigger[] = [
        {
            triggeringEvent: TriggeringEvent.MISSION_VICTORY,
            cutsceneId: DEFAULT_VICTORY_CUTSCENE_ID,
            systemReactedToTrigger: false,
        },
        {
            triggeringEvent: TriggeringEvent.MISSION_DEFEAT,
            cutsceneId: DEFAULT_DEFEAT_CUTSCENE_ID,
            systemReactedToTrigger: false,
        },
        {
            triggeringEvent: TriggeringEvent.START_OF_TURN,
            systemReactedToTrigger: false,
            cutsceneId: "introduction",
            turn: 0,
        },
        {
            triggeringEvent: TriggeringEvent.START_OF_TURN,
            systemReactedToTrigger: false,
            cutsceneId: "turn1",
            turn: 1,
        },
        {
            triggeringEvent: TriggeringEvent.START_OF_TURN,
            systemReactedToTrigger: false,
            cutsceneId: "turn2",
            turn: 2,
        },
        {
            triggeringEvent: TriggeringEvent.START_OF_TURN,
            systemReactedToTrigger: false,
            cutsceneId: "turn4",
            turn: 4,
        },
        {
            triggeringEvent: TriggeringEvent.START_OF_TURN,
            systemReactedToTrigger: false,
            cutsceneId: "turn5",
            turn: 5,
        },
    ];

    missionLoaderStatus.cutsceneInfo.cutsceneCollection = cutsceneCollection;
    missionLoaderStatus.cutsceneInfo.cutsceneTriggers = cutsceneTriggers;
}

const loadTorrin = ({
                        missionLoaderStatus,
                        squaddieRepository,
                        resourceHandler,
                    }: {
    missionLoaderStatus: MissionLoaderContext,
    squaddieRepository: BattleSquaddieRepository,
    resourceHandler: ResourceHandler,
}) => {
    const mapIconResourceKey = "map icon young torrin";
    squaddieRepository.addSquaddie(
        {
            squaddieId: {
                templateId: "player_young_torrin",
                name: "Torrin",
                resources: {
                    mapIconResourceKey,
                    actionSpritesByEmotion: {
                        [SquaddieEmotion.NEUTRAL]: "combat-young-torrin-neutral",
                        [SquaddieEmotion.ATTACK]: "combat-young-torrin-attack",
                        [SquaddieEmotion.TARGETED]: "combat-young-torrin-targeted",
                        [SquaddieEmotion.DAMAGED]: "combat-young-torrin-damaged",
                        [SquaddieEmotion.DEAD]: "combat-young-torrin-dead",
                    },
                },
                traits: TraitStatusStorageHelper.newUsingTraitValues({
                    [Trait.HUMANOID]: true,
                    [Trait.MONSU]: true
                }),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            attributes: {
                maxHitPoints: 3,
                armorClass: 6,
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageHelper.newUsingTraitValues(),
                }),
            },
            actions: [
                SquaddieActionHandler.new({
                    name: "water cannon",
                    id: "torrin_water_cannon",
                    minimumRange: 0,
                    maximumRange: 2,
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    damageDescriptions: {
                        [DamageType.BODY]: 2
                    }
                }),
                SquaddieActionHandler.new({
                    name: "healing touch",
                    id: "young_torrin_healing_touch",
                    minimumRange: 0,
                    maximumRange: 1,
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.SKIP_ANIMATION]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.TARGETS_ALLIES]: true,
                        [Trait.HEALING]: true,
                    }),
                    actionPointCost: 2,
                    healingDescriptions: {[HealingType.LOST_HIT_POINTS]: 2}
                })
            ],
        },
        BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "player_young_torrin",
            squaddieTemplateId: "player_young_torrin",
            squaddieTurn: SquaddieTurnHandler.new(),
        })
    );
    missionLoaderStatus.missionMap.addSquaddie("player_young_torrin", "player_young_torrin", {q: 1, r: 0});

    resourceHandler.loadResources([mapIconResourceKey]);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        mapIconResourceKey
    ];
};

const loadSirCamil = ({
                          missionLoaderStatus,
                          squaddieRepository,
                          resourceHandler,
                      }: {
    missionLoaderStatus: MissionLoaderContext,
    squaddieRepository: BattleSquaddieRepository,
    resourceHandler: ResourceHandler,
}) => {
    const mapIconResourceKey = "map icon sir camil";
    squaddieRepository.addSquaddie(
        {
            attributes: {
                maxHitPoints: 5,
                armorClass: 8,
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageHelper.newUsingTraitValues(),
                }),
            },
            squaddieId: {
                templateId: "player_sir_camil",
                name: "Sir Camil",
                resources: {
                    mapIconResourceKey,
                    actionSpritesByEmotion: {
                        [SquaddieEmotion.NEUTRAL]: "combat-sir-camil-neutral",
                        [SquaddieEmotion.ATTACK]: "combat-sir-camil-attack",
                        [SquaddieEmotion.TARGETED]: "combat-sir-camil-targeted",
                        [SquaddieEmotion.DAMAGED]: "combat-sir-camil-damaged",
                        [SquaddieEmotion.DEAD]: "combat-sir-camil-dead",
                    },
                },
                traits: TraitStatusStorageHelper.newUsingTraitValues({
                    [Trait.HUMANOID]: true,
                }),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            actions: [
                SquaddieActionHandler.new({
                    name: "longsword",
                    id: "sir_camil_longsword",
                    minimumRange: 0,
                    maximumRange: 1,
                    traits: TraitStatusStorageHelper.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    damageDescriptions: {
                        [DamageType.BODY]: 2
                    }
                })
            ],
        },
        BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "player_sir_camil",
            squaddieTemplateId: "player_sir_camil",
            squaddieTurn: SquaddieTurnHandler.new(),
        })
    );
    missionLoaderStatus.missionMap.addSquaddie("player_sir_camil", "player_sir_camil", {q: 1, r: 1});

    resourceHandler.loadResources([mapIconResourceKey]);
    missionLoaderStatus.resourcesPendingLoading = [
        ...missionLoaderStatus.resourcesPendingLoading,
        mapIconResourceKey
    ];
};

function loadTeamInfo({missionLoaderStatus}: {
    missionLoaderStatus: MissionLoaderContext
}) {
    missionLoaderStatus.squaddieData.teams ||= [];
    missionLoaderStatus.squaddieData.teams.push(
        {
            id: "playerTeam",
            affiliation: SquaddieAffiliation.PLAYER,
            name: "Crusaders",
            battleSquaddieIds: [
                "player_young_torrin",
                "player_sir_camil"
            ],
        }
    );
}

const loadTemplatesFromFile = async (templateIds: string[]): Promise<{ [p: string]: SquaddieTemplate }> => {
    let squaddiesById: { [p: string]: SquaddieTemplate } = {};
    for (const templateId of templateIds) {
        try {
            squaddiesById[templateId] = await LoadFileIntoFormat<SquaddieTemplate>(`assets/npcData/templates/${templateId}.json`)
        } catch (e) {
            console.error(`Failed to load template: ${templateId}`);
            console.error(e);
            throw e;
        }
    }
    return squaddiesById;
}

const loadAndPrepareAllTemplateData = async ({
                                                 missionLoaderStatus,
                                                 resourceHandler,
                                                 squaddieRepository,
                                             }: {
    missionLoaderStatus: MissionLoaderContext;
    resourceHandler: ResourceHandler
    squaddieRepository: BattleSquaddieRepository;
}) => {
    let loadedTemplatesById: { [p: string]: SquaddieTemplate } = {};
    loadedTemplatesById = await loadTemplatesFromFile(Object.keys(missionLoaderStatus.squaddieData.templates));
    Object.values(loadedTemplatesById).forEach(template => {
        SquaddieTemplateHelper.sanitize(template);
    });

    Object.assign(missionLoaderStatus.squaddieData.templates, loadedTemplatesById);

    Object.values(loadedTemplatesById).forEach(template => {
        resourceHandler.loadResource(template.squaddieId.resources.mapIconResourceKey);
        missionLoaderStatus.resourcesPendingLoading.push(template.squaddieId.resources.mapIconResourceKey);

        resourceHandler.loadResources(Object.values(template.squaddieId.resources.actionSpritesByEmotion));
        missionLoaderStatus.resourcesPendingLoading.push(
            ...Object.values(template.squaddieId.resources.actionSpritesByEmotion)
        );

        squaddieRepository.addSquaddieTemplate(template);
    });
}

const spawnSquaddiesAndAddToMap = ({
                                       squaddieRepository,
                                       missionLoaderStatus,
                                       missionData
                                   }: {
    squaddieRepository: BattleSquaddieRepository,
    missionLoaderStatus: MissionLoaderContext,
    missionData: MissionFileFormat,
}) => {
    missionData.enemy.mapPlacements.forEach(mapPlacement => {
        let {
            location,
            battleSquaddieId,
            squaddieTemplateId,
        } = mapPlacement;
        squaddieRepository.addBattleSquaddie(
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId,
                squaddieTemplateId,
                squaddieTurn: SquaddieTurnHandler.new(),
            })
        );
        missionLoaderStatus.missionMap.addSquaddie(squaddieTemplateId, battleSquaddieId, location);
    });
}

const createSquaddieTeams = ({missionData, missionLoaderContext}: {
    missionData: MissionFileFormat;
    missionLoaderContext: MissionLoaderContext
}) => {
    missionData.enemy.teams.forEach(enemyTeam => {
        const team: BattleSquaddieTeam = {
            id: enemyTeam.id,
            name: enemyTeam.name,
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: enemyTeam.battleSquaddieIds,
        }
        missionLoaderContext.squaddieData.teams ||= [];
        missionLoaderContext.squaddieData.teams.push(team);
        missionLoaderContext.squaddieData.teamStrategyById[team.id] ||= [];
        missionLoaderContext.squaddieData.teamStrategyById[team.id].push(...enemyTeam.strategies);
    });
}
