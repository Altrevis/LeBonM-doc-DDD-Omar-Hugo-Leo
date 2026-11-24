import { creerApp } from "./src/http/app.js";

const port = Number(process.env.PORT) || 3000;
creerApp().listen(port, () => console.log(`LeBonMédoc API sur http://localhost:${port}`));
