import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FeedbackChatMessage } from './FeedbackChatMessage';
import { normalizeChatMarkdown } from './chatMarkdown';

describe('explicación decorada y segura', () => {
  it('presenta énfasis y pasos sin asteriscos, conservando el texto', () => {
    render(<FeedbackChatMessage question="¿En qué fallé?" answer={'Debías marcar ** V (Verdadera) **.\n\n**Paso concreto:** Relee el párrafo.\n\n**Ejemplo nuevo:** Busca un lago.'} />);
    expect(screen.getByText('V (Verdadera)')).toHaveProperty('tagName', 'STRONG');
    expect(screen.getByText('Paso concreto:')).toHaveProperty('tagName', 'STRONG');
    expect(screen.getByText('Tu pregunta')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('**');
  });
  it('no normaliza código/matemáticas ni ejecuta HTML o recursos remotos', () => {
    const text = '`** literal **` y $x ** y$';
    expect(normalizeChatMarkdown(text)).toBe(text);
    render(<FeedbackChatMessage question={'<img src=x>'} answer={'[Sitio](https://evil.test) ![Ilustración](https://evil.test/a.png) <img src=x onerror=alert(1)>\n\n| A | B |\n|---|---|\n| 1 | 2 |'} />);
    expect(document.querySelector('img, a, script, iframe')).toBeNull();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('<img src=x>')).toBeInTheDocument();
    expect(screen.getByText('Ilustración')).toBeInTheDocument();
  });
});
