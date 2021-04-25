const crypto = require("crypto");
const Buffer = require("buffer").Buffer;
const { Connection, ReceiverEvents, isAmqpError, parseConnectionString } = require("rhea-promise");

function generateSasToken(resourceUri, signingKey, policyName, expiresInMins) {
    resourceUri = encodeURIComponent(resourceUri);

    const expiresInSeconds = Math.ceil(Date.now() / 1000 + expiresInMins * 60);
    const toSign = resourceUri + "\n" + expiresInSeconds;

    const hmac = crypto.createHmac("sha256", Buffer.from(signingKey, "base64"));
    hmac.update(toSign);
    const base64UriEncoded = encodeURIComponent(hmac.digest("base64"));

    return `SharedAccessSignature sr=${resourceUri}&sig=${base64UriEncoded}&se=${expiresInSeconds}&skn=${policyName}`;
}

async function convertIotHubToEventHubsConnectionString(connectionString) {
    const { HostName, SharedAccessKeyName, SharedAccessKey } = parseConnectionString(
        connectionString
    );

    if (!HostName || !SharedAccessKey || !SharedAccessKeyName) {
        throw new Error(`Invalid IoT Hub connection string.`);
    }

    const [iotHubName] = HostName.split(".");

    if (!iotHubName) {
        throw new Error(`Unable to extract the IotHub name from the connection string.`);
    }

    const token = generateSasToken(
        `${HostName}/messages/events`,
        SharedAccessKey,
        SharedAccessKeyName,
        5
    );

    const connectionOptions = {
        transport: "tls",
        host: HostName,
        hostname: HostName,
        username: `${SharedAccessKeyName}@sas.root.${iotHubName}`,
        port: 5671,
        reconnect: false,
        password: token
    };

    const connection = new Connection(connectionOptions);
    await connection.open();

    const receiver = await connection.createReceiver({
        source: { address: `amqps://${HostName}/messages/events/$management` }
    });

    return new Promise((resolve, reject) => {
        receiver.on(ReceiverEvents.receiverError, (context) => {
            const error = context.receiver && context.receiver.error;
            if (isAmqpError(error) && error.condition === "amqp:link:redirect") {
                const hostname = error.info && error.info.hostname;
                const parsedAddress = error.info.address.match(/5671\/(.*)\/\$management/i);
                const entityPath = parsedAddress[1];
                resolve(`Endpoint=sb://${hostname}/;EntityPath=${entityPath};SharedAccessKeyName=${SharedAccessKeyName};SharedAccessKey=${SharedAccessKey}`);
            } else {
                reject(error);
            }
            connection.close().catch(() => {
            });
        });
    });
}


module.exports = {
    convertIotHubToEventHubsConnectionString
}
