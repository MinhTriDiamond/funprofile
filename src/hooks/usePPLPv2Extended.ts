import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePPLPv2Events() {
  const [isLoading, setIsLoading] = useState(false);

  const createEvent = useCallback(async (data: {
    title: string;
    event_type?: string;
    platform_links?: Record<string, string>;
    start_at: string;
    end_at?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('pplp-v2-event-manage', {
        body: { action: 'create_event', ...data },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast.success('Sự kiện đã được tạo!');
      return result;
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo sự kiện');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateEvent = useCallback(async (event_id: string, updates: Record<string, unknown>) => {
    const { data: result, error } = await supabase.functions.invoke('pplp-v2-event-manage', {
      body: { action: 'update_event', event_id, ...updates },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result;
  }, []);

  const listEvents = useCallback(async (status?: string) => {
    const { data: result, error } = await supabase.functions.invoke('pplp-v2-event-manage', {
      body: { action: 'list_events', status },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result.events || [];
  }, []);

  const getEvent = useCallback(async (event_id: string) => {
    const { data: result, error } = await supabase.functions.invoke('pplp-v2-event-manage', {
      body: { action: 'get_event', event_id },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result.event;
  }, []);

  const createGroup = useCallback(async (data: {
    event_id: string;
    name: string;
    location?: string;
    love_house_id?: string;
    expected_count?: number;
  }) => {
    const { data: result, error } = await supabase.functions.invoke('pplp-v2-event-manage', {
      body: { action: 'create_group', ...data },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    toast.success('Nhóm đã được tạo!');
    return result;
  }, []);

  const retryMint = useCallback(async (action_id: string) => {
    const { data: result, error } = await supabase.functions.invoke('pplp-v2-mint-worker', {
      body: { action_id },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    toast.success('Mint đã được xử lý!');
    return result;
  }, []);

  return { createEvent, updateEvent, listEvents, getEvent, createGroup, retryMint, isLoading };
}

export function usePPLPv2Attendance() {
  const [isLoading, setIsLoading] = useState(false);

  const checkIn = useCallback(async (group_id: string) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('pplp-v2-attendance', {
        body: { action: 'check_in', group_id },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast.success('Check-in thành công!');
      return result;
    } catch (err: any) {
      toast.error(err.message || 'Không thể check-in');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkOut = useCallback(async (group_id: string, reflection_text?: string) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('pplp-v2-attendance', {
        body: { action: 'check_out', group_id, reflection_text },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast.success('Check-out thành công!');
      return result;
    } catch (err: any) {
      toast.error(err.message || 'Không thể check-out');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const leaderConfirm = useCallback(async (group_id: string, user_ids?: string[]) => {
    const { data: result, error } = await supabase.functions.invoke('pplp-v2-attendance', {
      body: { action: 'leader_confirm', group_id, user_ids },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    toast.success(`Đã xác nhận ${result.confirmed_count} thành viên!`);
    return result;
  }, []);

  const myAttendance = useCallback(async () => {
    const { data: result, error } = await supabase.functions.invoke('pplp-v2-attendance', {
      body: { action: 'my_attendance' },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result.attendance || [];
  }, []);

  return { checkIn, checkOut, leaderConfirm, myAttendance, isLoading };
}

export function usePPLPv2CommunityReview() {
  const [isLoading, setIsLoading] = useState(false);

  const submitReview = useCallback(async (data: {
    action_id: string;
    review_type: string;
    endorse_score?: number;
    flag_score?: number;
    comment?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('pplp-v2-community-review', {
        body: { action: 'submit_review', ...data },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast.success('Review đã được gửi!');
      return result;
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi review');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getReviews = useCallback(async (action_id: string) => {
    const { data: result, error } = await supabase.functions.invoke('pplp-v2-community-review', {
      body: { action: 'get_reviews', action_id },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result.reviews || [];
  }, []);

  return { submitReview, getReviews, isLoading };
}

export function usePPLPv2LightProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('pplp-v2-light-profile', {
        body: {},
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setProfile(result);
      return result;
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải Light Profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchProfile, profile, isLoading };
}
