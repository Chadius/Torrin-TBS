import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import * as mocks from "../../utils/test/mocks";
import {ResourceHandler} from "../../resource/resourceHandler";
import {MissionFileFormat, NpcTeam} from "../../dataLoader/missionLoader";
import * as DataLoader from "../../dataLoader/dataLoader";
import {
    MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS,
    MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS,
    MissionLoader,
    MissionLoaderContext
} from "./missionLoader";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {DEFAULT_VICTORY_CUTSCENE_ID} from "../orchestrator/missionCutsceneCollection";
import {MissionObjectiveHelper} from "../missionResult/missionObjective";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {TestMissionData} from "../../utils/test/missionData";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {PlayerArmy} from "../../campaign/playerArmy";
import {TestArmyPlayerData} from "../../utils/test/army";

describe('Mission Loader', () => {
    let resourceHandler: ResourceHandler;
    let missionData: MissionFileFormat;
    let loadFileIntoFormatSpy: jest.SpyInstance;
    let missionLoaderContext: MissionLoaderContext;
    let squaddieRepository: BattleSquaddieRepository;
    let enemyDemonSlitherTemplate: SquaddieTemplate;
    let enemyDemonSlitherTemplate2: SquaddieTemplate;
    let playerArmy: PlayerArmy;

    beforeEach(() => {
        resourceHandler = mocks.mockResourceHandler();
        resourceHandler.loadResources = jest.fn();
        resourceHandler.loadResource = jest.fn();
        resourceHandler.areAllResourcesLoaded = jest.fn().mockReturnValue(true);

        ({
            missionData,
            enemyDemonSlitherTemplate,
            enemyDemonSlitherTemplate2,
        } = TestMissionData());

        ({
            playerArmy
        } = TestArmyPlayerData());

        loadFileIntoFormatSpy = jest.spyOn(DataLoader, "LoadFileIntoFormat").mockImplementation(async (filename: string): Promise<MissionFileFormat | SquaddieTemplate | PlayerArmy> => {
            if (filename === "assets/mission/0000.json") {
                return missionData;
            }

            if (filename === "assets/npcData/templates/enemy_demon_slither.json") {
                return enemyDemonSlitherTemplate;
            }

            if (filename === "assets/npcData/templates/enemyDemonSlitherTemplate2_id.json") {
                return enemyDemonSlitherTemplate2;
            }

            if (filename === "assets/playerArmy/playerArmy.json") {
                return playerArmy;
            }
        });
        missionLoaderContext = MissionLoader.newEmptyMissionLoaderContext();
        squaddieRepository = new BattleSquaddieRepository();
    });

    it('knows it has not started yet', () => {
        expect(missionLoaderContext.completionProgress.started).toBeFalsy();
        expect(missionLoaderContext.completionProgress.loadedFileData).toBeFalsy();
    });

    describe('can load mission data from a file', () => {
        beforeEach(async () => {
            await MissionLoader.loadMissionFromFile({
                missionLoaderContext: missionLoaderContext,
                missionId: "0000",
                resourceHandler,
                squaddieRepository,
            });
        });

        it('calls the loading function', () => {
            expect(loadFileIntoFormatSpy).toBeCalled();
        });

        it('reports file loading was a success', () => {
            expect(missionLoaderContext.completionProgress.loadedFileData).toBeTruthy();
        });

        it('loads the mission id', () => {
            expect(missionLoaderContext.id).toBe("test mission");
        });

        it('loaded the mission map', () => {
            expect(missionLoaderContext.missionMap.terrainTileMap).toEqual(
                new TerrainTileMap({
                    movementCost: [
                        "x x x x x 2 2 1 1 1 1 1 2 2 x x x ",
                        " 1 1 1 1 2 2 2 1 1 1 1 2 2 1 1 1 1 ",
                        "  x x x x 2 2 1 1 1 1 1 2 2 1 1 1 1 ",
                        "   x x x x x x x x x x x x x x 1 1 1 ",
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
                        "                 1 1 1 x 2 2 2 2 2 2 2 2 2 2 x 1 1 "
                    ],
                    resourceHandler,
                })
            )
        });

        it('tries to load movement resources for the map', () => {
            expect(resourceHandler.loadResources).toBeCalledWith(MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS);
            expect(missionLoaderContext.resourcesPendingLoading).toEqual(
                expect.arrayContaining(MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS)
            );
        });

        it('tries to load attribute icons for the map', () => {
            expect(resourceHandler.loadResources).toBeCalledWith(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS);
            expect(missionLoaderContext.resourcesPendingLoading).toEqual(
                expect.arrayContaining(MISSION_ATTRIBUTE_ICON_RESOURCE_KEYS)
            );
        });

        it('can extract and validate objectives', () => {
            const clonedObjectives = missionData.objectives.map(obj => {
                return {...obj}
            });
            expect(clonedObjectives[0]).not.toBe(missionLoaderContext.objectives[0]);
            expect(clonedObjectives[0]).toEqual(missionLoaderContext.objectives[0]);
            const validatedMissionObjectives = clonedObjectives.map(MissionObjectiveHelper.validateMissionObjective);
            expect(missionLoaderContext.objectives).toEqual(validatedMissionObjectives);
        });

        it('initializes the camera', () => {
            expect(missionLoaderContext.mapSettings.camera.mapDimensionBoundaries.widthOfWidestRow).toBe(17);
            expect(missionLoaderContext.mapSettings.camera.mapDimensionBoundaries.numberOfRows).toBe(18);
        });

        describe('npc squaddie information', () => {
            it('knows the template ids for this map', () => {
                expect(missionLoaderContext.squaddieData.templates).toHaveProperty(enemyDemonSlitherTemplate.squaddieId.templateId)
                expect(missionLoaderContext.squaddieData.templates[enemyDemonSlitherTemplate.squaddieId.templateId]).toEqual(enemyDemonSlitherTemplate);

                expect(missionLoaderContext.squaddieData.templates).toHaveProperty(enemyDemonSlitherTemplate2.squaddieId.templateId)
                expect(missionLoaderContext.squaddieData.templates[enemyDemonSlitherTemplate2.squaddieId.templateId]).toEqual(enemyDemonSlitherTemplate2);
            });
            it('knows it has to load resources based on the template resources', () => {
                expect(missionLoaderContext.resourcesPendingLoading).toContain(enemyDemonSlitherTemplate.squaddieId.resources.mapIconResourceKey);
                Object.values(enemyDemonSlitherTemplate.squaddieId.resources.actionSpritesByEmotion).forEach(resourceKey => {
                    expect(missionLoaderContext.resourcesPendingLoading).toContain(resourceKey);
                });

                expect(resourceHandler.loadResource).toBeCalledWith(enemyDemonSlitherTemplate.squaddieId.resources.mapIconResourceKey);
                expect(resourceHandler.loadResources).toBeCalledWith(Object.values(enemyDemonSlitherTemplate.squaddieId.resources.actionSpritesByEmotion));
            });
            it('knows to add the template to the squaddie repository', () => {
                expect(squaddieRepository.getSquaddieTemplateIterator().length).toBeGreaterThan(0);
                expect(squaddieRepository.getSquaddieTemplateIterator().some(val => val.squaddieTemplateId === enemyDemonSlitherTemplate.squaddieId.templateId));
                expect(squaddieRepository.getSquaddieTemplateIterator().some(val => val.squaddieTemplateId === enemyDemonSlitherTemplate2.squaddieId.templateId));
            });
            it('adds battle squaddies to the squaddie repository', () => {
                missionData.enemy.mapPlacements.forEach(placement => {
                    const {
                        battleSquaddie,
                        squaddieTemplate
                    } = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(placement.battleSquaddieId));
                    expect(battleSquaddie.battleSquaddieId).toEqual(placement.battleSquaddieId);
                    expect(battleSquaddie.squaddieTemplateId).toEqual(placement.squaddieTemplateId);
                });
            });
            it('adds squaddies to the map', () => {
                missionData.enemy.mapPlacements.forEach(placement => {
                    const {
                        battleSquaddieId,
                        squaddieTemplateId,
                        mapLocation,
                    } = missionLoaderContext.missionMap.getSquaddieByBattleId(placement.battleSquaddieId);
                    expect(battleSquaddieId).toEqual(placement.battleSquaddieId);
                    expect(squaddieTemplateId).toEqual(placement.squaddieTemplateId);
                    expect(mapLocation).toEqual(placement.location);
                });
            });
            it('creates teams', () => {
                const enemyNpcTeam0: NpcTeam = missionData.enemy.teams[0];
                expect(missionLoaderContext.squaddieData.teams).toContainEqual({
                        affiliation: SquaddieAffiliation.ENEMY,
                        id: enemyNpcTeam0.id,
                        name: enemyNpcTeam0.name,
                        battleSquaddieIds: enemyNpcTeam0.battleSquaddieIds,
                    }
                );
                expect(missionLoaderContext.squaddieData.teams.some(team => team.id === missionData.enemy.teams[1].id)).toBeTruthy();
            });
            it('creates team strategies', () => {
                expect(missionLoaderContext.squaddieData.teamStrategyById[missionData.enemy.teams[0].id]).toEqual(
                    missionData.enemy.teams[0].strategies
                );
            });
        })
    });

    describe('can load player army information', () => {
        let initialPendingResourceListLength: number;

        beforeEach(async () => {
            await MissionLoader.loadMissionFromFile({
                missionLoaderContext: missionLoaderContext,
                missionId: "0000",
                resourceHandler,
                squaddieRepository,
            });

            initialPendingResourceListLength = missionLoaderContext.resourcesPendingLoading.length;

            await MissionLoader.loadPlayerArmyFromFile({
                missionLoaderContext: missionLoaderContext,
                resourceHandler,
                squaddieRepository,
            });
        });

        it('gets player squaddie templates', () => {
            expect(missionLoaderContext.squaddieData.templates[playerArmy.squaddieTemplates[0].squaddieId.templateId]).toEqual(playerArmy.squaddieTemplates[0]);
            expect(missionLoaderContext.squaddieData.templates[playerArmy.squaddieTemplates[1].squaddieId.templateId]).toEqual(playerArmy.squaddieTemplates[1]);
        });

        it('adds resource keys to the list of resources to load', () => {
            expect(missionLoaderContext.resourcesPendingLoading.length).toBeGreaterThan(initialPendingResourceListLength);
            expect(missionLoaderContext.resourcesPendingLoading).toContainEqual(playerArmy.squaddieTemplates[0].squaddieId.resources.mapIconResourceKey);
            expect(missionLoaderContext.resourcesPendingLoading).toEqual(
                expect.arrayContaining(
                    Object.values(playerArmy.squaddieTemplates[0].squaddieId.resources.actionSpritesByEmotion)
                )
            );

            expect(missionLoaderContext.resourcesPendingLoading).toContainEqual(playerArmy.squaddieTemplates[1].squaddieId.resources.mapIconResourceKey);
            expect(missionLoaderContext.resourcesPendingLoading).toEqual(
                expect.arrayContaining(
                    Object.values(playerArmy.squaddieTemplates[1].squaddieId.resources.actionSpritesByEmotion)
                )
            );
        });

        it('adds player squaddies to the repository', () => {
            expect(squaddieRepository.getSquaddieTemplateIterator().some(template => template.squaddieTemplateId === playerArmy.squaddieTemplates[0].squaddieId.templateId)).toBeTruthy();
            expect(squaddieRepository.getSquaddieTemplateIterator().some(template => template.squaddieTemplateId === playerArmy.squaddieTemplates[1].squaddieId.templateId)).toBeTruthy();
        });

        it('adds player deployment positions to the map', () => {
            expect(missionLoaderContext.missionMap.playerDeployment).toEqual(missionData.player.deployment);
        });

        it('loads the required player deployments onto the map', () => {
            missionData.player.deployment.required.forEach(requiredDeployment => {
                const locationDescriptor = missionLoaderContext.missionMap.getSquaddieByBattleId(requiredDeployment.battleSquaddieId);
                expect(locationDescriptor.battleSquaddieId).toEqual(requiredDeployment.battleSquaddieId);
                expect(locationDescriptor.squaddieTemplateId).toEqual(requiredDeployment.squaddieTemplateId);
                expect(locationDescriptor.mapLocation).toEqual(requiredDeployment.location);
            });
        });

        it('adds the player team using the required squaddies', () => {
            expect(missionLoaderContext.squaddieData.teams).toContainEqual({
                    affiliation: SquaddieAffiliation.PLAYER,
                    id: missionData.player.teamId,
                    name: missionData.player.teamName,
                    battleSquaddieIds: missionData.player.deployment.required.map(info => info.battleSquaddieId),
                }
            );
        });
    });

    describe('can load mission data from hardcoded assets', () => {
        let initialPendingResourceListLength: number;

        beforeEach(async () => {
            await MissionLoader.loadMissionFromFile({
                missionLoaderContext: missionLoaderContext,
                missionId: "0000",
                resourceHandler,
                squaddieRepository,
            });

            await MissionLoader.loadPlayerArmyFromFile({
                missionLoaderContext: missionLoaderContext,
                resourceHandler,
                squaddieRepository,
            });

            initialPendingResourceListLength = missionLoaderContext.resourcesPendingLoading.length;

            MissionLoader.loadMissionFromHardcodedData({
                missionLoaderContext,
                squaddieRepository,
                resourceHandler,
            });
        });

        it('gets squaddies and queues resources to load based on the squaddie resources', () => {
            expect(squaddieRepository.getSquaddieTemplateIterator().length).toBeGreaterThan(0);
            expect(missionLoaderContext.squaddieData.teams.length).toBeGreaterThan(0);
            expect(Object.keys(missionLoaderContext.squaddieData.teamStrategyById).length).toBeGreaterThan(0);

            expect(missionLoaderContext.resourcesPendingLoading.length).toBeGreaterThan(initialPendingResourceListLength);
        });

        it('gets cutscenes', () => {
            expect("cutsceneCollection" in missionLoaderContext.cutsceneInfo).toBeTruthy();
            expect("cutsceneTriggers" in missionLoaderContext.cutsceneInfo).toBeTruthy();
        });
    });

    it('can reduce the pending resources', () => {
        missionLoaderContext.resourcesPendingLoading = ["A", "B", "C"];
        resourceHandler.isResourceLoaded = jest.fn().mockImplementation((resourceKey: string) => {
            return false;
        });
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderContext,
            resourceHandler,
        });
        expect(missionLoaderContext.resourcesPendingLoading).toEqual(["A", "B", "C"]);

        resourceHandler.isResourceLoaded = jest.fn().mockImplementation((resourceKey: string) => {
            return resourceKey === "A";
        });
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderContext,
            resourceHandler,
        });
        expect(missionLoaderContext.resourcesPendingLoading).toEqual(["B", "C"]);

        resourceHandler.isResourceLoaded = jest.fn().mockImplementation((resourceKey: string) => {
            return true;
        });
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderContext,
            resourceHandler,
        });
        expect(missionLoaderContext.resourcesPendingLoading).toEqual([]);
    });

    describe('initializes resources once loading is finished and resources are found', () => {
        beforeEach(async () => {
            resourceHandler.getResource = jest.fn().mockReturnValue(makeResult({width: 1, height: 1}));

            await MissionLoader.loadMissionFromFile({
                missionLoaderContext: missionLoaderContext,
                missionId: "0000",
                resourceHandler,
                squaddieRepository,
            });

            MissionLoader.loadMissionFromHardcodedData({
                missionLoaderContext,
                squaddieRepository,
                resourceHandler,
            });

            jest.spyOn(resourceHandler, "isResourceLoaded").mockReturnValue(true);
            resourceHandler.loadResources(missionLoaderContext.resourcesPendingLoading);

            MissionLoader.assignResourceHandlerResources({
                missionLoaderContext,
                resourceHandler,
                squaddieRepository,
            });
        });

        it('initializes squaddie resources', () => {
            expect(Object.keys(squaddieRepository.imageUIByBattleSquaddieId)).toHaveLength(squaddieRepository.getBattleSquaddieIterator().length);
        });

        it('initializes cutscenes', () => {
            expect(missionLoaderContext.cutsceneInfo.cutsceneCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID].hasLoaded()).toBeTruthy();
        });

        it('has the squaddie templates that were loaded from files', () => {
            expect(squaddieRepository.getSquaddieTemplateIterator().some(val => val.squaddieTemplateId === enemyDemonSlitherTemplate.squaddieId.templateId));
            expect(squaddieRepository.getSquaddieTemplateIterator().some(val => val.squaddieTemplateId === enemyDemonSlitherTemplate2.squaddieId.templateId));
        });
    });
});
