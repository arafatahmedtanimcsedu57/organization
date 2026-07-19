export interface AppConfig {
  port: number;
  database: {
    url: string;
  };
}

export default (): AppConfig => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  return {
    port: Number(process.env.API_PORT) || 3000,
    database: {
      url: databaseUrl,
    },
  };
};
