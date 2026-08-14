import { useState } from 'react';
import { supabase } from '../config/supabase';

export function useOnboarding() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Google Sign-In
    const signInWithGoogle = async () => {
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/onboarding`
            }
        });
        setLoading(false);
        if (error) setError(error.message);
        return !error;
    };

    // Check if Username is Unique
    const checkUsernameUnique = async (username) => {
        if (!username) return false;
        const { data } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('username', username)
            .single();
        return !data; // True if no data found (unique)
    };

    // Fetch Colleges
    const fetchColleges = async () => {
        const { data } = await supabase.from('new_colleges').select('*').order('name');
        return data || [];
    };

    // Fetch Halls for a College
    const fetchHalls = async (collegeId) => {
        if (!collegeId) return [];
        const { data } = await supabase.from('new_halls').select('*').eq('college_id', collegeId).order('name');
        return data || [];
    };

    // Look up College (no creation), returns ID
    const ensureCollege = async (collegeName) => {
        let { data } = await supabase.from('new_colleges').select('id').ilike('name', collegeName).single();
        if (data) return data.id;
        return null;
    };

    // Look up Hall for College (no creation), returns ID
    const ensureHall = async (collegeId, hallName) => {
        let { data } = await supabase.from('new_halls').select('id').eq('college_id', collegeId).ilike('name', hallName).single();
        if (data) return data.id;
        // Try matching by short name prefix
        const shortName = hallName.split(' ')[0];
        const { data: fuzzy } = await supabase.from('new_halls').select('id').eq('college_id', collegeId).ilike('name', `${shortName}%`).single();
        if (fuzzy) return fuzzy.id;
        return null;
    };

    // Complete Profile Creation
    const completeProfile = async (userId, profileData) => {
        setLoading(true);
        setError(null);

        try {
            // Get user's email directly from Supabase session
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Authentication required");
            const email = user.email;

            // 1. Resolve College ID
            let collegeId = profileData.collegeId;
            if (!collegeId && profileData.customCollege) {
                collegeId = await ensureCollege(profileData.customCollege);
            }

            // 2. Resolve Hall ID
            let hallId = profileData.hallId;
            if (!hallId && profileData.customHall && collegeId) {
                hallId = await ensureHall(collegeId, profileData.customHall);
            }

            // 3. Create User Profile
            const { error: profileError } = await supabase.from('user_profiles').upsert({
                id: userId,
                full_name: profileData.fullName,
                mobile_number: profileData.mobile,
                email: email, // Pulled from Google Auth automatically
                username: profileData.username,
                college_id: collegeId,
                hall_id: hallId
            });

            if (profileError) throw profileError;

            // 4. Create User Application Data
            const { error: appError } = await supabase.from('user_applications').upsert({
                user_id: userId,
                full_name: profileData.fullName,
                college: collegeId,
                hall: hallId,
                native_place: profileData.nativePlace || '',
                weekly_spending: parseFloat(profileData.weeklySpending || 0),
                current_weekly_spent: 0,
                current_score: 1000,
                budget_reset_done: true
            }, { onConflict: 'user_id' });

            if (appError) throw appError;

            setLoading(false);
            return true;
        } catch (err) {
            console.error("Profile creation error:", err);
            setError(err.message || 'Failed to complete profile setup');
            setLoading(false);
            return false;
        }
    };

    return {
        loading,
        error,
        signInWithGoogle,
        checkUsernameUnique,
        fetchColleges,
        fetchHalls,
        completeProfile
    };
}
