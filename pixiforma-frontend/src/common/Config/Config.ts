
class Config {
    SOCKET_URL = process.env.NEXT_APP_SOCKET_URL
    API_URL = process.env.NEXT_PUBLIC_API_URL
    FRONT_URL = process.env.NEXT_PUBLIC_FRONT_URL
    private static instance: Config;
    constructor() { }
    public static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }
}

export { Config }
