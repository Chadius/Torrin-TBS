import { SquaddieTemplate, SquaddieTemplateService } from "./squaddieTemplate"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import {
    ArmyAttributes,
    DefaultArmyAttributes,
} from "../squaddie/armyAttributes"
import { ActionTemplateService } from "../action/template/actionTemplate"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieResourceService } from "../squaddie/resource"
import { SquaddieEmotion } from "../battle/animation/actionAnimation/actionAnimationConstants"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { beforeEach, describe, expect, it } from "vitest"

describe("Squaddie Template", () => {
    let objectRepository: ObjectRepository

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
    })

    describe("attributes", () => {
        it("will give static squaddie defaults", () => {
            const squaddieWithoutAttributes: SquaddieTemplate =
                SquaddieTemplateService.new({
                    squaddieId: SquaddieIdService.new({
                        squaddieTemplateId: "id",
                        affiliation: SquaddieAffiliation.PLAYER,
                        name: "id",
                    }),
                })

            const defaultAttributes: ArmyAttributes = DefaultArmyAttributes()

            expect(squaddieWithoutAttributes.attributes).toStrictEqual(
                defaultAttributes
            )
        })
    })

    it("will sanitize the template with empty fields", () => {
        const templateWithInvalidFields: SquaddieTemplate =
            SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    squaddieTemplateId: "templateId",
                    name: "name",
                    affiliation: SquaddieAffiliation.PLAYER,
                    resources: undefined,
                }),
                attributes: undefined,
            })

        SquaddieTemplateService.sanitize(templateWithInvalidFields)

        expect(templateWithInvalidFields.actionTemplateIds).toHaveLength(0)
        expect(templateWithInvalidFields.attributes).toEqual(
            DefaultArmyAttributes()
        )
    })
    it("will throw an error if there is no squaddie id", () => {
        const throwErrorBecauseOfNoSquaddieId = () => {
            SquaddieTemplateService.new({
                // @ts-ignore Purposely putting in bad arguments to trigger an error
                squaddieId: undefined,
                // @ts-ignore Purposely putting in bad arguments to trigger an error
                attributes: null,
            })
        }

        expect(throwErrorBecauseOfNoSquaddieId).toThrowError("cannot sanitize")
    })
    it("can return all of the resource keys it needs", () => {
        const longswordActionTemplate = ActionTemplateService.new({
            id: "longsword",
            name: "longsword",
            buttonIconResourceKey: "icon-sword",
        })
        const squaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                squaddieTemplateId: "squaddieTemplate",
                name: "squaddieTemplate",
                affiliation: SquaddieAffiliation.PLAYER,
                resources: SquaddieResourceService.new({
                    mapIconResourceKey: "mapIconResourceKey",
                    actionSpritesByEmotion: {
                        [SquaddieEmotion.NEUTRAL]: "SquaddieEmotion.NEUTRAL",
                    },
                }),
            }),
            actionTemplateIds: [longswordActionTemplate.id],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            longswordActionTemplate
        )

        const resourceKeys: string[] = SquaddieTemplateService.getResourceKeys(
            squaddieTemplate,
            objectRepository
        )

        expect(resourceKeys).toEqual(
            expect.arrayContaining([
                squaddieTemplate.squaddieId.resources.mapIconResourceKey,
                longswordActionTemplate.buttonIconResourceKey,
                ...Object.values(
                    squaddieTemplate.squaddieId.resources.actionSpritesByEmotion
                ),
            ])
        )
    })

    it("will populate squaddieActionIds", () => {
        const longswordActionTemplate = ActionTemplateService.new({
            id: "longsword",
            name: "longsword",
            buttonIconResourceKey: "icon-sword",
        })
        const squaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                squaddieTemplateId: "squaddieTemplate",
                name: "squaddieTemplate",
                affiliation: SquaddieAffiliation.PLAYER,
                resources: SquaddieResourceService.new({
                    mapIconResourceKey: "mapIconResourceKey",
                    actionSpritesByEmotion: {
                        [SquaddieEmotion.NEUTRAL]: "SquaddieEmotion.NEUTRAL",
                    },
                }),
            }),
            actionTemplateIds: [longswordActionTemplate.id],
        })
        expect(squaddieTemplate.actionTemplateIds).toEqual([
            longswordActionTemplate.id,
        ])
    })
})
