'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBOSStore, selectProject } from '@/lib/store';
import { MODULE_META, MODULE_ORDER } from '@/lib/types';
import type { ModuleKey } from '@/lib/types';
import { buildModuleHTML, buildMasterPackHTML } from '@/lib/render';

export default function ExportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const project = useBOSStore(selectProject(projectId));

  const [selected, setSelected] = useState<Set<ModuleKey>>(
    new Set(MODULE_ORDER.filter(k => {
      const m = project?.modules[k];
      return m && ['draft', 'finalized'].includes(m.status);
    }))
  );

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Project not found. <button onClick={() => router.push('/')} className="text-brand-600 hover:underline">← Home</button></p>
      </div>
    );
  }

  const toggle = (k: ModuleKey) =>
    setSelected(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s; });

  const handleMasterPackHtml = () => {
    const modules = MODULE_ORDER
      .filter(k => selected.has(k))
      .map(k => ({
        title: MODULE_META[k].title,
        markdown: (project.modules[k]?.versions?.at(-1)?.contentMarkdown) ?? '',
      }))
      .filter(m => m.markdown);

    if (modules.length === 0) { alert('No finalized/draft modules selected.'); return; }

    const html = buildMasterPackHTML(
      modules,
      project.clientName,
      (project.profile as { planningYear?: string })?.planningYear ?? ''
    );
    const slug = project.clientName.replace(/\s+/g, '-').toLowerCase();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `${slug}-BOS-Master-Pack.html` }).click();
    URL.revokeObjectURL(url);
  };

  const handlePrintMasterPack = () => {
    const modules = MODULE_ORDER
      .filter(k => selected.has(k))
      .map(k => ({
        title: MODULE_META[k].title,
        markdown: (project.modules[k]?.versions?.at(-1)?.contentMarkdown) ?? '',
      }))
      .filter(m => m.markdown);

    if (modules.length === 0) { alert('No finalized/draft modules selected.'); return; }

    const html = buildMasterPackHTML(
      modules,
      project.clientName,
      (project.profile as { planningYear?: string })?.planningYear ?? ''
    );
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Pop-ups blocked. Please allow pop-ups.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const handleDownloadIndividual = (k: ModuleKey) => {
    const markdown = project.modules[k]?.versions?.at(-1)?.contentMarkdown ?? '';
    if (!markdown) { alert('No draft available for this module.'); return; }
    const html = buildModuleHTML(markdown, project.clientName, MODULE_META[k].title, project.modules[k]?.versions?.at(-1)?.label ?? 'v1');
    const slug = `${project.clientName.replace(/\s+/g, '-').toLowerCase()}-${k}`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `${slug}.html` }).click();
    URL.revokeObjectURL(url);
  };

  const readyModules = MODULE_ORDER.filter(k => {
    const m = project.modules[k];
    return m && ['draft', 'finalized'].includes(m.status);
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white shadow-lg">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href={`/dashboard/${projectId}`} className="text-slate-400 hover:text-white text-sm transition-colors">← Dashboard</Link>
          <span className="text-slate-600">|</span>
          <div>
            <div className="text-sm font-bold">Master Pack Export</div>
            <div className="text-xs text-slate-400">{project.clientName}</div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-lg mx-auto px-6 py-8 w-full">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Export Business Operating System Pack</h2>
          <p className="text-sm text-slate-500">Select modules to include in the combined export.</p>

          {readyModules.length === 0 ? (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              No modules have been drafted yet. <Link href={`/dashboard/${projectId}`} className="underline">Go back and generate some modules first.</Link>
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODULE_ORDER.map(k => {
                  const m = project.modules[k];
                  const isReady = m && ['draft', 'finalized'].includes(m.status);
                  const isSelected = selected.has(k);

                  return (
                    <div key={k}
                      onClick={() => isReady && toggle(k)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                        ${!isReady ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200' :
                        isSelected ? 'bg-brand-50 border-brand-400' : 'bg-white border-slate-200 hover:border-slate-400'}`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-slate-300'}`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                      <span className="text-lg flex-shrink-0">{MODULE_META[k].icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{MODULE_META[k].title}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {isReady
                            ? `${m.status === 'finalized' ? '✓ Finalized' : 'Draft'} · ${m.versions?.at(-1)?.label ?? ''}`
                            : 'Not started'}
                        </div>
                      </div>
                      {isReady && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDownloadIndividual(k); }}
                          className="ml-auto text-xs text-slate-400 hover:text-brand-600 transition-colors flex-shrink-0 px-2 py-1 rounded hover:bg-brand-50">
                          ↓ HTML
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
                <button onClick={handleMasterPackHtml} disabled={selected.size === 0}
                  className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-sm disabled:opacity-40 transition-all flex items-center gap-2">
                  ↓ Download Combined HTML
                </button>
                <button onClick={handlePrintMasterPack} disabled={selected.size === 0}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow disabled:opacity-40 transition-all flex items-center gap-2">
                  🖨️ Print Master Pack as PDF
                </button>
                <div className="ml-auto text-xs text-slate-400 flex items-center">
                  {selected.size} of {readyModules.length} ready modules selected
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>💡 Print-to-PDF tip:</strong> Use Chrome for best results. In the print dialog, select &quot;Save as PDF&quot;, enable &quot;Background graphics&quot;, and set margins to Minimum or None for a clean A4 layout.
        </div>
      </main>
    </div>
  );
}
