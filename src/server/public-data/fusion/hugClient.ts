import { loadHugJeonseRiskSeed } from "./fusionEvidence";

export class HugClient {
  isConfigured() {
    return Boolean(process.env.HUG_API_KEY);
  }

  async getJeonseRiskSnapshots() {
    return loadHugJeonseRiskSeed();
  }
}
