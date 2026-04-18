import { MuscleGroup } from '../types/workout'

export const colors = {
  primary: '#1E3A5F',
  accent: '#00D9C4',

  background: '#f5f7fa',
  surface: '#fff',
  surfaceAlt: '#f0f0f0',

  border: '#e0e0e0',
  borderLight: '#f0f0f0',

  text: {
    primary: '#333',
    secondary: '#666',
    muted: '#999',
    faint: '#ccc',
    inverse: '#fff',
    accent: '#1E3A5F',
  },

  error: '#e74c3c',
  warning: '#f39c12',
  success: '#27ae60',

  muscles: {
    chest: '#e74c3c',
    back: '#3498db',
    lats: '#3498db',
    front_delt: '#9b59b6',
    side_delt: '#9b59b6',
    rear_delt: '#9b59b6',
    biceps: '#e67e22',
    triceps: '#e67e22',
    forearms: '#e67e22',
    quadriceps: '#27ae60',
    hamstrings: '#27ae60',
    glutes: '#27ae60',
    calves: '#27ae60',
    core: '#f39c12',
    traps: '#1abc9c',
  } as Record<MuscleGroup, string>,

  muscleDefault: '#666',
} as const
