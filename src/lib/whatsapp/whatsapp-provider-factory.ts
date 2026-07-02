import type { WhatsAppProvider } from "./types";
import { MockWhatsAppProvider } from "./mock-whatsapp-provider";
import { WhapiCloudProvider } from "./whapi-cloud-provider";
import { MetaCloudApiProvider } from "./meta-cloud-api-provider";

export function createWhatsAppProvider(): WhatsAppProvider {
  const name = process.env.WHATSAPP_PROVIDER ?? "mock";
  switch (name) {
    case "whapi":
      return new WhapiCloudProvider();
    case "meta":
      return new MetaCloudApiProvider();
    case "mock":
    default:
      return new MockWhatsAppProvider();
  }
}
