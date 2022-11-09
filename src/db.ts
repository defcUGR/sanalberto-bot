import { Actions, Admin, Degree, PrismaClient } from "@prisma/client";
import {
  AdminCreateInput,
  AdminWhereUniqueInput,
  DegreeCreateInput,
  DegreeWhereUniqueInput,
  ActionWhereInput,
} from "prisma";
import Logger from "bunyan";
import { v4 as uuidv4 } from "uuid";
import { Context } from "vm";

type LogData = {
  success?: Record<string, any>;
  error?: Record<string, any>;
};

export class DataBase {
  private _prisma: PrismaClient;
  private logger: Logger;

  get prisma() {
    return this._prisma;
  }

  constructor(logger) {
    this._prisma = new PrismaClient();
    this.logger = logger;
  }

  async isNotAdmin(ctx): Promise<boolean> {
    return (
      (await this._prisma.admin
        .findUnique({
          where: {
            username: ctx.message.from.username,
          },
        })
        .then((result) => {
          this.logger.trace(
            { result, username: ctx.message.from.username },
            "check admin"
          );
          return result;
        })) === null
    );
  }

  async tokenActions() {
    return this._prisma.actions.findMany({
      where: {
        type: {
          startsWith: "admintoken_", // TODO Move all this to constants
        },
      },
    });
  }

  async pointActions(where?: ActionWhereInput) {
    return this._prisma.actions.findMany({
      where: {
        type: {
          startsWith: "pointmanagement_",
          ...where,
        },
      },
    });
  }

  async actionCreate(
    ctx: Context,
    type?: ActionType,
    data?: string,
    uuid?: string,
    log_data?: LogData
  ): Promise<Actions> {
    return new Promise((resolve, reject) =>
      this._prisma.actions
        .create({
          data: {
            identifier: uuid === undefined ? uuidv4() : uuid,
            message_id: ctx.message.message_id,
            data,
            type,
          },
        })
        .then((action) => {
          this.logger.trace({ action, ...log_data?.success }, "action created");
          resolve(action);
        })
        .catch((err) => {
          this.logger.error(
            { err, ...log_data?.error },
            "error in db when creating action"
          );
          reject(err);
        })
    );
  }

  actionClear(action: Actions, log_data?: LogData) {
    this._prisma.actions
      .delete({
        where: { id: action.id },
      })
      .then((res) => {
        this.logger.trace(
          { action, res, ...log_data.success },
          "removed used action"
        );
      })
      .catch((err) => {
        this.logger.error(
          { err, action, ...log_data.error },
          "internal error when removing action"
        );
      });
  }

  async admins() {
    return this._prisma.admin.findMany();
  }

  async adminCount() {
    return this._prisma.admin.count();
  }

  adminCreate(data: AdminCreateInput, log_data?: LogData): Promise<Admin> {
    return new Promise((resolve, reject) => {
      this._prisma.admin
        .create({
          data,
        })
        .then((admin) => {
          this.logger.info(
            { admin, ...log_data?.success },
            "registered new admin"
          );
          resolve(admin);
        })
        .catch((err) => {
          this.logger.error(
            { err, data, ...log_data?.error },
            "error interno al registrar administrador"
          );
          reject();
        });
    });
  }

  adminDelete(
    where: AdminWhereUniqueInput,
    log_data?: LogData
  ): Promise<Admin> {
    return new Promise((resolve, reject) => {
      this._prisma.admin
        .delete({
          where,
        })
        .then((admin) => {
          this.logger.info(
            { admin, ...log_data?.success },
            "successfully deleted admin"
          );
          resolve(admin);
        })
        .catch((err) => {
          this.logger.error(
            { err, data: where, ...log_data?.error },
            "db error when deleting admin"
          );
          reject(err);
        });
    });
  }

  async degree(where: DegreeWhereUniqueInput) {
    return this._prisma.degree.findUnique({
      where,
    });
  }

  async degreeCreate(
    data: DegreeCreateInput,
    log_data?: LogData
  ): Promise<Degree> {
    return new Promise((resolve, reject) => {
      this._prisma.degree
        .create({
          data,
        })
        .then((degree) => {
          this.logger.info({ degree, ...log_data?.success }, "created degree");
          resolve(degree);
        })
        .catch((err) => {
          this.logger.error(
            { err, data, ...log_data?.error },
            "db error when creating degree"
          );
          reject();
        });
    });
  }

  async degreeDelete(
    where: DegreeWhereUniqueInput,
    log_data?: LogData
  ): Promise<Degree> {
    return new Promise((resolve, reject) =>
      this._prisma.degree
        .delete({
          where,
        })
        .then((degree) => {
          this.logger.warn({ degree, ...log_data?.success }, "degree deleted");
          resolve(degree);
        })
        .catch((err) => {
          this.logger.error(
            { err, where, ...log_data?.error },
            "db error when deleting degree"
          );
        })
    );
  }
}

export type ActionType = AdminTokenVerification | PointManagement;

export enum AdminTokenVerification {
  AddAdmin = "admintoken_addadmin",
  AddDegree = "admintoken_adddegree",
}

export enum PointManagement {
  AddSelectPoints = "pointmanagement_add_select_points",
}
