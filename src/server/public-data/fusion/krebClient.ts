import { loadKrebRegionIndex } from "./fusionEvidence";

export class KrebClient {
  isConfigured() {
    return Boolean(process.env.KREB_API_KEY || process.env.KREB_SOURCE_URL);
  }

  async getRegionIndexSnapshots() {
    return loadKrebRegionIndex();
  }
}
