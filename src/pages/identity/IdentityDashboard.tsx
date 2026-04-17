import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Fingerprint, ShieldCheck, Award } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDID } from '@/hooks/useDID';
import { useTrustProfile } from '@/hooks/useTrustProfile';
import { useUserSBTs } from '@/hooks/useUserSBTs';
import { useDIBProfile } from '@/hooks/useDIBProfile';
import { DIDBadge } from '@/components/identity/DIDBadge';
import { TrustTierBadge } from '@/components/identity/TrustTierBadge';
import { TrustEngineBreakdown } from '@/components/identity/TrustEngineBreakdown';
import { SBTGallery } from '@/components/identity/SBTGallery';
import { DIBVaultPanel } from '@/components/identity/DIBVaultPanel';
import { SybilRiskIndicator } from '@/components/identity/SybilRiskIndicator';
import { GuardianManager } from '@/components/identity/GuardianManager';
import { RecoveryWizard } from '@/components/identity/RecoveryWizard';
import { PendingRecoveryRequests } from '@/components/identity/PendingRecoveryRequests';
import { DisputeList } from '@/components/identity/DisputeList';

export default function IdentityDashboard() {
  const { userId } = useCurrentUser();
  const { data: did, isLoading: l1, refetch: r1 } = useDID();
  const { data: trust, isLoading: l2, refetch: r2 } = useTrustProfile();
  const { data: sbts = [], refetch: r3 } = useUserSBTs();
  const { data: dib, refetch: r4 } = useDIBProfile();
  const [recalc, setRecalc] = useState(false);

  const handleRecalc = async () => {
    if (!did?.did_id) return;
    setRecalc(true);
    try {
      const { error } = await supabase.functions.invoke('identity-trust-engine', { body: { did_id: did.did_id } });
      if (error) throw error;
      toast.success('Đã tính lại Trust Score');
      await Promise.all([r1(), r2(), r3(), r4()]);
    } catch (e: any) {
      toast.error('Lỗi recalc', { description: e.message });
    } finally {
      setRecalc(false);
    }
  };

  if (!userId) {
    return <div className="container py-12 text-center text-muted-foreground">Cần đăng nhập để xem Identity</div>;
  }
  if (l1 || l2) {
    return <div className="container py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">Identity & Trust</h1>
              </div>
              <p className="text-xs font-mono text-muted-foreground break-all">{did?.did_id}</p>
              <div className="flex flex-wrap gap-2">
                <DIDBadge level={did?.did_level} status={did?.status} />
                <TrustTierBadge tier={trust?.trust_tier} tc={Number(trust?.tc ?? 0)} />
                <SybilRiskIndicator risk={trust?.sybil_risk} did_id={did?.did_id} showDispute />
                <Badge variant="outline" className="gap-1"><Award className="w-3 h-3" />{sbts.length} SBT</Badge>
              </div>
            </div>
            <Button onClick={handleRecalc} disabled={recalc} variant="outline" className="gap-2">
              {recalc ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Tính lại Trust
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trust" className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto">
          <TabsTrigger value="trust" className="text-xs">Trust</TabsTrigger>
          <TabsTrigger value="sbt" className="text-xs">SBTs</TabsTrigger>
          <TabsTrigger value="dib" className="text-xs">DIB</TabsTrigger>
          <TabsTrigger value="recovery" className="text-xs">Recovery</TabsTrigger>
          <TabsTrigger value="disputes" className="text-xs">Khiếu nại</TabsTrigger>
          <TabsTrigger value="links" className="text-xs">Linked</TabsTrigger>
        </TabsList>
        <TabsContent value="trust" className="mt-4">
          <TrustEngineBreakdown
            vs={Number(trust?.verification_strength ?? 0.2)}
            bs={Number(trust?.behavior_stability ?? 0.3)}
            ss={Number(trust?.social_trust ?? 0.2)}
            os={Number(trust?.onchain_credibility ?? 0.2)}
            hs={Number(trust?.historical_cleanliness ?? 0.5)}
            rf={Number(trust?.risk_factor ?? 1)}
            tc={Number(trust?.tc ?? 0.5)}
          />
        </TabsContent>
        <TabsContent value="sbt" className="mt-4">
          <SBTGallery sbts={sbts} />
        </TabsContent>
        <TabsContent value="dib" className="mt-4">
          <DIBVaultPanel dib={dib} />
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            DIB hash được snapshot daily lúc 03:30 UTC
          </p>
        </TabsContent>
        <TabsContent value="recovery" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <GuardianManager />
            <RecoveryWizard />
          </div>
          <PendingRecoveryRequests />
        </TabsContent>
        <TabsContent value="disputes" className="mt-4">
          <DisputeList />
        </TabsContent>
        <TabsContent value="links" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Linked Identities</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Wallet/social/device linkage management — coming soon
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
