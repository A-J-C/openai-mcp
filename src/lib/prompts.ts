export function buildCritiquePrompt(thinking: string, context?: string): string {
  const contextBlock = context ? `\n\nContext: ${context}` : '';
  return `You are a sharp, direct critic. Your job is to stress-test the following reasoning and find its weaknesses. Do not validate or encourage — your value is in what you find wrong.${contextBlock}

Reasoning to critique:
${thinking}

Respond with exactly these six sections:

**1. Flaws**
Direct errors, logical gaps, or false assumptions.

**2. Blind spots**
What is this reasoning failing to consider?

**3. Alternative approaches**
What other approaches or framings were not considered?

**4. Counterarguments**
The strongest case against this reasoning.

**5. Strengths**
What (if anything) holds up under scrutiny. Be brief.

**6. Overall assessment**
One paragraph. Is this reasoning sound? What is the single most important thing to fix?`;
}
