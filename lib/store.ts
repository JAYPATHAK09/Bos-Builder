'use client';

/**
 * Zustand store — single source of truth for all BOS Builder state.
 * Uses localStorage for persistence in MVP.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project, CompanyProfile, ModuleKey, ModuleState, ModuleStatus,
  ModuleVersion, ModuleSuggestion, UploadedDocument, ConflictLog,
} from './types';
import { computeBosCompletion, applyStaleFlags, computeStaleModules } from './dependency-engine';
import { MODULE_META } from './types';

// ─── Default module state ─────────────────────────────────────────────────────

function defaultModuleState(key: ModuleKey): ModuleState {
  return {
    key,
    status: 'not_started',
    completionPct: 0,
    inputs: {},
    versions: [],
    suggestions: [],
    isStale: false,
    staleReason: undefined,
  };
}

function defaultModules(): Partial<Record<ModuleKey, ModuleState>> {
  const keys: ModuleKey[] = ['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11'];
  return Object.fromEntries(keys.map(k => [k, defaultModuleState(k)])) as Record<ModuleKey, ModuleState>;
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface BOSStore {
  projects: Project[];
  activeProjectId: string | null;

  // Project CRUD
  createProject: (clientName: string, profile: Partial<CompanyProfile>) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setActiveProject: (id: string) => void;
  getActiveProject: () => Project | null;

  // Profile
  updateProfile: (projectId: string, profile: Partial<CompanyProfile>) => void;

  // Module state
  updateModuleInputs: (projectId: string, moduleKey: ModuleKey, inputs: Record<string, unknown>) => void;
  setModuleStatus: (projectId: string, moduleKey: ModuleKey, status: ModuleStatus) => void;
  saveModuleVersion: (projectId: string, moduleKey: ModuleKey, version: Omit<ModuleVersion, 'id' | 'createdAt'>) => void;
  addModuleSuggestion: (projectId: string, moduleKey: ModuleKey, suggestion: Omit<ModuleSuggestion, 'id' | 'createdAt' | 'status'>) => void;
  updateSuggestionStatus: (projectId: string, moduleKey: ModuleKey, suggestionId: string, status: ModuleSuggestion['status']) => void;
  finalizeModule: (projectId: string, moduleKey: ModuleKey, changedFields: string[]) => void;
  clearStale: (projectId: string, moduleKey: ModuleKey) => void;

  // Documents
  addDocument: (projectId: string, doc: UploadedDocument) => void;
  addConflictLog: (projectId: string, log: ConflictLog) => void;
  resolveConflict: (projectId: string, conflictId: string, resolution: ConflictLog['resolution'], value: string) => void;
}

// ─── Store Implementation ────────────────────────────────────────────────────

export const useBOSStore = create<BOSStore>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      createProject(clientName, profile) {
        const id = uuidv4();
        const project: Project = {
          id,
          clientName,
          profile,
          modules: defaultModules(),
          documents: [],
          conflictLogs: [],
          bosCompletionPct: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set(state => ({
          projects: [...state.projects, project],
          activeProjectId: id,
        }));
        return id;
      },

      updateProject(id, updates) {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      setActiveProject(id) {
        set({ activeProjectId: id });
      },

      getActiveProject() {
        const { projects, activeProjectId } = get();
        return projects.find(p => p.id === activeProjectId) ?? null;
      },

      updateProfile(projectId, profile) {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, profile: { ...p.profile, ...profile }, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      updateModuleInputs(projectId, moduleKey, inputs) {
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            const current = p.modules[moduleKey] ?? defaultModuleState(moduleKey);
            const updated = {
              ...current,
              inputs: { ...current.inputs, ...inputs },
              status: current.status === 'not_started' ? 'in_progress' as ModuleStatus : current.status,
              completionPct: computeModuleCompletion(moduleKey, { ...current.inputs, ...inputs }),
            };
            return {
              ...p,
              modules: { ...p.modules, [moduleKey]: updated },
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      setModuleStatus(projectId, moduleKey, status) {
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            const current = p.modules[moduleKey] ?? defaultModuleState(moduleKey);
            return {
              ...p,
              modules: { ...p.modules, [moduleKey]: { ...current, status } },
            };
          }),
        }));
      },

      saveModuleVersion(projectId, moduleKey, versionData) {
        const version: ModuleVersion = {
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          ...versionData,
        };
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            const current = p.modules[moduleKey] ?? defaultModuleState(moduleKey);
            const newVersions = [...current.versions, version];
            // Auto-label: v0 for first, then v1, v2...
            const label = newVersions.length === 1 ? 'v0' : `v${newVersions.length - 1}`;
            version.label = label;
            const updated = {
              ...current,
              status: 'draft' as ModuleStatus,
              versions: newVersions,
              generatedAt: new Date().toISOString(),
              completionPct: Math.max(current.completionPct, 60),
            };
            const updatedModules = { ...p.modules, [moduleKey]: updated };
            return {
              ...p,
              modules: updatedModules,
              bosCompletionPct: computeBosCompletion(updatedModules),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      addModuleSuggestion(projectId, moduleKey, suggestionData) {
        const suggestion: ModuleSuggestion = {
          id: uuidv4(),
          status: 'pending',
          createdAt: new Date().toISOString(),
          ...suggestionData,
        };
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            const current = p.modules[moduleKey] ?? defaultModuleState(moduleKey);
            return {
              ...p,
              modules: {
                ...p.modules,
                [moduleKey]: { ...current, suggestions: [...current.suggestions, suggestion] },
              },
            };
          }),
        }));
      },

      updateSuggestionStatus(projectId, moduleKey, suggestionId, status) {
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            const current = p.modules[moduleKey];
            if (!current) return p;
            return {
              ...p,
              modules: {
                ...p.modules,
                [moduleKey]: {
                  ...current,
                  suggestions: current.suggestions.map(s =>
                    s.id === suggestionId ? { ...s, status } : s
                  ),
                },
              },
            };
          }),
        }));
      },

      finalizeModule(projectId, moduleKey, changedFields) {
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            const current = p.modules[moduleKey] ?? defaultModuleState(moduleKey);
            const updated = {
              ...current,
              status: 'finalized' as ModuleStatus,
              finalizedAt: new Date().toISOString(),
              completionPct: 100,
            };

            // Propagate stale flags
            const staleMap = computeStaleModules(moduleKey, changedFields, p.modules);
            const updatedModules = applyStaleFlags(
              { ...p.modules, [moduleKey]: updated },
              staleMap as Record<ModuleKey, string>
            );

            return {
              ...p,
              modules: updatedModules,
              bosCompletionPct: computeBosCompletion(updatedModules),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      clearStale(projectId, moduleKey) {
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            const current = p.modules[moduleKey];
            if (!current) return p;
            return {
              ...p,
              modules: {
                ...p.modules,
                [moduleKey]: { ...current, isStale: false, staleReason: undefined },
              },
            };
          }),
        }));
      },

      addDocument(projectId, doc) {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, documents: [...p.documents, doc], updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      addConflictLog(projectId, log) {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, conflictLogs: [...p.conflictLogs, log] }
              : p
          ),
        }));
      },

      resolveConflict(projectId, conflictId, resolution, value) {
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              conflictLogs: p.conflictLogs.map(c =>
                c.id === conflictId
                  ? { ...c, resolution, resolvedValue: value, resolvedAt: new Date().toISOString() }
                  : c
              ),
            };
          }),
        }));
      },
    }),
    {
      name: 'bos-builder-state',
      version: 1,
    }
  )
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeModuleCompletion(moduleKey: ModuleKey, inputs: Record<string, unknown>): number {
  // Required fields per module
  const requiredFields: Partial<Record<ModuleKey, string[]>> = {
    m01: ['purpose_statement', 'core_values'],
    m02: ['vision_statement', 'mission_statement'],
    m03: ['strategic_themes', 'revenue_3yr'],
    m04: ['annual_goals', 'budget_plan'],
    m05: ['north_star_kpi', 'kpi_library'],
    m06: ['dashboard_sections', 'ceo_view'],
    m07: ['weekly_meetings', 'monthly_mbr'],
    m08: ['review_cycle', 'rating_scale', 'role_scorecards'],
    m09: ['eligibility', 'kpi_linkage', 'payout_schedule'],
    m10: ['sales_team', 'product_targets'],
    m11: ['org_nodes', 'jd_templates'],
  };

  const required = requiredFields[moduleKey] ?? [];
  if (required.length === 0) return 0;

  const filled = required.filter(f => {
    const val = inputs[f];
    return val !== undefined && val !== null && val !== '' &&
      !(Array.isArray(val) && val.length === 0);
  }).length;

  return Math.round((filled / required.length) * 100);
}

// Selector helpers (use in components)
export const selectProject = (id: string) => (state: BOSStore) =>
  state.projects.find(p => p.id === id);

export const selectActiveProject = (state: BOSStore) =>
  state.projects.find(p => p.id === state.activeProjectId) ?? null;

export const selectModule = (projectId: string, moduleKey: ModuleKey) => (state: BOSStore) => {
  const project = state.projects.find(p => p.id === projectId);
  return project?.modules[moduleKey] ?? null;
};
