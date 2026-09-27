import { useTranslation } from "next-i18next"

class Data {
  private static instance: Data
  private t: ReturnType<typeof useTranslation>['t']

  constructor(t: ReturnType<typeof useTranslation>['t']) {
    this.t = t
  }

  public static getInstance(t: ReturnType<typeof useTranslation>['t']): Data {
    if (!Data.instance) {
      Data.instance = new Data(t)
    }
    return Data.instance
  }
}

export { Data }