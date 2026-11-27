import { creerApplication } from "./src/http/app.js";

const port = Number(process.env.PORT) || 3000;
creerApplication().listen(port, () => console.log(`LeBonMédoc API sur http://localhost:${port}`));
