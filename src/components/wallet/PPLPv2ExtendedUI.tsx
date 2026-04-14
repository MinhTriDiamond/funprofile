import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Calendar, MapPin, Users, CheckCircle2, Clock,
  LogIn, LogOut, MessageSquare, ThumbsUp, Flag, Star,
} from 'lucide-react';
import {
  usePPLPv2Events,
  usePPLPv2Attendance,
  usePPLPv2LightProfile,
} from '@/hooks/usePPLPv2Extended';

const EVENT_TYPE_ICONS: Record<string, string> = {
  zoom: '💻', livestream: '📺', love_house: '🏠', in_person: '🤝',
};

const TRUST_LEVEL_INFO: Record<string, { label: string; color: string }> = {
  newcomer: { label: 'Người mới', color: 'bg-gray-100 text-gray-600' },
  active: { label: 'Hoạt động', color: 'bg-blue-100 text-blue-600' },
  established: { label: 'Ổn định', color: 'bg-green-100 text-green-600' },
  trusted: { label: 'Đáng tin cậy', color: 'bg-amber-100 text-amber-600' },
};

const PILLAR_INFO = [
  { key: 'serving_life', icon: '☀️', name: 'Phụng sự' },
  { key: 'transparent_truth', icon: '🔍', name: 'Chân thật' },
  { key: 'healing_love', icon: '💚', name: 'Chữa lành' },
  { key: 'long_term_value', icon: '🌱', name: 'Bền vững' },
  { key: 'unity_over_separation', icon: '🤝', name: 'Hợp nhất' },
];

export default function PPLPv2ExtendedUI() {
  return (
    <Tabs defaultValue="events" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="events" className="text-xs">
          <Calendar className="w-3.5 h-3.5 mr-1" /> Sự kiện
        </TabsTrigger>
        <TabsTrigger value="attendance" className="text-xs">
          <Users className="w-3.5 h-3.5 mr-1" /> Điểm danh
        </TabsTrigger>
        <TabsTrigger value="profile" className="text-xs">
          <Star className="w-3.5 h-3.5 mr-1" /> Light Profile
        </TabsTrigger>
      </TabsList>

      <TabsContent value="events"><EventsTab /></TabsContent>
      <TabsContent value="attendance"><AttendanceTab /></TabsContent>
      <TabsContent value="profile"><LightProfileTab /></TabsContent>
    </Tabs>
  );
}

