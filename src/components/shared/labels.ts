import type { VerificationLevel } from '../../types/community';
import type { DataClassification } from '../../types/source';
import type { BadgeTone } from './Badge';

export const VERIFICATION_LABEL: Record<VerificationLevel, { label: string; tone: BadgeTone; explanation: string }> = {
  'official-record': {
    label: 'Official record',
    tone: 'official',
    explanation: 'Taken from the responsible authority’s own record.',
  },
  'cross-checked': {
    label: 'Cross-checked',
    tone: 'derived',
    explanation: 'Two or more independent sources agree.',
  },
  'single-source': {
    label: 'Single source',
    tone: 'caution',
    explanation: 'One credible source; awaiting a second check.',
  },
};

export const CLASSIFICATION_LABEL: Record<DataClassification, { label: string; tone: BadgeTone; explanation: string }> = {
  official: {
    label: 'Official',
    tone: 'official',
    explanation: 'Published by the responsible authority.',
  },
  derived: {
    label: 'Derived',
    tone: 'derived',
    explanation: 'Produced from other data by generalization, transcription or calculation.',
  },
  illustrative: {
    label: 'Illustrative',
    tone: 'muted',
    explanation: 'For orientation only; not for measurement or legal use.',
  },
  incomplete: {
    label: 'Incomplete',
    tone: 'caution',
    explanation: 'Partial, secondary or awaiting review.',
  },
};
