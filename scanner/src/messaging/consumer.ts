import amqp from "amqplib";
import { scanWebsite } from "../scanner/scanner";
import type { ScanRequested } from "./scan-message";
import "dotenv/config";

const REQUEST_QUEUE = "scan-requests";

export async function startScanWorker() {
    const connection = await amqp.connect(
        process.env.RABBITMQ_URL!
    );

    const channel = await connection.createChannel();

    await channel.assertQueue(REQUEST_QUEUE, {
        durable: true,
    });

    console.log(
        `Waiting for messages on ${REQUEST_QUEUE}...`
    );

    channel.consume(REQUEST_QUEUE, async (message) => {
        if (!message) return;

        const job: ScanRequested = JSON.parse(
            message.content.toString()
        );

        try {
            console.log(
                `Starting scan: ${job.scanId}`
            );

            const result = await scanWebsite(job.url);

            console.log(
                `Scan result for ${job.scanId}:`,
                result
            );

            const response = await fetch(
                `${process.env.NEXT_APP_URL}/api/internal/scans/result`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.SCANNER_API_KEY}`,
                    },
                    body: JSON.stringify({
                        scanId: job.scanId,
                        projectId: job.projectId,
                        success: true,

                        pagesScanned: result.pagesScanned,
                        findings: result.findings,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to send scan result: ${response.status}`
                );
            }

            channel.ack(message);

            console.log(
                `Scan completed: ${job.scanId}`
            );
        } catch (error) {
            console.error(
                `Error processing scan ${job.scanId}:`,
                error
            );

            try {
                await fetch(
                    `${process.env.NEXT_APP_URL}/api/internal/scans/result`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Authorization: `Bearer ${process.env.SCANNER_API_KEY}`,
                        },
                        body: JSON.stringify({
                            scanId: job.scanId,
                            projectId: job.projectId,
                            success: false,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : "Unknown scan error",
                        }),
                    }
                );
            } catch (resultError) {
                console.error(
                    "Failed to send scan failure result:",
                    resultError
                );
            }

            channel.ack(message);
        }
    });
}