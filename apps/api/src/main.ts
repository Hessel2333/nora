import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { config } from "dotenv";
import { AppModule } from "./app.module.js";

config({ path: "../../.env" });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(","),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const openApi = new DocumentBuilder()
    .setTitle("Nora MVP API")
    .setDescription("订单中心与 BOM 本地 MVP 接口")
    .setVersion("0.1.0")
    .addTag("health")
    .addTag("catalog")
    .addTag("orders")
    .addTag("boms")
    .addTag("production-demands")
    .addTag("production-batches")
    .addTag("work-orders")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, openApi));

  await app.listen(Number(process.env.PORT ?? 3100));
}

void bootstrap();
