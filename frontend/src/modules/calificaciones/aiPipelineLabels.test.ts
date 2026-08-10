import { describe, expect, it } from 'vitest';
import { formatAIModelSource } from './aiPipelineLabels';

describe('formatAIModelSource', () => {
  it('diferencia OpenCode Go de OpenAI', () => {
    expect(formatAIModelSource({ proveedor: 'opencode', modelo: 'qwen3.7-plus' }))
      .toBe('OpenCode Go · qwen3.7-plus');
  });

  it('identifica la cascada externa solo como contingencia', () => {
    expect(formatAIModelSource({ proveedor: 'vision_router', modelo: 'openai_groq_cascade' }))
      .toBe('OpenAI/Groq (contingencia) · openai_groq_cascade');
  });
});