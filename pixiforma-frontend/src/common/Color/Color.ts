class Color {
    private static instance: Color;
    constructor() { }
    public static getInstance(): Color {
        if (!Color.instance) {
            Color.instance = new Color();
        }
        return Color.instance;
    }
}

export { Color }
