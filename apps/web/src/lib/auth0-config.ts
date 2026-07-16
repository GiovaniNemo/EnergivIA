export const isAuth0Configured = (): boolean => {
  const secret = process.env["AUTH0_SECRET"];
  const domain = process.env["AUTH0_DOMAIN"];
  const clientId = process.env["AUTH0_CLIENT_ID"];
  const clientSecret = process.env["AUTH0_CLIENT_SECRET"];
  if (!secret || !domain || !clientId || !clientSecret) return false;
  if (domain.includes("YOUR_TENANT") || domain.includes("your_tenant")) return false;
  if (clientId.includes("YOUR_CLIENT") || clientId.includes("your_client")) return false;
  return true;
};
