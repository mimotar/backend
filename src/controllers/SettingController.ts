import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
// import { ISetting } from "../types/settingType";
import { ISetting, SettingSchema } from "../zod/SettingSchema";
import { z } from "zod";

export class SettingController {
  constructor(private readonly prismaClient: PrismaClient) {}

  async find(req: Request, res: Response, next: NextFunction) {
    const payload = req.body;

    try {
      const setting = this.prismaClient.setting.findFirst({
        where: {
          user_id: payload.id,
        },
      });
      res.status(200).json({
        message: "setting fetch successfully",
        data: setting,
        success: true,
      });
      return;
    } catch (error) {
      if (error instanceof GlobalError) {
        next(
          new GlobalError(
            error.name,
            error.message,
            error.statusCode,
            error.operational
          )
        );
        return;
      }

      if (error instanceof Error) {
        next(new GlobalError(error.name, "Internal server Error", 500, false));
        return;
      }
      next(
        new GlobalError("UnknownError", "Internal server Error", 500, false)
      );

      return;
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    const payload = req.body;
    let fields: keyof ISetting = payload.field;
    let user_id: string = payload.user_id;
    const updateValue: Partial<ISetting> = payload.value;

    const updateSchema = z.object({
      update: SettingSchema.partial(),
      field: SettingSchema.keyof(),
    });

    const parsedPayloadValidate = updateSchema.safeParse({
      update: updateValue,
      fields: fields,
    });

    if (!parsedPayloadValidate.success) {
      let error: string = "";
      const errors = parsedPayloadValidate.error.format();
      console.log(errors);
      for (let [key, value] of Object.entries(errors)) {
        // console.log(key, value);
        if (
          value &&
          typeof value === "object" &&
          "_errors" in value &&
          Array.isArray(value._errors)
        ) {
          error += ` ${key} field: ${value._errors[0]},`;
        }
      }

      next(new GlobalError("ZodError", String(error), 400, true));
      return;
    }

    try {
      const updatedSetting =
        await this.prismaClient.setting.updateManyAndReturn({
          where: { user_id: user_id as any },
          data: { [fields]: updateValue },
        });

      res.status(200).json({
        message: "setting update successfully",
        data: updatedSetting,
        success: true,
      });
      return;
    } catch (error) {
      if (error instanceof GlobalError) {
        next(
          new GlobalError(
            error.name,
            error.message,
            error.statusCode,
            error.operational
          )
        );
        return;
      }

      if (error instanceof Error) {
        next(new GlobalError(error.name, "Internal server Error", 500, false));
        return;
      }
      next(
        new GlobalError("UnknownError", "Internal server Error", 500, false)
      );

      return;
    }
  }
}
