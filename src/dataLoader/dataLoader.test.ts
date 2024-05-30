import { LoadFileIntoFormat } from "./dataLoader"
import clearAllMocks = jest.clearAllMocks

const mockFetch = <T>(mockData: T) => {
    global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
            json: () => Promise.resolve(mockData),
        })
    )
}

const mockFetchError = (error: string) => {
    global.fetch = jest.fn().mockImplementation(() => Promise.reject(error))
}

const mockFetchCleanUp = () => {
    clearAllMocks()
    delete global.fetch
}

interface CookieRankingInterface {
    [cookie: string]: number
}

describe("dataLoader", () => {
    it("can load data and merge it into interface", async () => {
        const cookieData = {
            "chocolate chip": 5,
            "cookies in cream": 3,
            sprinkles: 2,
            "jelly creme": 8,
        }

        mockFetch<CookieRankingInterface>(cookieData)

        const cookieRankings =
            await LoadFileIntoFormat<CookieRankingInterface>("cookieData.json")

        expect(global.fetch).toBeCalled()
        expect(Object.keys(cookieRankings)).toHaveLength(4)
        expect(cookieRankings["chocolate chip"]).toBe(5)
        expect(cookieRankings["cookies in cream"]).toBe(3)
        expect(cookieRankings["sprinkles"]).toBe(2)
        expect(cookieRankings["jelly creme"]).toBe(8)
        mockFetchCleanUp()
    })
    it("will throw any errors from fetch", async () => {
        mockFetchError("Cannot find file")

        await LoadFileIntoFormat<CookieRankingInterface>("").catch((error) => {
            expect(error).toBe("Cannot find file")
        })

        mockFetchCleanUp()
    })
})
