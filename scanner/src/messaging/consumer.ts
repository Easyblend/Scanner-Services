import amqp from "amqplib";
import { scanWebsite } from "../scanner/scanner";
import type { ScanRequested } from "./scan-message";

const REQUEST_QUEUE = "scan-requests";
const RESULT_QUEUE = "scan-results";

export async function startScanWorker() {
    const connection = await amqp.connect("");
    const channel = await connection.createChannel();

    await channel.assertQueue(REQUEST_QUEUE, {
        durable: true,
    });

    await channel.assertQueue(RESULT_QUEUE, {
        durable: true,
    });

    console.log(`Waiting for messages on ${REQUEST_QUEUE}...`);

    channel.consume(REQUEST_QUEUE, async (message) => {
        if (!message) return;

        const job: ScanRequested = JSON.parse(
            message.content.toString()
        );

        try {

            console.log(`Starting scan: ${job.scanId}`);

            const result = await scanWebsite(job.url);

            await channel.sendToQueue(
                RESULT_QUEUE,
                Buffer.from(
                    JSON.stringify({
                        scanId: job.scanId,
                        projectId: job.projectId,
                        success: true,
                        ...result,
                    })
                ),
                {
                    persistent: true,
                }
            );

            channel.ack(message);

            console.log(`Scan completed: ${job.scanId}`);
        } catch (error) {
            console.error("Error processing scan request:", error);
            await channel.sendToQueue(
                RESULT_QUEUE,
                Buffer.from(
                    JSON.stringify({
                        scanId: job.scanId,
                        projectId: job.projectId,
                        success: false,
                        error: error instanceof Error
                            ? error.message
                            : "Unknown scan error",
                    })
                ),
                {
                    persistent: true,
                    contentType: "application/json",
                }
            );

            channel.ack(message);
        }
    });
}