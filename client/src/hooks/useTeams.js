import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

export function useTeams(userId) {
    const [teams, setTeams] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamExpenses, setTeamExpenses] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);

    const fetchTeams = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            // Get projects user is a member of
            const { data: memberships } = await supabase
                .from('project_members')
                .select('project_id')
                .eq('user_id', userId)
                .eq('status', 'accepted');

            if (memberships && memberships.length > 0) {
                const projectIds = memberships.map(m => m.project_id);
                const { data: projectsData } = await supabase
                    .from('projects')
                    .select('*')
                    .in('id', projectIds);

                // Get member counts and expenses for each project
                const projectsWithCounts = await Promise.all((projectsData || []).map(async (project) => {
                    const { count } = await supabase
                        .from('project_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('project_id', project.id)
                        .eq('status', 'accepted');

                    const { data: expData } = await supabase
                        .from('project_expenses')
                        .select('amount')
                        .eq('project_id', project.id);

                    const totalExpenses = (expData || []).reduce((s, e) => s + Number(e.amount), 0);
                    // Check if user created the project
                    const { data: adminCheck } = await supabase
                        .from('project_members')
                        .select('role')
                        .eq('project_id', project.id)
                        .eq('user_id', userId)
                        .maybeSingle();
                    
                    return { 
                        ...project, 
                        memberCount: count || 0, 
                        totalExpenses, 
                        isAdmin: adminCheck?.role === 'admin',
                        // Map project fields to team-like fields for compatibility
                        team_code: project.join_code || project.id.substring(0, 8),
                    };
                }));
                // Sort teams so most recent appear first
                projectsWithCounts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setTeams(projectsWithCounts);
            } else {
                setTeams([]);
            }
        } catch (e) {
            console.error('Fetch teams error:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Removed fetchPendingInvites as requested

    const fetchPendingRequests = useCallback(async () => {
        if (!userId) return;
        try {
            // Get projects where user is admin
            const { data: adminProjects } = await supabase
                .from('project_members')
                .select('project_id')
                .eq('user_id', userId)
                .eq('role', 'admin');

            if (adminProjects && adminProjects.length > 0) {
                const projectIds = adminProjects.map(t => t.project_id);
                const { data } = await supabase
                    .from('project_members')
                    .select('*, projects(name)')
                    .in('project_id', projectIds)
                    .eq('status', 'pending');
                
                // Manually fetch names to bypass foreign key limitations
                if (data && data.length > 0) {
                    const userIds = data.map(r => r.user_id);
                    const { data: profiles } = await supabase.from('user_applications').select('user_id, full_name').in('user_id', userIds);
                    data.forEach(req => {
                        const profile = (profiles || []).find(p => p.user_id === req.user_id);
                        if (profile) req.user_applications = { full_name: profile.full_name };
                    });
                }
                setPendingRequests(data || []);
            }
        } catch (e) {
            console.error('Fetch requests error:', e);
        }
    }, [userId]);

    const createTeam = useCallback(async (name) => {
        if (!userId) throw new Error('Not logged in');
        
        // Generate a 6-character random join code
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Create project
        const { data: project, error } = await supabase
            .from('projects')
            .insert([{ name, created_by: userId, join_code: joinCode, total_budget: 0 }])
            .select()
            .single();
        
        if (error) {
            console.error('Supabase create team error:', error);
            throw new Error(error.message || 'Failed to create team. Check Supabase RLS.');
        }

        // Add creator as admin member
        const { error: memberError } = await supabase.from('project_members').insert([{
            project_id: project.id, user_id: userId, role: 'admin', status: 'accepted'
        }]);
        
        if (memberError) {
            console.error('Add member error:', memberError);
        }

        await fetchTeams();
        return project;
    }, [userId, fetchTeams]);

    // legacy accept/reject invite removed

    const joinByCode = useCallback(async (code) => {
        if (!userId) throw new Error('Not logged in');
        
        // Search for project by exact join code
        const { data: allProjects } = await supabase
            .from('projects')
            .select('*');
        
        const project = (allProjects || []).find(p => 
            p.join_code && p.join_code.toLowerCase() === code.trim().toLowerCase()
        );
        
        if (!project) {
            throw new Error('Team not found. Please check the code.');
        }

        // Check if already a member
        const { data: existing } = await supabase
            .from('project_members')
            .select('id')
            .eq('project_id', project.id)
            .eq('user_id', userId)
            .maybeSingle();
        if (existing) throw new Error('Already a member or pending');

        // Add as pending member
        await supabase.from('project_members').insert([{
            project_id: project.id, user_id: userId, role: 'member', status: 'pending'
        }]);
        return project;
    }, [userId]);

    const approveRequest = useCallback(async (memberId, projectId) => {
        await supabase.from('project_members').update({ status: 'accepted' }).eq('id', memberId);
        await fetchPendingRequests();
        await fetchTeamDetail(projectId);
    }, [fetchPendingRequests]);

    const rejectRequest = useCallback(async (memberId, projectId) => {
        await supabase.from('project_members').delete().eq('id', memberId);
        await fetchPendingRequests();
        await fetchTeamDetail(projectId);
    }, [fetchPendingRequests]);

    const fetchTeamDetail = useCallback(async (projectId) => {
        try {
            // Fetch members
            const { data: members, error: membersError } = await supabase
                .from('project_members')
                .select('*')
                .eq('project_id', projectId)
                .eq('status', 'accepted');
            if (membersError) console.error(membersError);

            // Fetch expenses
            const { data: expenses, error: expError } = await supabase
                .from('project_expenses')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(20);
            if (expError) console.error(expError);

            // Manually fetch and inject full_names across members and expenses
            let allUserIds = new Set();
            (members || []).forEach(m => allUserIds.add(m.user_id));
            (expenses || []).forEach(e => allUserIds.add(e.paid_by));
            
            if (allUserIds.size > 0) {
                const { data: profiles } = await supabase.from('user_applications').select('user_id, full_name').in('user_id', Array.from(allUserIds));
                (members || []).forEach(m => {
                    const match = (profiles || []).find(p => p.user_id === m.user_id);
                    if (match) m.user_applications = { full_name: match.full_name };
                });
                (expenses || []).forEach(e => {
                    const match = (profiles || []).find(p => p.user_id === e.paid_by);
                    if (match) e.user_applications = { full_name: match.full_name };
                });
            }

            setTeamMembers(members || []);
            setTeamExpenses(expenses || []);

            // Get project info
            const { data: project } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();
            
            // Check admin
            const { data: adminCheck } = await supabase
                .from('project_members')
                .select('role')
                .eq('project_id', projectId)
                .eq('user_id', userId)
                .maybeSingle();
            
            setSelectedTeam({ 
                ...project, 
                isAdmin: adminCheck?.role === 'admin',
                team_code: project.join_code || project.id.substring(0, 8),
            });
        } catch (e) {
            console.error('Team detail error:', e);
        }
    }, [userId]);

    const addTeamExpense = useCallback(async (projectId, amount, category, description) => {
        if (!userId) throw new Error('Not logged in');
        const { error } = await supabase.from('project_expenses').insert([{
            project_id: projectId,
            paid_by: userId,
            amount,
            category,
            description,
        }]);
        if (error) throw error;
        await fetchTeamDetail(projectId);
    }, [userId, fetchTeamDetail]);

    const removeMember = useCallback(async (projectId, memberId) => {
        await supabase.from('project_members').delete().eq('id', memberId);
        await fetchTeamDetail(projectId);
    }, [fetchTeamDetail]);

    return {
        teams, loading, pendingRequests,
        selectedTeam, teamExpenses, teamMembers,
        fetchTeams, fetchPendingRequests,
        createTeam,
        joinByCode, approveRequest, rejectRequest,
        fetchTeamDetail, addTeamExpense, removeMember,
        setSelectedTeam,
    };
}
