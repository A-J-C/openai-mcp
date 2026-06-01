export function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      'OPENAI_API_KEY not configured. Set it in your Claude Desktop plugin settings.'
    );
  }
  return key;
}
