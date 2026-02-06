import React from 'react';
import { Download, Upload, FileDown } from 'lucide-react';
import { dataService } from '../src/services/DataService';

export const ProjectManagement: React.FC = () => {
    const validateProjectData = (data: any): { valid: boolean; error?: string } => {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Invalid project file: not a valid JSON object' };
        }
        if (!data.metadata || typeof data.metadata !== 'object') {
            return { valid: false, error: 'Invalid project file: missing or invalid "metadata" object' };
        }
        if (!data.floorPlan || typeof data.floorPlan !== 'object') {
            return { valid: false, error: 'Invalid project file: missing or invalid "floorPlan" object' };
        }
        if (!Array.isArray(data.devices)) {
            return { valid: false, error: 'Invalid project file: missing or invalid "devices" array' };
        }
        return { valid: true };
    };

    const handleGeneratePDF = () => {
        const projectId = window.location.pathname.split('/').pop() || '270-bolla-ave';
        window.location.href = `/floorplan/${projectId}?export=pdf`;
    };

    const handleExportProject = async () => {
        try {
            const projectData = await dataService.loadProject();
            const jsonString = JSON.stringify(projectData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `project-backup-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export project.');
        }
    };

    const handleImportProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const confirmed = confirm(
            'WARNING: Overwrite all current project data? This cannot be undone.'
        );
        if (!confirmed) {
            event.target.value = '';
            return;
        }

        try {
            const fileContent = await file.text();
            const projectData = JSON.parse(fileContent);
            const validation = validateProjectData(projectData);

            if (!validation.valid) {
                alert(`Invalid Project: ${validation.error}`);
                event.target.value = '';
                return;
            }

            await dataService.saveProject(projectData, true);
            alert('Project imported. Reloading...');
            window.location.reload();
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import project.');
        } finally {
            event.target.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-1">Project</div>
            <div className="px-4 space-y-2">
                <button
                    onClick={handleGeneratePDF}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-900/40 hover:bg-blue-800/40 border border-blue-500/30 rounded text-xs font-bold text-blue-400 uppercase transition-all"
                >
                    <FileDown size={14} className="text-blue-500" />
                    <span>Generate PDF Drawing</span>
                </button>
                <button
                    onClick={handleExportProject}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-xs font-bold text-slate-300 uppercase transition-all"
                >
                    <Download size={14} className="text-blue-500" />
                    <span>Export JSON</span>
                </button>
                <label className="block">
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImportProject}
                        className="hidden"
                    />
                    <span className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-xs font-bold text-slate-300 uppercase transition-all cursor-pointer">
                        <Upload size={14} className="text-orange-500" />
                        <span>Import JSON</span>
                    </span>
                </label>
            </div>
        </div>
    );
};
