import type { WhatsAppProvider } from "./types";
import { MockWhatsAppProvider } from "./mock-whatsapp-provider";
import { WhapiCloudProvider } from "./whapi-cloud-provider";

export function createWhatsAppProvider(): WhatsAppProvider {
  const name = process.env.WHATSAPP_PROVIDER ?? "mock";
  switch (name) {
    case "whapi":
      return new WhapiCloudProvider();
    case "mock":
    default:
      return new MockWhatsAppProvider();
  }
}
