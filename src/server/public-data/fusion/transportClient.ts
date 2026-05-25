import { loadTransportAccessSeed } from "./fusionEvidence";

export class TransportClient {
  isConfigured() {
    return Boolean(process.env.TRANSPORT_API_KEY);
  }

  async getAccessSnapshots() {
    return loadTransportAccessSeed();
  }
}
