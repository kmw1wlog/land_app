import { loadKrebRegionIndexSeed } from "./fusionEvidence";

export class KrebClient {
  isConfigured() {
    return Boolean(process.env.KREB_API_KEY);
  }

  async getRegionIndexSnapshots() {
    return loadKrebRegionIndexSeed();
  }
}
