import { loadTransportAccessSeed } from "./fusionEvidence";

export class KmaasClient {
  isConfigured() {
    return Boolean(process.env.KMAAS_API_KEY);
  }

  async getTransportAccessSnapshots() {
    return loadTransportAccessSeed();
  }
}
