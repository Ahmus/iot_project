const { EventHubProducerClient, EventHubConsumerClient } = require('@azure/event-hubs');

class EventHubReader {
  constructor(iotHubConnectionString, consumerGroup) {
    this.iotHubConnectionString = iotHubConnectionString;
    this.consumerGroup = consumerGroup;
  }

  async startReadMessage(startReadMessageCallback) {
    try {
      const clientOptions = {
      };
      const consumerClient = new EventHubConsumerClient(this.consumerGroup, this.iotHubConnectionString, clientOptions);
      console.log('Successfully created the EventHubConsumerClient.');

      const partitionIds = await consumerClient.getPartitionIds();
      console.log('The partition ids are: ', partitionIds);

      consumerClient.subscribe({
        processEvents: (events, context) => {
          for (let i = 0; i < events.length; ++i) {
            startReadMessageCallback(
              events[i].body,
              events[i].enqueuedTimeUtc,
              events[i].systemProperties["iothub-connection-device-id"]);
          }
        },
        processError: (err, context) => {
          console.error(err.message || err);
        }
      });
    } catch (ex) {
      console.error(ex.message || ex);
    }
  }

  async stopReadMessage() {
    this.consumerClient.close();
  }
}

module.exports = EventHubReader;
