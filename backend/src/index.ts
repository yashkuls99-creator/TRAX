import { app } from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`API server listening on port ${env.port} [${env.nodeEnv}]`);
});
