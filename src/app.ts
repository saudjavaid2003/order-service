import express, { Request, Response } from "express";
import { globalErrorHandler } from "./common/middleware/globalErrorHandler";
import cookieParser from "cookie-parser";
import customerRouter from "./customer/cusotmerRouter";
import couponRouter from "./coupon/couponRouter";
import cors from "cors";
import  config from "config";

const app = express();
app.use(cookieParser());
app.use(express.json());

const ALLOWED_DOMAINS = [
    config.get("frontend.clientUi"),
];

app.use(
    cors({
        origin: ALLOWED_DOMAINS as string[],
        credentials: true,
    }),
);
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from order service service!" });
});

app.use("/customer", customerRouter);
app.use("/coupons", couponRouter);

app.use(globalErrorHandler);

export default app;
