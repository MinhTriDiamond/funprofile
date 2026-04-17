import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, ShieldCheck, ExternalLink, Hash, Calendar, User } from 'lucide-react';

export function SBTEvidenceDialog({ sbt, children }: { sbt: any; children?: React.ReactNode }) {
  const meta = sbt.metadata ?? {};
  const evidence = sbt.evidence_hash;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children ?? <Button size="sm" variant="ghost" className="text-[10px] h-6">Xem evidence</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <span className="capitalize">{sbt.sbt_type.replace(/_/g, ' ')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="capitalize">{sbt.sbt_category}</Badge>
            <Badge variant="outline" className="capitalize">{sbt.privacy_level}</Badge>
            <Badge variant="outline" className="capitalize">{sbt.status}</Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="w-3 h-3" />weight {Number(sbt.trust_weight).toFixed(2)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <Row icon={Calendar} label="Issued at" value={new Date(sbt.issued_at).toLocaleString()} />
            {sbt.expires_at && <Row icon={Calendar} label="Expires at" value={new Date(sbt.expires_at).toLocaleString()} />}
            <Row icon={User} label="Issuer" value={sbt.issuer ?? 'system'} mono />
            <Row icon={Hash} label="Token ID" value={sbt.token_id} mono truncate />
            {evidence && <Row icon={Hash} label="Evidence hash" value={evidence} mono truncate />}
            {sbt.revocation_reason && (
              <Row icon={Hash} label="Lý do thu hồi" value={sbt.revocation_reason} />
            )}
          </div>

          {Object.keys(meta).length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1 text-muted-foreground">Metadata</p>
              <pre className="text-[10px] bg-muted/50 p-2 rounded overflow-x-auto max-h-48">
                {JSON.stringify(meta, null, 2)}
              </pre>
            </div>
          )}

          {meta.evidence_url && (
            <Button asChild variant="outline" size="sm" className="w-full gap-2">
              <a href={meta.evidence_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" />Mở evidence link
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label, value, mono, truncate }: any) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-muted-foreground min-w-[80px]">{label}:</span>
      <span className={`flex-1 ${mono ? 'font-mono' : ''} ${truncate ? 'break-all' : ''}`}>{value}</span>
    </div>
  );
}
