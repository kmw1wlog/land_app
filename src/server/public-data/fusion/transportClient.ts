import { loadTransportAccess } from "./fusionEvidence";

export class TransportClient {
  isConfigured() {
    return Boolean(process.env.TRANSPORT_API_KEY || process.env.TRANSPORT_SOURCE_URL);
  }

  async getAccessSnapshots() {
    return loadTransportAccess();
  }
}
