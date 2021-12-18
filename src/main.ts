import pc from "picocolors";

import { Application } from "./app";

const app = new Application();

app
  .run()
  .then(() => {
    console.log(`${pc.green("done!")}`);
  })
  .catch((error: Error) => {
    console.error(`${pc.red(error.message)}`);
  });
