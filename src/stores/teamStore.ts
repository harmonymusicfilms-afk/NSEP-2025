import { create } from 'zustand';
import { client as backend } from '@/lib/backend';
import { generateId } from '@/lib/utils';
import { APP_CONFIG } from '@/constants/config';

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    description: string;
    imageUrl?: string;
    displayOrder: number;
}

const defaultTeamMembers: TeamMember[] = [
    {
        id: '1',
        name: 'Dr. Rajendra Prasad',
        role: 'Chairman',
        description: 'Former education minister with 30+ years of experience in educational policy making.',
        displayOrder: 1,
    },
    {
        id: '2',
        name: 'Mrs. Sunita Devi',
        role: 'Director - Operations',
        description: 'Educational administrator specializing in scholarship program management.',
        displayOrder: 2,
    },
    {
        id: '3',
        name: 'Mr. Vikram Singh',
        role: 'Head - Examination',
        description: 'Expert in conducting large-scale examinations with integrity and transparency.',
        displayOrder: 3,
    },
    {
        id: '4',
        name: 'Ms. Priya Sharma',
        role: 'Student Relations',
        description: 'Dedicated to ensuring smooth communication between students and the organization.',
        displayOrder: 4,
    },
];

interface TeamState {
    members: TeamMember[];
    isLoading: boolean;
    loadMembers: () => Promise<void>;
    addMember: (member: Omit<TeamMember, 'id'>) => Promise<void>;
    updateMember: (id: string, updates: Partial<TeamMember>) => Promise<void>;
    deleteMember: (id: string) => Promise<void>;
    reorderMembers: (members: TeamMember[]) => Promise<void>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
    members: [],
    isLoading: false,

    loadMembers: async () => {
        set({ isLoading: true });
        try {
            const { data, error } = await backend
                .from('team_members')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) {
                throw error;
            }
            if (data && data.length > 0) {
                set({
                    members: data.map((d) => ({
                        id: d.id,
                        name: d.name,
                        role: d.role,
                        description: d.description,
                        imageUrl: d.image_url,
                        displayOrder: d.display_order,
                    }))
                });
                return;
            } else {
                // return empty array if no data rather than defaults, unless it's really empty
                set({ members: defaultTeamMembers });
            }
        } catch (error) {
            console.warn('Error loading team_members (using defaults):', error);
            // Fallback to localStorage
            const str = localStorage.getItem('gphdm_team_members');
            if (str) {
                set({ members: JSON.parse(str) });
            } else {
                set({ members: defaultTeamMembers });
            }
        } finally {
            set({ isLoading: false });
        }
    },

    addMember: async (member) => {
        const id = generateId();
        const newMember: TeamMember = { ...member, id };

        set((state) => {
            const updated = [...state.members, newMember];
            localStorage.setItem('gphdm_team_members', JSON.stringify(updated));
            return { members: updated };
        });

        try {
            const { error: insertError } = await backend.from('team_members').insert([{
                id: newMember.id,
                name: newMember.name,
                role: newMember.role,
                description: newMember.description,
                image_url: newMember.imageUrl,
                display_order: newMember.displayOrder,
            }]);
            if (insertError) {
                console.error('Failed to insert team member:', insertError);
            }
        } catch (e) {
            console.error('Failed to save team member to backend', e);
        }
    },

    updateMember: async (id, updates) => {
        set((state) => {
            const updated = state.members.map(m => m.id === id ? { ...m, ...updates } : m);
            localStorage.setItem('gphdm_team_members', JSON.stringify(updated));
            return { members: updated };
        });

        try {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.role !== undefined) dbUpdates.role = updates.role;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
            if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;

            const { error: updateError } = await backend.from('team_members').update(dbUpdates).eq('id', id);
            if (updateError) {
                console.error('Failed to update team member:', updateError);
            }
        } catch (e) {
            console.error('Failed to update team member in backend', e);
        }
    },

    deleteMember: async (id) => {
        set((state) => {
            const updated = state.members.filter(m => m.id !== id);
            localStorage.setItem('gphdm_team_members', JSON.stringify(updated));
            return { members: updated };
        });

        try {
            const { error: deleteError } = await backend.from('team_members').delete().eq('id', id);
            if (deleteError) {
                console.error('Failed to delete team member:', deleteError);
            }
        } catch (e) {
            console.error('Failed to delete team member from backend', e);
        }
    },

    reorderMembers: async (members) => {
        set({ members });
        localStorage.setItem('gphdm_team_members', JSON.stringify(members));

        try {
            // Batch update using loop
            for (const m of members) {
                const { error: reorderError } = await backend.from('team_members').update({ display_order: m.displayOrder }).eq('id', m.id);
                if (reorderError) {
                    console.error('Failed to reorder team member:', reorderError);
                }
            }
        } catch (e) {
            console.error('Failed to reorder team members', e);
        }
    }
}));
