try {
  require("dotenv").config();
} catch (e) {
  // dotenv might not be available in production, ignore
}

module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL,
  },
};
