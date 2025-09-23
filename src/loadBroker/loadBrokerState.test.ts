import { describe, it, expect, beforeEach } from "vitest"
import { LoadBrokerState, LoadBrokerStateService } from "./loadBrokerState"
import { GameModeEnum } from "../utils/startupConfig"

describe("LoadBrokerState", () => {
    it("will throw an error if there is no mode provided", () => {
        expect(() => {
            //@ts-ignore Purposely using invalid parameters to throw an exception
            LoadBrokerStateService.new({})
        }).toThrow("required")
    })

    describe("clone", () => {
        let original: LoadBrokerState
        let clone: LoadBrokerState
        beforeEach(() => {
            original = LoadBrokerStateService.new({
                campaignIdThatWasLoaded: "campaign Id",
                modeThatInitiatedLoading: GameModeEnum.TITLE_SCREEN,
            })
            clone = LoadBrokerStateService.clone(original)
        })

        it("is a different object", () => {
            expect(clone).not.toBe(original)
        })

        it("campaignIdThatWasLoaded", () => {
            expect(clone.campaignIdThatWasLoaded).toBe(
                original.campaignIdThatWasLoaded
            )
        })

        it("modeThatInitiatedLoading", () => {
            expect(clone.modeThatInitiatedLoading).toBe(
                original.modeThatInitiatedLoading
            )
        })
    })

    describe("create new states with modified fields", () => {
        let original: LoadBrokerState
        beforeEach(() => {
            original = LoadBrokerStateService.new({
                campaignIdThatWasLoaded: "campaign Id",
                modeThatInitiatedLoading: GameModeEnum.TITLE_SCREEN,
            })
        })

        it("campaignIdThatWasLoaded", () => {
            const newState = LoadBrokerStateService.withCampaignIdThatWasLoaded(
                original,
                "newCampaignId"
            )
            expect(newState.campaignIdThatWasLoaded).toBe("newCampaignId")
        })

        it("modeThatInitiatedLoading", () => {
            const newState =
                LoadBrokerStateService.withModeThatInitiatedLoading(
                    original,
                    GameModeEnum.BATTLE
                )
            expect(newState.modeThatInitiatedLoading).toBe(GameModeEnum.BATTLE)
        })
    })
})
