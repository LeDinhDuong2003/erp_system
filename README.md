## Project setup

```bash
$ npm install
```

```bash
$ docker-compose up --build
```

Tạo file .env với DATABASE_URL="postgresql://username:strong_password@localhost:5432/database_name?schema=public"


```bash
$ npm run prisma:migrate -- --name init_project_table
$ npm run prisma:generate
```
## Compile and run the project

```bash
# watch mode
$ npm run start:dev
```