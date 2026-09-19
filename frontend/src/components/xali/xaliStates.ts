export const XALI_EXPRESSIONS = [
  'calm', 'happy', 'proud', 'thinking', 'attentive', 'encouraging', 'explaining', 'celebrating',
] as const;

export const XALI_GESTURES = ['rest', 'wave', 'point', 'thumbs-up', 'open-arms'] as const;
export const XALI_ACCESSORIES = ['none', 'book', 'lesson-card'] as const;

export type XaliExpression = typeof XALI_EXPRESSIONS[number];
export type XaliGesture = typeof XALI_GESTURES[number];
export type XaliAccessory = typeof XALI_ACCESSORIES[number];
export type XaliTone = 'neutral' | 'encouragement' | 'success' | 'attention';

export type XaliVisualState = {
  expression: XaliExpression;
  gesture: XaliGesture;
  accessory: XaliAccessory;
  tone: XaliTone;
};

export const XALI_COMBINATION_COUNT =
  XALI_EXPRESSIONS.length * XALI_GESTURES.length * XALI_ACCESSORIES.length;

export const XALI_STORY_STATES: Record<'welcome' | 'strength' | 'improvement' | 'next_step', XaliVisualState> = {
  welcome: { expression: 'attentive', gesture: 'wave', accessory: 'none', tone: 'neutral' },
  strength: { expression: 'proud', gesture: 'thumbs-up', accessory: 'none', tone: 'success' },
  improvement: { expression: 'explaining', gesture: 'point', accessory: 'lesson-card', tone: 'attention' },
  next_step: { expression: 'encouraging', gesture: 'open-arms', accessory: 'book', tone: 'encouragement' },
};

export function isValidXaliState(state: XaliVisualState): boolean {
  return XALI_EXPRESSIONS.includes(state.expression)
    && XALI_GESTURES.includes(state.gesture)
    && XALI_ACCESSORIES.includes(state.accessory);
}
