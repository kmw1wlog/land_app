import { loadHugJeonseRisk } from "./fusionEvidence";

export class HugClient {
  isConfigured() {
    return Boolean(process.env.HUG_API_KEY || process.env.HUG_SOURCE_URL);
  }

  async getJeonseRiskSnapshots() {
    return loadHugJeonseRisk();
  }
}
