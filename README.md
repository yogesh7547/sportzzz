# Sportzzz

## Express server

Run the server on port 8000:

```sh
npm run dev
```

## Neon PostgreSQL with Drizzle

This project uses JavaScript, Drizzle ORM, and the `node-postgres` (`pg`) driver.
Copy your Neon connection string into `.env` as `DATABASE_URL`. The format is
shown in `.env.example`; replace all placeholders with values from the Neon
Console.

Once `DATABASE_URL` is set, generate and apply the schema migration, then run
the CRUD example:

```sh
npm run db:generate
npm run db:migrate
npm run db:example
```

The CRUD example creates a temporary demo user, reads and updates it, then
deletes it. It is separate from the Express server entry point.