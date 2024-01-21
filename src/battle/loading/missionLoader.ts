import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionMap} from "../../missionMap/missionMap";
import {LoadMissionFromFile, LoadPlayerArmyFromFile, MissionFileFormat} from "../../dataLoader/missionLoader";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MissionObjective, MissionObjectiveHelper} from "../missionResult/missionObjective";
import {MissionCutsceneCollection, MissionCutsceneCollectionHelper} from "../orchestrator/missionCutsceneCollection";
import {CutsceneTrigger} from "../../cutscene/cutsceneTrigger";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {TeamStrategy} from "../teamStrategy/teamStrategy";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";
import {SquaddieTurnService} from "../../squaddie/turn";
import {SquaddieTemplate, SquaddieTemplateService} from "../../campaign/squaddieTemplate";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {GraphicImage} from "../../utils/graphics/graphicsContext";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {ImageUI} from "../../ui/imageUI";
import {RectAreaService} from "../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {BattleCamera} from "../battleCamera";
import {CutsceneService} from "../../cutscene/cutscene";
import {LoadFileIntoFormat} from "../../dataLoader/dataLoader";
import {PlayerArmy} from "../../campaign/playerArmy";
import {SquaddieResource} from "../../squaddie/resource";
import {InBattleAttributesHandler} from "../stats/inBattleAttributes";
import {isValidValue} from "../../utils/validityCheck";

export const MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS: string[] = [
    "map icon move 1 action",
    "map icon move 2 actions",
    "map icon move 3 actions",
    "map icon attack 1 action"
];

export const MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS: string[] = [
    "armor class icon",
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
    phaseBannersByAffiliation: { [affiliation in SquaddieAffiliation]?: string };
}

export const MissionLoader = {
    newEmptyMissionLoaderContext: (): MissionLoaderContext => {
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
            phaseBannersByAffiliation: {
                [SquaddieAffiliation.PLAYER]: "",
                [SquaddieAffiliation.ENEMY]: "",
                [SquaddieAffiliation.ALLY]: "",
                [SquaddieAffiliation.NONE]: "",
            },
        }
    },
    loadMissionFromFile: async ({
                                    missionLoaderContext,
                                    missionId,
                                    resourceHandler,
                                    repository,
                                }: {
        missionLoaderContext: MissionLoaderContext;
        missionId: string;
        resourceHandler: ResourceHandler;
        repository: ObjectRepository;
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

        await loadAndPrepareNPCTemplateData({
            missionLoaderContext: missionLoaderContext,
            resourceHandler,
            repository: repository
        });

        createPlayerSquaddieTeam(missionLoaderContext, missionData);
        deployRequiredPlayerSquaddies(missionLoaderContext, missionData);

        spawnNPCSquaddiesAndAddToMap({missionLoaderContext: missionLoaderContext, repository: repository, missionData});
        createSquaddieTeams({missionLoaderContext, missionData});

        initializeCameraPosition({missionLoaderContext: missionLoaderContext});

        loadPhaseAffiliationBanners(missionLoaderContext, missionData, repository, resourceHandler);
        loadTeamIcons(missionLoaderContext, missionData, repository, resourceHandler);
        loadCutscenes({
            missionLoaderContext,
            missionData,
            resourceHandler,
        });
    },
    checkResourcesPendingLoading: ({missionLoaderContext, resourceHandler}: {
        missionLoaderContext: MissionLoaderContext,
        resourceHandler: ResourceHandler,
    }) => {
        missionLoaderContext.resourcesPendingLoading = missionLoaderContext.resourcesPendingLoading.filter(
            resourceKey => {
                return resourceHandler.isResourceLoaded(resourceKey) !== true;
            }
        );
    },
    assignResourceHandlerResources: ({
                                         repository,
                                         missionLoaderContext,
                                         resourceHandler,
                                     }: {
        repository: ObjectRepository;
        missionLoaderContext: MissionLoaderContext;
        resourceHandler: ResourceHandler
    }) => {
        initializeCutscenes({missionLoaderContext, resourceHandler});
        initializeSquaddieResources({repository: repository, missionLoaderContext, resourceHandler});
    },
    loadPlayerArmyFromFile: async ({squaddieRepository, resourceHandler, missionLoaderContext}: {
        squaddieRepository: ObjectRepository;
        resourceHandler: ResourceHandler;
        missionLoaderContext: MissionLoaderContext
    }) => {
        const playerArmyData: PlayerArmy = await LoadPlayerArmyFromFile();
        playerArmyData.squaddieTemplates.forEach(template => {
            SquaddieTemplateService.sanitize(template);
            missionLoaderContext.squaddieData.templates[template.squaddieId.templateId] = template;
        });

        playerArmyData.squaddieTemplates.forEach(template => {
            const resources = template.squaddieId.resources;
            loadSquaddieTemplateResources({missionLoaderContext, resources, resourceHandler});
        });

        playerArmyData.squaddieTemplates.forEach(template => {
            const battleSquaddie: BattleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: template.squaddieId.templateId,
                inBattleAttributes: InBattleAttributesHandler.new(template.attributes),
                squaddieTemplate: template,
            })

            ObjectRepositoryService.addSquaddie(squaddieRepository, template, battleSquaddie);
        });
    }
}

