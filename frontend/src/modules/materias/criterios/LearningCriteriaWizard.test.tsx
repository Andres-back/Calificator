import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LearningCriteriaWizard } from './LearningCriteriaWizard';

vi.mock('./api', () => ({
  addLearningTextSource: vi.fn(),
  addLearningReferenceSource: vi.fn(),
  approveLearningCriteria: vi.fn(),
  createLearningCriteria: vi.fn(),
  getLearningCriteria: vi.fn(),
  proposeLearningCriteria: vi.fn(),
  updateLearningCriteriaVersion: vi.fn(),
  uploadLearningSource: vi.fn(),
}));

vi.mock('./LearningSourcePicker', () => ({
  LearningSourcePicker: () => <div>Selector de material de prueba</div>,
}));

const props = {
  open: true,
  onClose: vi.fn(),
  materiaId: 'materia-1',
  materiaGrado: '5',
  onChanged: vi.fn(),
  canGenerate: true,
};

describe('LearningCriteriaWizard', () => {
  it('ofrece tres comienzos claros y permite continuar sin material', async () => {
    const user = userEvent.setup();
    render(<LearningCriteriaWizard {...props} />);

    expect(screen.getByRole('button', { name: /Usar foto, PDF o material/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escribir lo que enseñé/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Usar criterios que ya tengo/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Escribir lo que enseñé/ }));
    expect(screen.getByRole('heading', { name: '¿Qué y cómo quieres evaluar?' })).toBeVisible();
  });

  it('abre material y entrega la reutilización al listado existente', async () => {
    const user = userEvent.setup();
    const onBrowseExisting = vi.fn();
    const view = render(<LearningCriteriaWizard {...props} hasExisting onBrowseExisting={onBrowseExisting} />);

    await user.click(screen.getByRole('button', { name: /Usar foto, PDF o material/ }));
    expect(screen.getByText('Selector de material de prueba')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continuar sin material' })).toBeVisible();

    view.unmount();
    render(<LearningCriteriaWizard {...props} hasExisting onBrowseExisting={onBrowseExisting} />);
    await user.click(screen.getByRole('button', { name: /Usar criterios que ya tengo/ }));
    expect(onBrowseExisting).toHaveBeenCalledOnce();
  });
});
