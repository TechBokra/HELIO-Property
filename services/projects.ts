
import { projectsData as initialProjectsData } from '../data/projects';
import type { Project } from '../types';

// Create a mutable, in-memory copy of the data to simulate a database.
let projectsData: Project[] = [...initialProjectsData];

const SIMULATED_DELAY = 50;

export const getAllProjects = (): Promise<Project[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([...projectsData]);
        }, SIMULATED_DELAY);
    });
};

export const getProjectById = (id: string): Promise<Project | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(projectsData.find(p => p.id === id));
        }, SIMULATED_DELAY);
    });
};

export const getProjectsByPartnerId = (partnerId: string): Promise<Project[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(projectsData.filter(p => p.partnerId === partnerId));
        }, SIMULATED_DELAY);
    });
};

export const addProject = (project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newProject: Project = {
                ...project,
                id: `proj-${Date.now()}`,
                createdAt: new Date().toISOString(),
            };
            projectsData.unshift(newProject);
            resolve(newProject);
        }, SIMULATED_DELAY);
    });
};

export const updateProject = (projectId: string, updates: Partial<Project>): Promise<Project | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const projectIndex = projectsData.findIndex(p => p.id === projectId);
            if (projectIndex > -1) {
                projectsData[projectIndex] = { ...projectsData[projectIndex], ...updates };
                resolve(projectsData[projectIndex]);
            } else {
                resolve(undefined);
            }
        }, SIMULATED_DELAY);
    });
};

export const deleteProject = (projectId: string): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const initialLength = projectsData.length;
            projectsData = projectsData.filter(p => p.id !== projectId);
            if (projectsData.length < initialLength) {
                resolve(true);
            } else {
                resolve(false);
            }
        }, SIMULATED_DELAY);
    });
};
