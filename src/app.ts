import express, { Application, Request, Response } from "express";
import { IndexRoutes } from "./app/routes";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import cookieParser from "cookie-parser";
import { auth } from "./app/lib/auth";
import { toNodeHandler } from "better-auth/node";
import path from "path";
import cors from "cors"
import { envVars } from "./config/env";

const app: Application = express();

app.set("view engine", "ejs")
app.set("views", path.resolve(process.cwd(), `src/app/templates/`))

app.use(cors({
    origin: [
        envVars.FRONTEND_URL, 
        envVars.BETTER_AUTH_URL
    ],
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]

}))
app.use("/api/auth", toNodeHandler(auth));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser())

app.use('/api/v1', IndexRoutes);

app.get('/', async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API is working',
  });
});

app.use(globalErrorHandler)
app.use(notFound)

export default app;