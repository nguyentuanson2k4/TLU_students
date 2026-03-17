"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    let basePort = parseInt(process.env.PORT || '3000', 10);
    while (true) {
        try {
            await app.listen(basePort);
            console.log(`Application is running on port: ${basePort}`);
            break;
        }
        catch (error) {
            if (error.code === 'EADDRINUSE') {
                console.warn(`Port ${basePort} is in use, trying port ${basePort + 1}...`);
                basePort++;
            }
            else {
                throw error;
            }
        }
    }
}
bootstrap();
//# sourceMappingURL=main.js.map