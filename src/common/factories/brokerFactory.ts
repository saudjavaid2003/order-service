import config from "config";
import { KafkaBroker } from "../../config/kafka";
import { MessageBroker } from "../../types/broker";

let broker: MessageBroker | null = null;
// extensible code if i want to add more brokers in the future li
// ke rabbitmq or redis streams i can just add them here and the rest of the cod
// e will not be affected.
export const createMessageBroker = (): MessageBroker => {
  console.log("connecting to kafka broker...");
  // singleton
  if (!broker) {
    broker = new KafkaBroker("order-service", [config.get("kafka.broker")]);
  }
  return broker;
};