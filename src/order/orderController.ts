import { NextFunction, Request, Response } from "express";
import { Request as AuthRequest } from "express-jwt";
import {
  CartItem,
  ProductPricingCache,
  Topping,
  ToppingPriceCache,
} from "../types";
import productCacheModel from "../productCache/productCacheModel";
import toppingCacheModel from "../topppingCache/toppingCacheModel";
import couponModel from "../coupon/couponModel";
import orderModel from "./orderModel";
import { OrderStatus, PaymentMode, PaymentStatus } from "./orderTypes";
import idempotencyModel from "../idempotency/idempotencyModel";
import mongoose from "mongoose";
import createHttpError from "http-errors";
import { PaymentGW } from "../payment/paymentTypes";
import { MessageBroker } from "../types/broker";
import customerModel from "../customer/cusotmerModel";

export class OrderController {
  constructor(
    private paymentGw: PaymentGW,
    private broker: MessageBroker,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    const {
      cart,
      couponCode,
      tenantId,
      paymentMode,
      customerId,
      comment,
      address,
    } = req.body;
    // todo: validate request data.

    const totalPrice = await this.calculateTotal(cart);

    let discountPercentage = 0;

    if (couponCode) {
      discountPercentage = await this.getDiscountPercentage(
        couponCode,
        tenantId,
      );
    }

    const discountAmount = Math.round((totalPrice * discountPercentage) / 100);

    const priceAfterDiscount = totalPrice - discountAmount;

    // todo: May be store in db for each tenant.
    const TAXES_PERCENT = 18;

    const taxes = Math.round((priceAfterDiscount * TAXES_PERCENT) / 100);
    // todo: may be store in database for each tenant or maybe calculated according to business rules.
    const DELIVERY_CHARGES = 100;

    const finalTotal = priceAfterDiscount + taxes + DELIVERY_CHARGES;

    const idempotencyKey = req.headers["idempotency-key"];

    const idempotency = await idempotencyModel.findOne({ key: idempotencyKey });

    let newOrder = idempotency ? [idempotency.response] : [];

    if (!idempotency) {
      const session = await mongoose.startSession();
      await session.startTransaction();

      try {
        newOrder = await orderModel.create(
          [
            {
              cart,
              address,
              comment,
              customerId,
              deliveryCharges: DELIVERY_CHARGES,
              discount: discountAmount,
              taxes,
              tenantId,
              total: finalTotal,
              paymentMode,
              orderStatus: OrderStatus.RECEIVED,
              paymentStatus: PaymentStatus.PENDING,
            },
          ],
          { session },
        );

        await idempotencyModel.create(
          [{ key: idempotencyKey, response: newOrder[0] }],
          { session },
        );

        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        await session.endSession();

        return next(createHttpError(500, err.message));
      } finally {
        await session.endSession();
      }
    }

    if (paymentMode === PaymentMode.CARD) {
      const session = await this.paymentGw.createSession({
        amount: finalTotal,
        orderId: newOrder[0]._id.toString(),
        tenantId: tenantId,
        currency: "usd",
        idempotenencyKey: idempotencyKey as string,
      });

      await this.broker.sendMessage("order", JSON.stringify(newOrder));

      return res.json({ paymentUrl: session.paymentUrl });
    }

    await this.broker.sendMessage("order", JSON.stringify(newOrder));

    return res.json({ paymentUrl: null });
  };

  getMine = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.auth.sub;

    if (!userId) {
      return next(createHttpError(400, "No userId found."));
    }
    console.log("userId from token:", userId);

    const customer = await customerModel.findOne({ userId });
    console.log("customer found:", customer);

    if (!customer) {
      return next(createHttpError(400, "No customer found."));
    }

    const orders = await orderModel.find(
      { customerId: customer._id },
      { cart: 0 },
    );
    console.log("orders found:", orders);

    return res.json(orders);
  };

  private calculateTotal = async (cart: CartItem[]) => {
    const productIds = cart.map((item) => item._id);
    console.log("Cart productIds:", productIds);

    const productPricings = await productCacheModel.find({
      productId: {
        $in: productIds,
      },
    });
    console.log("productPricings found:", JSON.stringify(productPricings));

    const cartToppingIds = cart.reduce((acc, item) => {
      return [
        ...acc,
        ...item.chosenConfiguration.selectedToppings.map(
          (topping) => topping.id,
        ),
      ];
    }, []);
    console.log("cartToppingIds:", cartToppingIds);

    const toppingPricings = await toppingCacheModel.find({
      toppingId: {
        $in: cartToppingIds,
      },
    });
    console.log("toppingPricings found:", JSON.stringify(toppingPricings));

    const totalPrice = cart.reduce((acc, curr) => {
      const cachedProductPrice = productPricings.find(
        (product) => product.productId === curr._id,
      );
      console.log(
        `For cart item ${curr._id}, cachedProductPrice:`,
        JSON.stringify(cachedProductPrice),
      );

      return (
        acc +
        curr.qty * this.getItemTotal(curr, cachedProductPrice, toppingPricings)
      );
    }, 0);

    return totalPrice;
  };

  private getItemTotal = (
    item: CartItem,
    cachedProductPrice: ProductPricingCache,
    toppingsPricings: ToppingPriceCache[],
  ) => {
    const toppingsTotal = item.chosenConfiguration.selectedToppings.reduce(
      (acc, curr) => {
        return acc + this.getCurrentToppingPrice(curr, toppingsPricings);
      },
      0,
    );

    const productTotal = Object.entries(
      item.chosenConfiguration.priceConfiguration,
    ).reduce((acc, [key, value]) => {
      const price =
        cachedProductPrice.priceConfiguration[key].availableOptions[value];
      return acc + price;
    }, 0);

    return productTotal + toppingsTotal;
  };

  private getCurrentToppingPrice = (
    topping: Topping,
    toppingPricings: ToppingPriceCache[],
  ) => {
    const currentTopping = toppingPricings.find(
      (current) => topping.id === current.toppingId,
    );

    if (!currentTopping) {
      return topping.price;
    }

    return currentTopping.price;
  };

  private getDiscountPercentage = async (
    couponCode: string,
    tenantId: string,
  ) => {
    const code = await couponModel.findOne({ code: couponCode, tenantId });

    if (!code) {
      return 0;
    }

    const currentDate = new Date();
    const couponDate = new Date(code.validUpto);

    if (currentDate <= couponDate) {
      return code.discount;
    }

    return 0;
  };
}