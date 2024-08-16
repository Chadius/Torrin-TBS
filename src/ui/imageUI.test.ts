import { ImageUIService } from "./imageUI"

describe("ImageUI", () => {
    it("can scale width to match the screen ratio", () => {
        expect(
            ImageUIService.ScaleImageWidth({
                desiredHeight: 300,
                imageHeight: 150,
                imageWidth: 100,
            })
        ).toBe(200)
    })

    it("can scale height to match the screen ratio", () => {
        expect(
            ImageUIService.ScaleImageHeight({
                desiredWidth: 300,
                imageHeight: 100,
                imageWidth: 150,
            })
        ).toBe(200)
    })
})
