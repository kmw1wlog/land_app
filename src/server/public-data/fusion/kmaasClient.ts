import { loadTransportAccess } from "./fusionEvidence";

export class KmaasClient {
  isConfigured() {
    return Boolean(process.env.KMAAS_API_KEY || process.env.KMAAS_SOURCE_URL);
  }

  async getTransportAccessSnapshots() {
    return loadTransportAccess();
  }
}