const loadSquaddieTemplateResources = ({
                                           missionLoaderContext,
                                           resources,
                                           resourceHandler,
                                       }: {
    missionLoaderContext: MissionLoaderContext,
    resources: SquaddieResource,
    resourceHandler: ResourceHandler,
}) => {
    resourceHandler.loadResources([resources.mapIconResourceKey]);
    missionLoaderContext.resourcesPendingLoading.push(resources.mapIconResourceKey);

    resourceHandler.loadResources(Object.values(resources.actionSpritesByEmotion));
    missionLoaderContext.resourcesPendingLoading.push(...Object.values(resources.actionSpritesByEmotion));
};

const initializeCameraPosition = ({
                                      missionLoaderContext,
                                  }: {
    missionLoaderContext: MissionLoaderContext;
}) => {
    const mapDimensions = missionLoaderContext.missionMap.terrainTileMap.getDimensions();
    missionLoaderContext.mapSettings.camera = new BattleCamera();
    missionLoaderContext.mapSettings.camera.setMapDimensionBoundaries(mapDimensions.widthOfWidestRow, mapDimensions.numberOfRows);
}

const initializeSquaddieResources = ({
                                         repository,
                                         missionLoaderContext,
                                         resourceHandler,
                                     }: {
    repository: ObjectRepository;
    missionLoaderContext: MissionLoaderContext;
    resourceHandler: ResourceHandler
}) => {
    ObjectRepositoryService.getBattleSquaddieIterator(repository).forEach((info) => {
        const {battleSquaddie, battleSquaddieId} = info;
        const {squaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieId));

        let image: GraphicImage = getResultOrThrowError(
            resourceHandler.getResource(squaddieTemplate.squaddieId.resources.mapIconResourceKey)
        );
        const datum = missionLoaderContext.missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);

        if (datum.mapLocation !== undefined) {
            const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                datum.mapLocation.q, datum.mapLocation.r, ...missionLoaderContext.mapSettings.camera.getCoordinates())

            repository.imageUIByBattleSquaddieId[battleSquaddieId] = new ImageUI({
                graphic: image,
                area: RectAreaService.new({
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
                                 missionLoaderContext,
                                 resourceHandler,
                             }: {
    missionLoaderContext: MissionLoaderContext;
    resourceHandler: ResourceHandler;
}) => {
    Object.entries(missionLoaderContext.cutsceneInfo.cutsceneCollection.cutsceneById).forEach(([id, cutscene]) => {
        CutsceneService.setResources(cutscene, resourceHandler);
    });
}

const loadCutscenes = ({
                           missionLoaderContext,
                           missionData,
                           resourceHandler,
                       }: {
    missionLoaderContext: MissionLoaderContext,
    resourceHandler: ResourceHandler,
    missionData: MissionFileFormat,
}) => {
    const cutsceneById = Object.fromEntries(
        Object.entries(missionData.cutscene.cutsceneById).map(([key, rawCutscene]) => {
            const cutscene = CutsceneService.new(rawCutscene);
            return [key, cutscene];
        })
    );

    const cutsceneCollection = MissionCutsceneCollectionHelper.new({
        cutsceneById,
    })

    const cutsceneResourceKeys = Object.values(cutsceneCollection.cutsceneById).map((cutscene) => {
        return cutscene.allResourceKeys;
    }).flat();
    resourceHandler.loadResources(cutsceneResourceKeys);
    missionLoaderContext.resourcesPendingLoading = [
        ...missionLoaderContext.resourcesPendingLoading,
        ...cutsceneResourceKeys
    ];

    const cutsceneTriggers: CutsceneTrigger[] = missionData.cutscene.cutsceneTriggers;

    missionLoaderContext.cutsceneInfo.cutsceneCollection = cutsceneCollection;
    missionLoaderContext.cutsceneInfo.cutsceneTriggers = cutsceneTriggers;
}

const loadNPCTemplatesFromFile = async (templateIds: string[]): Promise<{ [p: string]: SquaddieTemplate }> => {
    let squaddiesById: { [p: string]: SquaddieTemplate } = {};
    for (const templateId of templateIds) {
        try {
            const squaddieTemplate = await LoadFileIntoFormat<SquaddieTemplate>(`assets/npcData/templates/${templateId}.json`)
            squaddiesById[templateId] = SquaddieTemplateService.sanitize(squaddieTemplate);
        } catch (e) {
            console.error(`Failed to load template: ${templateId}`);
            console.error(e);
            throw e;
        }
    }
    return squaddiesById;
}

const loadAndPrepareNPCTemplateData = async ({
                                                 missionLoaderContext,
                                                 resourceHandler,
                                                 repository,
                                             }: {
    missionLoaderContext: MissionLoaderContext;
    resourceHandler: ResourceHandler
    repository: ObjectRepository;
}) => {
    let loadedTemplatesById: { [p: string]: SquaddieTemplate } = {};
    const loadedNPCTemplatesById = await loadNPCTemplatesFromFile(Object.keys(missionLoaderContext.squaddieData.templates));
    loadedTemplatesById = {...loadedNPCTemplatesById};

    Object.values(loadedTemplatesById).forEach(template => {
        SquaddieTemplateService.sanitize(template);
    });

    Object.assign(missionLoaderContext.squaddieData.templates, loadedTemplatesById);

    Object.values(loadedTemplatesById).forEach(template => {
        resourceHandler.loadResource(template.squaddieId.resources.mapIconResourceKey);
        missionLoaderContext.resourcesPendingLoading.push(template.squaddieId.resources.mapIconResourceKey);

        resourceHandler.loadResources(Object.values(template.squaddieId.resources.actionSpritesByEmotion));
        missionLoaderContext.resourcesPendingLoading.push(
            ...Object.values(template.squaddieId.resources.actionSpritesByEmotion)
        );

        ObjectRepositoryService.addSquaddieTemplate(repository, template);
    });
}

const spawnNPCSquaddiesAndAddToMap = ({
                                          repository,
                                          missionLoaderContext,
                                          missionData
                                      }: {
    repository: ObjectRepository,
    missionLoaderContext: MissionLoaderContext,
    missionData: MissionFileFormat,
}) => {
    missionData.enemy.mapPlacements.forEach(mapPlacement => {
        let {
            location,
            battleSquaddieId,
            squaddieTemplateId,
        } = mapPlacement;
        ObjectRepositoryService.addBattleSquaddie(repository,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId,
                squaddieTemplateId,
                squaddieTurn: SquaddieTurnService.new(),
            })
        );
        missionLoaderContext.missionMap.addSquaddie(squaddieTemplateId, battleSquaddieId, location);
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
            iconResourceKey: enemyTeam.iconResourceKey,
        }
        missionLoaderContext.squaddieData.teams ||= [];
        missionLoaderContext.squaddieData.teams.push(team);
        missionLoaderContext.squaddieData.teamStrategyById[team.id] ||= [];
        missionLoaderContext.squaddieData.teamStrategyById[team.id].push(...enemyTeam.strategies);
    });
}

