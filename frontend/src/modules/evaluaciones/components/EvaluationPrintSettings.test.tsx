import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EvaluationPrintSettings } from './EvaluationPrintSettings';
import { defaultPrintSettings } from '../printSettings';

describe('Formato de impresión', () => {
  it('conserva legacy hasta una elección expresa', async () => {
    const onChange = vi.fn();
    render(<EvaluationPrintSettings value={null} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Personalizar impresión' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ distribucion: 'compacta', blanco_negro: true }));
  });
  it('ofrece tres distribuciones independientes del color', async () => {
    function Fixture() {
      const [value, setValue] = useState(defaultPrintSettings());
      return <EvaluationPrintSettings value={value} onChange={setValue} />;
    }
    render(<Fixture />);
    const modes = screen.getByRole('combobox', { name: 'Distribución' });
    expect(modes.querySelectorAll('option')).toHaveLength(3);
    await userEvent.selectOptions(modes, 'amplia');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Color de impresión' }), 'color');
    expect(modes).toHaveValue('amplia');
    await userEvent.selectOptions(modes, 'media');
    expect(screen.getByRole('combobox', { name: 'Color de impresión' })).toHaveValue('color');
  });
});
