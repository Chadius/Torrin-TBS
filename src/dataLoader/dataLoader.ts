export const LoadFileIntoFormat = async <T>(filename: string): Promise<T> => {
    const res = await fetch(filename);
    return await res.json();
}