function EventsTab() {
  const { listEvents, createEvent, isLoading } = usePPLPv2Events();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('zoom');
  const [startAt, setStartAt] = useState('');

  const { data: events, refetch } = useQuery({
    queryKey: ['pplp-v2-events'],
    queryFn: () => listEvents(),
  });

  const handleCreate = async () => {
    if (!title.trim() || !startAt) return;
    try {
      await createEvent({ title: title.trim(), event_type: eventType, start_at: startAt });
      setShowCreate(false);
      setTitle('');
      setStartAt('');
      refetch();
    } catch { /* handled */ }
  };

  return (
    <div className="space-y-3 mt-3">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold">Sự kiện PPLP</h4>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Đóng' : '+ Tạo sự kiện'}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên sự kiện" />
            <div className="flex gap-2">
              {(['zoom', 'livestream', 'love_house', 'in_person'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setEventType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${eventType === t ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : 'border-border'}`}
                >
                  {EVENT_TYPE_ICONS[t]} {t === 'love_house' ? 'Love House' : t === 'in_person' ? 'Gặp mặt' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <Input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
            <Button onClick={handleCreate} disabled={isLoading || !title.trim() || !startAt} className="w-full bg-amber-500 hover:bg-amber-600" size="sm">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Tạo sự kiện
            </Button>
          </CardContent>
        </Card>
      )}

      {events?.length === 0 && (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Chưa có sự kiện nào</CardContent></Card>
      )}

      {events?.map((event: any) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const { checkIn, isLoading } = usePPLPv2Attendance();
  const groups = event.pplp_v2_groups || [];

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{EVENT_TYPE_ICONS[event.event_type] || '📋'}</span>
              <span className="font-medium text-sm">{event.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{new Date(event.start_at).toLocaleString('vi-VN')}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">{event.status}</Badge>
        </div>

        {groups.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Nhóm:</p>
            {groups.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs">{g.name}</span>
                  {g.leader_confirmed_at && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={isLoading}
                  onClick={() => checkIn(g.id)}
                >
                  <LogIn className="w-3 h-3 mr-1" /> Check-in
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttendanceTab() {
  const { myAttendance } = usePPLPv2Attendance();
  const { checkOut, isLoading: checkingOut } = usePPLPv2Attendance();
  const [reflection, setReflection] = useState('');
  const [checkoutGroupId, setCheckoutGroupId] = useState<string | null>(null);

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['pplp-v2-my-attendance'],
    queryFn: myAttendance,
  });

  const handleCheckOut = async (groupId: string) => {
    try {
      await checkOut(groupId, reflection);
      setCheckoutGroupId(null);
      setReflection('');
    } catch { /* handled */ }
  };

  return (
    <div className="space-y-3 mt-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Users className="w-4 h-4" /> Lịch sử điểm danh
      </h4>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : !attendance?.length ? (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Chưa có lịch sử điểm danh</CardContent></Card>
      ) : (
        attendance.map((att: any) => {
          const group = att.pplp_v2_groups;
          const event = group?.pplp_v2_events;
          const isCheckedIn = att.check_in_at && !att.check_out_at;

          return (
            <Card key={att.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{event?.title || 'Sự kiện'}</p>
                    <p className="text-xs text-muted-foreground">Nhóm: {group?.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {att.check_in_at && <span className="flex items-center gap-1"><LogIn className="w-3 h-3" /> {new Date(att.check_in_at).toLocaleTimeString('vi-VN')}</span>}
                      {att.check_out_at && <span className="flex items-center gap-1"><LogOut className="w-3 h-3" /> {new Date(att.check_out_at).toLocaleTimeString('vi-VN')}</span>}
                      {att.duration_minutes && <span><Clock className="w-3 h-3 inline" /> {att.duration_minutes} phút</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs mb-1">
                      PF: {Number(att.participation_factor).toFixed(2)}
                    </Badge>
                    {att.confirmed_by_leader && <p className="text-[10px] text-green-600">✓ Leader xác nhận</p>}
                  </div>
                </div>

                {isCheckedIn && (
                  <div className="mt-3 space-y-2">
                    {checkoutGroupId === att.group_id ? (
                      <>
                        <Textarea
                          value={reflection}
                          onChange={e => setReflection(e.target.value)}
                          placeholder="Chia sẻ cảm nhận sau buổi tham gia..."
                          rows={2}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setCheckoutGroupId(null)} className="flex-1 h-7 text-xs">Hủy</Button>
                          <Button size="sm" onClick={() => handleCheckOut(att.group_id)} disabled={checkingOut} className="flex-1 h-7 text-xs bg-amber-500 hover:bg-amber-600">
                            {checkingOut ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3 mr-1" />} Check-out
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setCheckoutGroupId(att.group_id)} className="w-full h-7 text-xs">
                        <LogOut className="w-3 h-3 mr-1" /> Check-out
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function LightProfileTab() {
  const { fetchProfile, profile, isLoading } = usePPLPv2LightProfile();

  const { isLoading: fetching } = useQuery({
    queryKey: ['pplp-v2-light-profile'],
    queryFn: fetchProfile,
  });

  if (isLoading || fetching) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!profile) {
    return <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu</CardContent></Card>;
  }

  const trustInfo = TRUST_LEVEL_INFO[profile.trust_level] || TRUST_LEVEL_INFO.newcomer;

  return (
    <div className="space-y-3 mt-3">
      {/* Overview */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="py-4">
          <div className="text-center mb-3">
            <p className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              {profile.total_light_score.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Light Score</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-amber-600">{profile.total_fun_minted.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">FUN Minted</p>
            </div>
            <div>
              <p className="text-lg font-bold">{profile.validated_actions}</p>
              <p className="text-[10px] text-muted-foreground">Validated</p>
            </div>
            <div>
              <p className="text-lg font-bold">{profile.attendance_count}</p>
              <p className="text-[10px] text-muted-foreground">Events</p>
            </div>
          </div>
          <div className="flex justify-center mt-3">
            <Badge className={`${trustInfo.color} text-xs`}>{trustInfo.label}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pillar Radar (simplified as bars) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">5 Trụ cột trung bình</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {PILLAR_INFO.map(p => {
            const score = Number(profile.pillar_summary?.[p.key]) || 0;
            return (
              <div key={p.key} className="flex items-center gap-2">
                <span className="text-sm w-5">{p.icon}</span>
                <span className="text-xs flex-1">{p.name}</span>
                <Progress value={score * 10} className="w-20 h-2" />
                <span className="text-xs font-mono w-8 text-right">{score.toFixed(1)}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Tuổi tài khoản: {profile.account_age_days} ngày</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Streak: {profile.streak_days} ngày</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Tổng actions: {profile.total_actions}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Events tham gia: {profile.attendance_count}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Actions */}
      {profile.recent_actions?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {profile.recent_actions.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-xs py-1">
                <span className="truncate flex-1">{a.title}</span>
                <Badge variant="outline" className="text-[10px] ml-2">{a.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
