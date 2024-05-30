import { SplashScreenService } from "./splashScreen"

describe("Splash Screen", () => {
    it("new will sanitize the fields", () => {
        const splashData = SplashScreenService.new({
            id: "splash screen data",
            screenImageResourceKey: "title screen",
            backgroundColor: [4, 5, 6],
        })

        expect(splashData.animationDuration).toEqual(0)
        expect(splashData.backgroundColor).toEqual([4, 5, 6])
    })
})
