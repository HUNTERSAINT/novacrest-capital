import app from "./app";
import { logger } from "./lib/logger";
import { settleMaturedInvestments } from "./lib/investment-settlement";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Run once at startup, then every minute. The settlement operation is
  // transactional and idempotent, so overlapping runs/replicas are safe.
  void settleMaturedInvestments().catch((error) => {
    logger.error({ err: error }, "Initial investment settlement run failed");
  });

  setInterval(() => {
    void settleMaturedInvestments().catch((error) => {
      logger.error({ err: error }, "Scheduled investment settlement run failed");
    });
  }, 60_000);
});
