import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Response } from "express";

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const { statusCode, message } = mapPrismaKnownRequest(exception);
    response.status(statusCode).json({ statusCode, message });
  }
}

function mapPrismaKnownRequest(exception: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
} {
  switch (exception.code) {
    case "P2002":
      return { statusCode: HttpStatus.CONFLICT, message: "Registro duplicado." };
    case "P2025":
      return { statusCode: HttpStatus.NOT_FOUND, message: "Registro não encontrado." };
    case "P2003":
      return { statusCode: HttpStatus.BAD_REQUEST, message: "Referência inválida." };
    case "P2014":
      return { statusCode: HttpStatus.BAD_REQUEST, message: "Relação inválida entre registros." };
    default:
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Erro ao processar o pedido.",
      };
  }
}
