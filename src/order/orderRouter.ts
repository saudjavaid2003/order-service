import express from "express";
import authenticate from "../common/middleware/authenticate";
import { asyncWrapper } from "../utils";
import { OrderController } from "./orderController";
import { StripeGW } from "../payment/stripe";
const router = express.Router();
// since here i am using only one gatewway for payment so i am directly creating the instance here but if there are multiple gateways then i can create a factory for it and then inject the 
// required gateway based on the request data.and also i can use the same factory in the orderController to create the instance of the gateway instead of creating it here and then injecting
//  it to the controller.
const paymentGw = new StripeGW();
const orderController = new OrderController(paymentGw);

router.post("/", authenticate, asyncWrapper(orderController.create));

export default router;
