 import { useLightScore } from '@/hooks/useLightScore';
 import { useMintFun } from '@/hooks/useMintFun';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Progress } from '@/components/ui/progress';
 import { Skeleton } from '@/components/ui/skeleton';
 import { Badge } from '@/components/ui/badge';
 import { Sparkles, Coins, TrendingUp, Clock, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
 import { formatDistanceToNow } from 'date-fns';
 import { vi } from 'date-fns/locale';
 
 const PILLAR_ICONS = {
   service: '☀️',
   truth: '🔍',
   healing: '💚',
   value: '🌱',
   unity: '🤝',
 };
 
 const PILLAR_NAMES = {
   service: 'Phụng sự sự sống',
   truth: 'Chân thật minh bạch',
   healing: 'Chữa lành & yêu thương',
   value: 'Đóng góp bền vững',
   unity: 'Hợp Nhất',
 };
 
 const ACTION_LABELS: Record<string, string> = {
   post: 'Tạo bài viết',
   comment: 'Bình luận',
   reaction: 'Cảm xúc',
   share: 'Chia sẻ',
   friend: 'Kết bạn',
   livestream: 'Phát trực tiếp',
   new_user_bonus: 'Thưởng người mới',
 };
 
 export const LightScoreDashboard = () => {
   const { data, isLoading, error, refetch, getTierInfo, getNextTierProgress } = useLightScore();
   const { mintPendingActions, isMinting } = useMintFun();
 
   if (isLoading) {
     return (
       <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
         <CardHeader>
           <Skeleton className="h-8 w-48" />
         </CardHeader>
         <CardContent className="space-y-4">
           <Skeleton className="h-4 w-full" />
           <Skeleton className="h-24 w-full" />
           <Skeleton className="h-32 w-full" />
         </CardContent>
       </Card>
     );
   }
 
   if (error) {
     return (
       <Card className="border-0 shadow-lg">
         <CardContent className="py-8 text-center">
           <p className="text-muted-foreground mb-4">Không thể tải Light Score</p>
           <Button onClick={refetch} variant="outline" size="sm">
             <RefreshCw className="w-4 h-4 mr-2" />
             Thử lại
           </Button>
         </CardContent>
       </Card>
     );
   }
 
   if (!data) return null;
 
   const tierInfo = getTierInfo();
   const { progress, nextTier, remaining } = getNextTierProgress();
   const pendingActions = data.recent_actions?.filter(a => a.mint_status === 'approved') || [];
 
   const handleClaimAll = async () => {
     if (pendingActions.length === 0) return;
     const ids = pendingActions.map(a => a.id);
     const result = await mintPendingActions(ids);
     if (result) {
       refetch();
     }
   };
 
   return (
     <div className="space-y-4">
       {/* Main Light Score Card */}
       <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 overflow-hidden">
         <CardHeader className="pb-2">
           <div className="flex items-center justify-between">
             <CardTitle className="flex items-center gap-2 text-xl">
               <Sparkles className="w-6 h-6 text-amber-500" />
               <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                 LIGHT SCORE
               </span>
             </CardTitle>
             <Badge variant="secondary" className="text-sm">
               {tierInfo.emoji} {tierInfo.name}
             </Badge>
           </div>
         </CardHeader>
         <CardContent className="space-y-6">
           {/* Score Display */}
           <div className="text-center py-4">
             <p className="text-5xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
               {data.total_light_score.toLocaleString()}
             </p>
             {data.tier < 3 && (
               <p className="text-sm text-muted-foreground mt-2">
                 Còn {remaining.toLocaleString()} điểm để đạt {nextTier.emoji} {nextTier.name}
               </p>
             )}
           </div>
 
           {/* Progress to next tier */}
           <div className="space-y-2">
             <div className="flex justify-between text-sm text-muted-foreground">
               <span>{tierInfo.emoji} {tierInfo.name}</span>
               <span>{nextTier.emoji} {nextTier.name}</span>
             </div>
             <Progress value={progress} className="h-2" />
           </div>
 
           {/* 5 Pillars */}
           <div className="space-y-3">
             <h4 className="text-sm font-medium text-muted-foreground">5 Pillars of Light</h4>
             <div className="grid gap-2">
               {Object.entries(data.pillars).map(([key, value]) => (
                 <div key={key} className="flex items-center gap-3">
                   <span className="text-lg">{PILLAR_ICONS[key as keyof typeof PILLAR_ICONS]}</span>
                   <span className="flex-1 text-sm">{PILLAR_NAMES[key as keyof typeof PILLAR_NAMES]}</span>
                   <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                     <div 
                       className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                       style={{ width: `${Math.min(100, (value / 100) * 100)}%` }}
                     />
                   </div>
                   <span className="text-xs text-muted-foreground w-12 text-right">
                     {Math.round(value)}%
                   </span>
                 </div>
               ))}
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* FUN Money Balance Card */}
       <Card className="border-0 shadow-md">
         <CardHeader className="pb-2">
           <CardTitle className="flex items-center gap-2 text-lg">
             <Coins className="w-5 h-5 text-green-500" />
             FUN Money
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
             <div className="text-center p-3 bg-muted/50 rounded-lg">
               <p className="text-2xl font-bold text-green-600">{data.total_minted.toLocaleString()}</p>
               <p className="text-xs text-muted-foreground">Total Minted</p>
             </div>
             <div className="text-center p-3 bg-muted/50 rounded-lg">
               <p className="text-2xl font-bold text-amber-600">{data.pending_amount.toLocaleString()}</p>
               <p className="text-xs text-muted-foreground">Pending</p>
             </div>
           </div>
 
           {/* Daily Progress */}
           <div className="space-y-2">
             <div className="flex justify-between text-sm">
               <span className="text-muted-foreground">Hôm nay</span>
               <span className="font-medium">{data.today_minted}/{data.daily_cap} FUN</span>
             </div>
             <Progress 
               value={(data.today_minted / data.daily_cap) * 100} 
               className="h-2"
             />
           </div>
 
           {/* Claim Button */}
           {data.pending_amount > 0 && (
             <Button 
               onClick={handleClaimAll}
               disabled={isMinting || data.today_minted >= data.daily_cap}
               className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
             >
               {isMinting ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Đang mint...
                 </>
               ) : (
                 <>
                   <Sparkles className="w-4 h-4 mr-2" />
                   Claim {data.pending_amount} FUN Money
                 </>
               )}
             </Button>
           )}
         </CardContent>
       </Card>
 
       {/* Recent Actions Card */}
       <Card className="border-0 shadow-md">
         <CardHeader className="pb-2">
           <div className="flex items-center justify-between">
             <CardTitle className="flex items-center gap-2 text-lg">
               <TrendingUp className="w-5 h-5 text-blue-500" />
               Light Actions Gần Đây
             </CardTitle>
             <Button variant="ghost" size="icon" onClick={refetch}>
               <RefreshCw className="w-4 h-4" />
             </Button>
           </div>
         </CardHeader>
         <CardContent>
           {data.recent_actions.length === 0 ? (
             <p className="text-center text-muted-foreground py-8">
               Chưa có hoạt động nào. Hãy tạo bài viết hoặc tương tác để kiếm Light Score! 🌟
             </p>
           ) : (
             <div className="space-y-3">
               {data.recent_actions.slice(0, 5).map((action) => (
                 <div 
                   key={action.id}
                   className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                 >
                   {action.mint_status === 'minted' ? (
                     <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                   ) : action.mint_status === 'approved' ? (
                     <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                   ) : (
                     <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                   )}
                   
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium truncate">
                       {ACTION_LABELS[action.action_type] || action.action_type}
                     </p>
                     {action.content_preview && (
                       <p className="text-xs text-muted-foreground truncate">
                         {action.content_preview}
                       </p>
                     )}
                   </div>
                   
                   <div className="text-right flex-shrink-0">
                     <p className={`text-sm font-bold ${
                       action.mint_status === 'rejected' ? 'text-red-400' : 'text-green-600'
                     }`}>
                       +{action.mint_amount} FUN
                     </p>
                     <p className="text-xs text-muted-foreground">
                       {formatDistanceToNow(new Date(action.created_at), { 
                         addSuffix: true, 
                         locale: vi 
                       })}
                     </p>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </CardContent>
       </Card>
     </div>
   );
 };