const deployRequiredPlayerSquaddies = (missionLoaderContext: MissionLoaderContext, missionData: MissionFileFormat) => {
    missionLoaderContext.missionMap.playerDeployment = {...missionData.player.deployment};
    missionLoaderContext.missionMap.playerDeployment.required.forEach(requiredDeployment => {
        missionLoaderContext.missionMap.addSquaddie(requiredDeployment.squaddieTemplateId, requiredDeployment.battleSquaddieId, requiredDeployment.location);
    });
}

const createPlayerSquaddieTeam = (missionLoaderContext: MissionLoaderContext, missionData: MissionFileFormat) => {
    missionLoaderContext.squaddieData.teams ||= [];
    missionLoaderContext.squaddieData.teams.push(
        {
            id: missionData.player.teamId,
            name: missionData.player.teamName,
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: missionData.player.deployment.required.map(info => info.battleSquaddieId),
            iconResourceKey: missionData.player.iconResourceKey,
        }
    );
}

const loadPhaseAffiliationBanners = (missionLoaderContext: MissionLoaderContext, missionData: MissionFileFormat, repository: ObjectRepository, resourceHandler: ResourceHandler) => {
    missionLoaderContext.phaseBannersByAffiliation = {...missionData.phaseBannersByAffiliation};
    Object.entries(missionLoaderContext.phaseBannersByAffiliation).forEach(([affiliationKey, resourceKeyName]) => {
        if (!isValidValue(resourceKeyName) || resourceKeyName === "") {
            return;
        }

        const affiliation: SquaddieAffiliation = affiliationKey as SquaddieAffiliation;
        repository.uiElements.phaseBannersByAffiliation[affiliation] = resourceKeyName;

        resourceHandler.loadResource(resourceKeyName);
        missionLoaderContext.resourcesPendingLoading.push(resourceKeyName);
    });
};

const loadTeamIcons = (missionLoaderContext: MissionLoaderContext, missionData: MissionFileFormat, repository: ObjectRepository, resourceHandler: ResourceHandler) => {
    repository.uiElements.teamAffiliationIcons = {};

    const playerTeamIconResourceKey = missionData.player.iconResourceKey;
    if (isValidValue(playerTeamIconResourceKey) && playerTeamIconResourceKey !== "") {
        repository.uiElements.teamAffiliationIcons[missionData.player.teamId] = playerTeamIconResourceKey;
        resourceHandler.loadResource(playerTeamIconResourceKey);
        missionLoaderContext.resourcesPendingLoading.push(playerTeamIconResourceKey);
    }

    missionData.enemy.teams
        .filter(team => isValidValue(team.iconResourceKey) && team.iconResourceKey !== "")
        .forEach(team => {
            const teamIconResourceKey = team.iconResourceKey;
            repository.uiElements.teamAffiliationIcons[team.id] = teamIconResourceKey;
            resourceHandler.loadResource(teamIconResourceKey);
            missionLoaderContext.resourcesPendingLoading.push(teamIconResourceKey);
        });
}
